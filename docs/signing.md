# 코드 서명 준비

서명하지 않은 앱은 처음 실행할 때 Windows SmartScreen / macOS Gatekeeper 경고가 나온다. 사내·소수 배포는 경고를 넘기고 써도 되지만, 고객이나 외부에 배포하려면 서명이 필요하다.
**코드와 CI는 준비돼 있다. 인증서(돈과 신원 확인이 필요한 부분)만 직접 구해서 넣으면 된다.** 인증서가 없으면 지금처럼 서명 없이 빌드된다(macOS는 ad-hoc 서명).

빌드 로그의 `[서명] Windows: … · macOS: …` 줄에서 서명 상태를 확인한다.

## macOS (Apple Developer ID + 공증)

1. [Apple Developer Program](https://developer.apple.com/programs/) 가입(유료, 연 단위). 개인 또는 조직.
2. Xcode 또는 developer.apple.com에서 **Developer ID Application** 인증서를 만들어 Mac 키체인에 설치한다.
3. 키체인 접근에서 그 인증서를 **.p12**로 내보낸다(비밀번호 지정).
4. [appleid.apple.com](https://appleid.apple.com) → 로그인 및 보안 → **앱 암호**를 만든다.
5. GitHub 저장소 → Settings → Secrets and variables → Actions → **Secrets**에 등록:

| 이름 | 값 |
|---|---|
| `MAC_CSC_LINK` | .p12 파일을 base64로 바꾼 문자열 (`base64 -i cert.p12 \| pbcopy`) |
| `MAC_CSC_KEY_PASSWORD` | .p12 비밀번호 |
| `APPLE_ID` | Apple ID 이메일 |
| `APPLE_APP_SPECIFIC_PASSWORD` | 위 4번의 앱 암호 |
| `APPLE_TEAM_ID` | 팀 ID(10자리, developer.apple.com → Membership) |

앞의 두 개만 있으면 서명만 하고, 다섯 개가 모두 있으면 **공증(notarization)**까지 한다. 공증은 Apple 서버에 올려 검사받는 단계라 수 분이 더 걸린다.
앱 안의 실행 파일(영상 엔진 ffmpeg 등)도 함께 서명되며, 필요한 권한은 `build/entitlements.mac.plist`에 있다.

## Windows

2023년 6월부터 새로 발급되는 OV/EV 코드 서명 인증서는 개인키를 **USB 토큰이나 클라우드 보관소**에 둬야 해서 `.pfx`로 내보낼 수 없다. 그래서 방법이 갈린다. 어느 쪽이든 `electron-builder.config.mjs`가 환경 변수로 받는다.

**A. 내 Windows PC에서 직접 빌드 + USB 토큰 인증서** (가장 단순)
토큰을 꽂고 인증서 지문(SHA1) 또는 주체 이름을 환경 변수로 준다.
```powershell
$env:WIN_CERT_SHA1 = "<인증서 지문>"      # 또는 $env:WIN_CERT_SUBJECT = "<회사 이름>"
npm install
npm run desktop:dist
```
서명할 때 토큰 PIN 입력창이 뜬다. GitHub Actions에서는 토큰을 쓸 수 없다.

**B. CI에서 서명 — 클라우드 서명 서비스**
- **Azure Artifact Signing**(구 Trusted Signing): 클라우드 서명 + 월 구독. 지원 국가가 제한적이다(조직 기준 미국·캐나다·EU·영국으로 확인된다. 한국 조직은 [공식 사전 요건](https://learn.microsoft.com/azure/artifact-signing/quickstart)을 확인해야 하며 **불확실**). 가능하면 Secrets에 `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, Variables에 `AZ_SIGN_ENDPOINT`, `AZ_SIGN_ACCOUNT`, `AZ_SIGN_PROFILE`, `AZ_SIGN_PUBLISHER`를 넣으면 자동으로 쓴다.
- **DigiCert KeyLocker, SSL.com eSigner 등 인증기관의 클라우드 서명**: 각 서비스의 서명 도구를 쓰는 사용자 정의 서명 스크립트가 필요하다. **아직 구현하지 않았다** — 서비스를 정하면 연결한다.

**C. 내보낼 수 있는 `.pfx`가 이미 있는 경우**(예전 발급 인증서): Secrets에 `WIN_CERT_BASE64`(pfx를 base64로), `WIN_CSC_KEY_PASSWORD`.

> 서명해도 SmartScreen 경고는 처음에 남을 수 있다. 일반(OV) 인증서는 다운로드가 쌓여 평판이 생겨야 사라지고, EV나 Artifact Signing은 비교적 빨리 사라진다고 알려져 있다(확인된 보장은 아님).

## 서명 확인

- macOS: `codesign -dv --verbose=2 "Photo Reel Studio.app"`, `spctl -a -vv "Photo Reel Studio.app"`(승인됨이면 공증 통과), 공증은 `xcrun stapler validate`
- Windows: 설치 파일 우클릭 → 속성 → **디지털 서명** 탭, 또는 `signtool verify /pa /v "Photo Reel Studio Setup 0.1.0.exe"`

## 지금 상태

- 아이콘은 `build/icon.svg`(원본)와 `build/icon.png`로 적용돼 있다. 다른 디자인으로 바꾸려면 두 파일을 교체한다(PNG는 1024×1024).
- **서명 경로는 인증서가 없어 실제로 서명해 보지 못했다.** 설정이 환경 변수를 제대로 읽는지는 확인했지만, 인증서를 넣은 첫 빌드에서 서명·공증이 통과하는지 확인해야 한다.
- macOS ad-hoc 서명(인증서 없는 빌드)이 Apple Silicon에서 실제로 실행되는지는 Mac에서 확인하지 못했다. 실행이 안 되면 `xattr -cr "/Applications/Photo Reel Studio.app"` 후 다시 열어 본다.
