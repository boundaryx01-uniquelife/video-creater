# Photo Reel Studio

사진과 메타데이터로 영상을 자동 제작하는 도구. Remotion(React) 기반이며 모든 장면은 프레임의 순수 함수라 같은 입력이면 같은 영상이 나온다.

## 구성

| 영역 | 위치 | 설명 |
|---|---|---|
| 사진 읽기 도구 | `src/ingest/`, `dist-tools/photo-ingest.html` | 브라우저에서 폴더/zip을 읽어 EXIF·색·선명도와 미리보기만 추출. 네트워크 요청 없음 |
| 분석 엔진 | `src/analysis/` | 품질 점수, 연사 묶기, 장소 묶기, 챕터 분할, 팔레트 |
| 결산(Recap) | `src/intros/DataIntro.tsx` 외 | 날짜×시각 점 그래프 인트로, 챕터 카드, 사진 플로우, 아웃트로 |
| 업무 모드 | `src/modes/` | 행사·현장·매장·상품·여행·교육 템플릿. `ModeVideo`가 현장·매장·상품 공통 영상 엔진 |
| 행사 | `src/events/` | 일정표, 하이라이트 세션, 인용문, 숫자 요약 |
| 여행 | `src/travel/`, `scripts/travel/` | 지구본/3D 지도, 이동수단 6종, 실제 도로·철도 경로, 지형 음영 |

## 스튜디오(웹 앱)

```bash
npm install
CHROME_BIN=<chrome 경로> npm run dev     # http://localhost:5173
```

1. 위쪽에서 모드를 고른다(행사, 여행, 현장, 매장, 상품, 학교 홍보, 동아리 홍보, 졸업).
2. 왼쪽 폼에서 문구·숫자·일정·색을 바꾸면 오른쪽 미리보기에 바로 반영된다. 입력 내용은 브라우저에 자동 저장된다.
3. 사진은 챕터의 사진 줄에서 추가하거나 "사진 일괄 넣기"로 한 번에 넣는다. 촬영 시각(EXIF)을 읽어 행사 모드는 세션 시간에 맞춰, 그 외 모드는 시각순으로 챕터에 나눈다.
4. "MP4 만들기"로 영상을 만든다. "처음 8초"는 빠른 확인용이다.
5. "설정 내보내기"로 받은 JSON은 `PROPS_FILE`로 명령줄 렌더에도 쓸 수 있다.

- 업로드한 사진은 긴 변 2560px로 줄여 `.studio/uploads/`에 저장된다(EXIF 제거). 렌더 결과는 `.studio/renders/`.
- `CHROME_BIN`을 지정하지 않으면 Remotion이 전용 Chrome을 내려받는다.
- 서버 API(`studio/plugin.mjs`)는 인증이 없는 로컬 전용이다. 외부에 공개된 서버로 띄우지 말 것.
- 여행 모드는 문구와 사진만 바꿀 수 있다. 정차지·경로는 아래 `build:travel`로 만든다.

## 실행

```bash
npm install
npm run dev            # 스튜디오(위 참고)
npm run build:ingest   # 사진 읽기 도구 빌드
```

영상 렌더(Chrome 경로와 사진 폴더를 환경 변수로 지정):

```bash
CHROME_BIN=<chrome> MEDIA_DIR=<media가 든 폴더> node scripts/render.mjs video <컴포지션 id> out.mp4
```

컴포지션 id: `event-video-sample`, `travel-video-sample`, `site-video-sample`, `store-video-sample`, `product-video-sample`, `full-video-sample`(결산). 입력 데이터는 `PROPS_FILE=<json>`으로 바꾼다.

## 여행 영상 만들기

```bash
# 사진 메타데이터(photo-ingest 결과)에서 자동 생성
npm run build:travel -- --photos photo-bundle.zip --out <작업 폴더> [--overrides overrides.json]
# 또는 정차지 JSON에서
npm run build:travel -- --trip trip.json --out <작업 폴더>

CHROME_BIN=<chrome> MEDIA_DIR=<작업 폴더> PROPS_FILE=<작업 폴더>/travel-props.json \
  node scripts/render.mjs video travel-video-sample travel.mp4
```

빌드 단계가 하는 일:

1. 사진 GPS·촬영 시각 → 정차지(머문 곳) 추출, 이동 중 사진 제외, 가까운 도시 이름 추정(오프라인)
2. 이동수단 추정: 거리·평균 속도·바다 비율 + 이동 중 사진에서 얻은 순항 속도
3. 경로: 자동차는 도로, 기차는 철도 데이터에서 최단 경로. 도보·자전거는 OpenStreetMap 거리(받을 수 있을 때)
4. 지도 레이어(강·호수·도시권·도시명)와 지형 음영 텍스처 생성

자동 추정은 틀릴 수 있으므로 `--overrides`로 고친다:

```json
{ "stops": { "2": { "name": "하코네", "sub": "온천 마을" } }, "modes": { "2": "train" }, "info": { "title": "일본\n2박 3일" } }
```

## 지도 데이터 출처와 라이선스

| 데이터 | 출처 | 라이선스 | 비고 |
|---|---|---|---|
| 해안선(지구본) | world-atlas (Natural Earth) | 공공 도메인 | npm 패키지로 내장 |
| 도로·철도·강·호수·도시 | Natural Earth 10m | 공공 도메인 | `data/ne/`에 내려받아 사용(저장소 제외) |
| 지형 고도 | Terrain Tiles (Mapzen, AWS Open Data) | 공개. 출처 표기 필요 | `data/tiles/`에 캐시 |
| 거리(도보) | OpenStreetMap (Overpass API) | ODbL. "© OpenStreetMap contributors" 표기 필요 | 공개 서버는 가벼운 사용만 허용 |

영상 아웃트로에 출처가 자동으로 표기된다. Remotion은 4인 이상 영리 조직에서 유료 라이선스가 필요하다.

## 한계

- Natural Earth 도로·철도는 주요 간선 수준이라 세부 도로는 따라가지 못한다.
- 도시 이름은 약 7천 개 도시 기준의 추정이다. 작은 지역은 "○○ 근교"로 나오므로 수정이 필요하다.
- 이동수단은 추정이다. 구간별로 지정할 수 있다.
- 지형은 음영 처리한 평면 지도이며 실제 3D 지형 메시는 아니다.
