/**
 * 영상 부품 키트: "무엇을 보여 주는가(구조 부품)"와 "어떻게 보이는가(스타일 계열)"를 나눈다.
 * 구조 부품의 입력 형식은 이 파일 하나로 고정되고, 스타일 계열(families/*)은 같은 입력을 자기 방식으로 그린다.
 * 영상 종류(학교·행사·여행·상품…)에 대한 말은 이 키트 안에 넣지 않는다.
 */
export type KPhoto = {
  src: string;          // media/… 또는 http(s) 주소
  aspect: number;       // 가로/세로
  fx?: number; fy?: number; // 피사체 중심(0–1), 크롭·확대 기준
  caption?: string;     // 사진 한 장의 짧은 글(2–3단어 권장)
  time?: string;        // 촬영 시각 HH:MM
  date?: string;        // 촬영 날짜 YYYY.MM.DD
};

/** 구조 부품 15개. 데이터 형식은 PartData, 사진 장수와 기본 길이는 PART_SPEC */
export type PartId =
  | 'opener.title' | 'opener.collage'
  | 'section.title'
  | 'photo.full' | 'photo.side' | 'photo.pair' | 'photo.trio' | 'photo.grid' | 'photo.strip'
  | 'text.statement' | 'text.quote'
  | 'data.numbers' | 'data.schedule' | 'data.list'
  | 'outro.thanks';

export type PartData = {
  'opener.title': { kicker?: string; title: string; sub?: string; chips?: string[] };       // 표지: 제목(\n 최대 2줄) + 정보 칩 + 사진 0–3장
  'opener.collage': { kicker?: string; title: string; sub?: string };                      // 사진 여러 장이 주인공인 표지
  'section.title': { index: number; total: number; title: string; sub?: string };          // 구간 제목: index는 1부터
  'photo.full': { caption?: string; sub?: string; chip?: string };                          // 꽉 찬 한 장(글은 사진 위)
  'photo.side': { caption?: string; sub?: string; chip?: string };                          // 한 장 + 옆에 큰 글
  'photo.pair': { label?: string };                                                         // 두 장(사진별 글은 photo.caption)
  'photo.trio': { label?: string };
  'photo.grid': { label?: string };                                                         // 4–6장 모자이크
  'photo.strip': { label?: string };                                                        // 4–6장이 흐름(가로 영상은 좌→우 이동, 세로는 위로)
  'text.statement': { lines: string[]; emphasis?: number };                                 // 큰 문장 1–3줄, emphasis: 강조할 줄 번호(0부터)
  'text.quote': { text: string; who?: string; role?: string };                              // 인용·한마디 + 사진 0–1장
  'data.numbers': { title?: string; items: { value: number; unit?: string; label: string }[] }; // 숫자 1–4개
  'data.schedule': { title?: string; rows: { when: string; what: string; note?: string; hi?: boolean }[] }; // 일정·타임라인 2–6줄
  'data.list': { title?: string; sub?: string; items: string[] };                           // 명단·목록 3–40개(많으면 흐름)
  'outro.thanks': { title: string; message?: string; chips?: string[] };                    // 마무리 + 사진 0–3장
};

/** 화면 비율에 상관없이 쓰는 장면 정보 */
export type SceneInfo = {
  index: number;        // 영상 안 장면 번호(0부터)
  section: number;      // 속한 구간 번호(0부터, 표지는 -1). 구간마다 강조색을 돌려 쓸 때
  sections: number;     // 전체 구간 수
  brand?: string;       // 화면 구석 표시(기관·행사 이름), 없으면 표시 안 함
};

export type PartProps<K extends PartId = PartId> = { data: PartData[K]; photos: KPhoto[]; dur: number; scene: SceneInfo };

export const PART_SPEC: Record<PartId, { label: string; photos: [number, number]; dur: (n: number) => number }> = {
  'opener.title': { label: '표지(제목)', photos: [0, 3], dur: () => 135 },
  'opener.collage': { label: '표지(사진 콜라주)', photos: [3, 6], dur: () => 135 },
  'section.title': { label: '구간 제목', photos: [0, 1], dur: () => 66 },
  'photo.full': { label: '꽉 찬 한 장', photos: [1, 1], dur: () => 84 },
  'photo.side': { label: '한 장 + 큰 글', photos: [1, 1], dur: () => 84 },
  'photo.pair': { label: '두 장', photos: [2, 2], dur: () => 90 },
  'photo.trio': { label: '세 장', photos: [3, 3], dur: () => 102 },
  'photo.grid': { label: '모자이크(4–6장)', photos: [4, 6], dur: (n) => 96 + n * 6 },
  'photo.strip': { label: '흐름(4–6장)', photos: [4, 6], dur: (n) => 96 + n * 12 },
  'text.statement': { label: '큰 문장', photos: [0, 0], dur: () => 90 },
  'text.quote': { label: '인용·한마디', photos: [0, 1], dur: () => 96 },
  'data.numbers': { label: '숫자', photos: [0, 0], dur: () => 108 },
  'data.schedule': { label: '일정·타임라인', photos: [0, 0], dur: () => 120 },
  'data.list': { label: '명단·목록', photos: [0, 0], dur: () => 150 },
  'outro.thanks': { label: '마무리', photos: [0, 3], dur: () => 140 },
};
export const PART_IDS = Object.keys(PART_SPEC) as PartId[];

/* ---------- 스타일 ---------- */
export type Palette = {
  bg: string;        // 바탕
  surface: string;   // 카드·액자 면
  ink: string;       // 본문 글자
  muted: string;     // 보조 글자
  accents: string[]; // 강조색(구간마다 돌려 씀), 3개 이상
  onAccent: string;  // 강조색 위 글자
};
export type TransitionKind = 'cut' | 'slide' | 'up' | 'iris' | 'blinds' | 'wipe' | 'fade';
export type StyleFamily = {
  id: string;
  label: string;
  note: string;                     // 어떤 영상에 어울리는지(AI 연출 설계에 쓰는 설명)
  palette: Palette;                 // 기본 색(영상마다 사진에서 뽑은 색으로 덮어쓸 수 있다)
  fonts: { display: string; body: string };
  transitions: TransitionKind[];    // 이 계열에 어울리는 전환(장면마다 돌려 씀)
  parts: { [K in PartId]: React.FC<PartProps<K>> };
};
