# 세로(9:16) 영상

모든 모드를 1080×1920 세로로도 만들 수 있다. 가로(1920×1080)는 기존과 같은 결과를 낸다.

## 만드는 방법

- 스튜디오: 오른쪽 아래 렌더 패널의 "화면 비율"에서 `9:16 세로`를 고르면 미리보기와 MP4가 세로로 바뀐다. 선택은 브라우저에 기억된다.
- 명령줄: 기존 컴포지션 id 뒤에 `-vertical`을 붙인다.

```bash
CHROME_BIN=<chrome> MEDIA_DIR=public node scripts/render.mjs video event-video-sample-vertical out.mp4
```

세로 id: `event-video-sample-vertical`, `travel-video-sample-vertical`, `site-`·`store-`·`product-`·`school-`·`club-`·`grad-video-sample-vertical`, `full-video-sample-vertical`(결산). 낱장 확인용으로 `mode-intro|card|beat|outro-vertical`, `recap-intro|card|beat|outro-vertical`, `data-intro-chrono-vertical`도 있다.

## 구조

- `src/lib/layout.ts`
  - `useLayout()`은 `{ W, H, portrait, PAD }`를 돌려준다. `portrait`는 높이가 너비보다 클 때 true이다. `PAD`는 가로 `W×0.0625`, 세로 `W×0.07`이다.
  - `wrapTitle(lines, maxChars)`는 세로에서 긴 제목을 공백 기준으로 균형 있게 나눈다.
  - `SIZES`는 컴포지션 크기 정의이다. `Root.tsx`, 스튜디오, 렌더 서버가 함께 쓴다.
- 장면 컴포넌트는 `portrait`일 때만 별도 배치를 쓴다. 가로 코드 경로는 손대지 않았다. 가로 정지 프레임을 변경 전후로 비교해 픽셀이 같음을 확인했다.
- `Root.tsx`의 `Both` 헬퍼가 같은 컴포넌트를 두 크기로 등록한다. 새 컴포지션을 추가할 때는 `Both`를 쓰면 세로 id가 같이 생긴다.
- `studio/plugin.mjs`의 `COMPS`는 기본 id와 `-vertical` id를 모두 허용한다.

## 세로 배치 원칙

| 장면 | 세로 배치 |
|---|---|
| 사진 플로우 풀블리드 | 가로 사진은 중앙 크롭, 캡션은 아래쪽 안전 영역 |
| 사진 2장(pair) | 위·아래 분할 |
| 에디토리얼 | 사진 위, 시각·캡션 아래 |
| 2×2 그리드 | 2×2 세로로 긴 칸 |
| 챕터·모드 카드 | 위쪽에 글자·통계·레일, 아래쪽 밴드에 사진(매치컷은 전체 화면으로 확장) |
| 인트로 3종 | photo: 풀블리드 + 칩 세로 목록, split: 사진 위·패널 아래, type: 제목 위·사진 아래 |
| 데이터 장면 11종 | 사진 위·내용 아래 구조로 재배치(표·목록·그래프는 전체 너비) |
| 여행 지도 | 원근 거리를 높이에 비례시켜 같은 기울기 유지, 보이는 레이어 영역을 다시 계산 |

긴 제목은 `wrapTitle`로 줄을 나누고, 글자 크기는 줄 너비에 맞춰 줄인다. 가로 사진의 `fx`는 세로 풀블리드에서 반영된다(기본 0.5 = 가운데).

## 알려진 제약

- 세로 크롭은 가로 사진의 가운데 약 1/3만 보인다. 피사체가 한쪽에 치우친 사진은 사진의 `fx`(0~1)를 조정한다.
- 제품 `callout` 장면의 핀 좌표는 가로 사진 기준 비율이다. 세로에서는 핀들의 평균 위치가 가운데 오도록 사진을 옮기고 좌표를 다시 계산한다.
