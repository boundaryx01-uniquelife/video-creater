# Art Direction v0.1 — Photo Reel Studio (업무·상업용)

## 1. 레퍼런스 (선정 기준: 업계 평가가 확인되는 것 + 사진/데이터 기반 영상에 직접 적용 가능한 것)

> 한계: 저는 영상을 직접 재생해서 볼 수 없습니다. 아래 "근거"는 수상 기록·제작 후기·매체 글이고, 실제 화면 확인은 사용자 몫입니다. 확인 못 한 것은 "미검증"으로 표시했습니다.

| # | 레퍼런스 | 가져올 것 | 근거 |
|---|---|---|---|
| R1 | **Spotify Wrapped** (2018~2025) | 사용자 데이터가 곧 모션이 되는 "시스템". 색+타이포 중심, 영화 타이틀 같은 호흡 | Cannes Lions 수상, [It's Nice That](https://www.itsnicethat.com/features/spotify-wrapped-campaign-identity-2022-graphic-design-301122), [Design Compass](https://designcompass.org/en/2023/02/23/2022-wrapped-behind-story/). 2025는 Rive로 더미 데이터 모션 → 실데이터 구동 ([Rive](https://rive.app/blog/spotify-used-rive-for-spotify-wrapped-2025)) |
| R2 | **Art of the Title** 큐레이션 (예: Bonjour Tristesse 타일 시퀀스, Babystar) | 절제된 타이틀 디자인, 타입과 이미지의 관계 | [artofthetitle.com](https://artofthetitle.com) — 직접 열어서 시안 톤 확인 필요 |
| R3 | **Wes Anderson 챕터 타이틀 카드** | 챕터 타이틀 페이지 = 책 페이지처럼. 대칭, 평평한 컬러 | [Print](https://www.printmag.com/typography/typography-from-wes-anderson-cinematic-universe), [Pixart](https://www.pixartprinting.com/blog/wes-andersons-films-typography) (블로그 수준 근거, 폰트 귀속은 미검증) |
| R4 | **Polarsteps Trip Reel / 경로 지도** | GPS 경로를 영상의 뼈대로 | [App Store](https://apps.apple.com/app/id947925763) (영상 품질 평가는 미검증) |
| R5 | **Awwwards 수상 WebGL 스크롤 작업** (Hanwha Ocean, Cartier 365 등) | 깊이감 있는 전환, 텍스처 있는 이동 카메라 | [Awwwards](https://www.awwwards.com/inspiration/scroll-animation-submarine-hanwha-ocean) |
| R6 | Apple Photos Memories, Google Photos Recap | 메타데이터 기반 자동 편집의 대중적 기준(비교 대상) | **미검증(제 지식 기준)** |

**R1이 핵심 모델입니다.** "템플릿에 사진을 끼우는" 것이 아니라 "데이터가 모양을 결정하는 시스템"입니다.

## 2. 상업 이용 체크 (확인된 사실)

- **Remotion**: 개인·비영리·**3인 이하 영리조직은 상업 이용 포함 무료**, 4인 이상 회사는 유료 라이선스. 금액은 공식 페이지 간에도 불일치([pricing](https://www.remotion.dev/docs/pricing), [license](https://remotion.dev/license)) → 회사 규모 확인 필요.
- **깊이 추정 모델**: Depth Anything V2는 **Small만 Apache-2.0(상업 가능)**, Base/Large/Giant는 CC-BY-NC(상업 불가). V3는 혼재 → 사용 전 원본 저장소 라이선스 재확인.
- **폰트**: OFL 폰트만 사용(Futura 같은 상용 폰트 금지, 대체: Jost / 한글 Pretendard 등). 현재 번들 폰트는 모두 OFL.
- **지도**: OpenStreetMap 공개 타일 서버 대량 사용 금지 → 자체 렌더(GeoJSON 벡터) 또는 상용 타일 약관 확인. 출처 표기 필요.
- **음악·사진 소유권**: 음악은 상업 라이선스 트랙만. 인물 사진은 초상권 동의.

## 3. "AI 티" 제거 원칙 (v0 시안에서 걷어낼 것)

금지: 어두운 남색+금색 / 가운데 정렬 제목+가는 선+자간 넓은 부제 3단 / 글로우·블러 남발 / 모노 폰트 메타 / 전체 그레인 오버레이 / 의미 없는 파티클.
지향:
1. 사진이 주인공. 풀블리드, 크롭은 피사체 기준.
2. 타이포 2종 이하, 비대칭 그리드, 크기 대비 크게.
3. 포인트 컬러는 **그 사진에서 추출한 1색**.
4. 블러 디졸브보다 하드컷·마스크·와이프. 정지(hold)를 의도적으로.
5. 인트로 1개 = 아이디어 1개.

## 4. 메타데이터 → 영상 매핑 (새로움의 원천)

| 메타데이터 | 영상 요소 |
|---|---|
| EXIF 촬영시각 | 챕터 분할, 시간대(새벽/골든/블루/밤)별 컬러그레이딩, 연사 간격→컷 속도 |
| GPS | 경로 드로잉 + 카메라 이동, 챕터 간 장소 연결, 거리/고도 수치 |
| 조리개·셔터·ISO·초점거리 | 뷰파인더 HUD, 타이포 소재, 자주 쓴 렌즈 통계 |
| 방향(세로/가로) | 레이아웃 자동 선택(세로 2분할 등) |
| 이미지 내용(색·선명도·피사체) | 대표컷 선정, 팔레트 추출, 피사체 뒤 텍스트, 2.5D 패럴랙스 |
| 사진 수·밀도 | 하이라이트 구간 선정, 결산형 숫자 카드 |

## 5. 토픽 모드 (업무용 가정, 사용자 확인 필요)

| 모드 | 용도 | 톤 | 시그니처 모션 |
|---|---|---|---|
| Event | 행사·컨퍼런스 | 에너지, 하드컷, 큰 숫자 | 시간대 타임라인 바 + 연사 리듬 컷 |
| Site | 현장·시공·점검 기록 | 차분, 그리드, 수치 | 날짜 기반 비포/애프터 스와이프, 위치 라벨 |
| Journey | 출장·관광·여행 상품 | 시네마, 지도 | GPS 경로 카메라 |
| Space | 부동산·인테리어·매장 | 여백, 미니멀 | 피사체 뒤 텍스트 + 패럴랙스 |
| Food | F&B·제품 | 고채도, 클로즈업 | 색 추출 풀컬러 블록 전환 |
| Recap | 분기·연말 결산 | Wrapped 스타일 | 숫자 카운트업 + 컬러 블록 |

## 6. 다음 단계 (원본 사진 수령 후)

1. EXIF 파서 + 대표컷/팔레트/클러스터링 → "이 사진 세트에서 뽑은 데이터" 리포트
2. 모드별 인트로 시안 (사진 데이터 주입 후 프레임 직접 검수, AI 티 체크리스트 통과)
3. 타이틀 카드, 전환, 아웃트로, 플로우
