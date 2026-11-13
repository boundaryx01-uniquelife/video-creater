# 데스크톱 앱

웹 스튜디오와 같은 화면·기능을 설치형 앱으로 쓴다(Electron). 사진과 렌더 결과는 모두 내 PC에만 저장된다.

## 설치 파일 받기

GitHub → **Actions → Desktop build → Run workflow** 를 실행하면 Windows(`.exe`), macOS(`.dmg`), Linux(`.AppImage`, `.deb`)가 만들어진다. 실행 화면 아래 **Artifacts** 에서 내려받는다.

서명하지 않은 빌드라 처음 실행할 때 경고가 나온다.
- Windows: "Windows의 PC 보호" → *추가 정보 → 실행*
- macOS: 앱을 우클릭 → *열기* (또는 시스템 설정 → 개인정보 보호 및 보안 → *그래도 열기*)
- 회사에 배포하려면 코드 서명 인증서(Windows EV/OV, Apple Developer ID)를 구해 [docs/signing.md](signing.md)의 절차대로 설정한다(코드는 준비돼 있고 인증서만 넣으면 된다).

## 내 PC에서 직접 빌드

```bash
npm install
npm run desktop        # 화면·엔진을 빌드하고 앱을 바로 실행(개발용)
npm run desktop:dist   # 설치 파일 만들기 → release/  (현재 OS용만 만들어진다)
```

## 동작 방식

- 앱이 켜지면 내부 서버가 `127.0.0.1`의 임의 포트에 뜨고 창이 그 주소를 연다. 외부에서는 접속할 수 없다. 이 서버는 다른 주소(Host)나 다른 사이트(Origin)에서 온 요청을 거절한다.
- 데이터 위치(앱 데이터 폴더): Windows `%APPDATA%\Photo Reel Studio`, macOS `~/Library/Application Support/Photo Reel Studio`, Linux `~/.config/Photo Reel Studio`. 메뉴 *파일 → 앱 데이터 폴더 열기*로 연다.
  - `studio/uploads`(업로드 사진), `studio/renders`(완성 MP4), `data/`(여행 지도 데이터 캐시)
- 렌더용 Chrome(Headless Shell, 약 100MB)을 **처음 실행할 때 한 번 내려받는다**(인터넷 필요). 받지 못하면 PC에 설치된 Chrome 또는 Edge를 대신 쓴다. 화면의 렌더 패널에 진행 상태가 나온다.
- 여행 모드의 지도 데이터(Natural Earth, 약 150MB)는 첫 사용 때 앱 안의 "지도 데이터 받기"로 내려받는다.
- MP4 내려받기는 저장 위치를 묻는다.

## 확인된 것 / 확인 안 된 것

- 확인(Linux, 가상 화면): 앱 실행, 화면·API, 사진→여행 영상 빌드 작업자, MP4 렌더, 외부 Host/Origin 차단, Chrome을 내려받지 못할 때 설치된 브라우저로 대체. 설치 폴더만 복사해 다른 위치에서 실행해도 동작.
- **미확인: Windows·macOS 실행**(이 개발 환경에서는 만들 수 없어 CI로만 빌드). 첫 빌드 후 실제 PC에서 설치·실행·MP4 렌더를 확인해야 한다.
- 앱 아이콘은 적용됐다(`build/icon.svg`). 코드 서명은 **준비만** 됐다 — 인증서를 넣으면 서명·공증하는 설정과 CI 연결이 있고([signing.md](signing.md)), 인증서 없이는 서명 없이 빌드된다(macOS는 ad-hoc 서명, 로컬·CI 빌드 성공까지 확인). 자동 업데이트는 아직 없다.
- CI 빌드는 Windows·macOS(arm64)·Linux 모두 성공했다(2026-11-13). 설치 파일 크기: Windows 약 186MB(exe 1개), macOS 약 186MB×2(dmg·zip), Linux 약 165MB×2(AppImage·deb). 줄이기 전에는 Windows 722MB, macOS 504MB(dmg+zip), Linux 460MB(AppImage+deb)였다. 줄인 방법: 쓰지 않는 woff 글꼴 중복 삭제, 소스맵 제거, 샘플 사진 재압축, Chromium 언어 파일 축소, 최대 압축, Windows 빌드에 불필요한 패키지가 딸려 들어가던 설치 방식 수정. 남은 용량 대부분은 Electron 본체(약 100MB 압축)와 영상 엔진 번들·글꼴이다.
- macOS는 Apple Silicon(arm64)용만 만든다. Intel Mac용은 워크플로 matrix에 추가해야 한다.

## 라이선스 주의

- Electron(MIT), Chromium 구성요소(BSD 등 — 앱 폴더의 `LICENSES.chromium.html`), libheif-js(LGPL-3.0)가 함께 배포된다. 배포할 때 이 고지 파일들을 지우지 말 것.
- Remotion은 4인 이상 영리 조직에서 유료 라이선스가 필요하다(`docs/art-direction.md` 참고).
