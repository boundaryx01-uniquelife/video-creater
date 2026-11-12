/** 업무 영상 모드별 템플릿 정의: 같은 뼈대(인트로·챕터 카드·사진 컷·아웃트로)에 모드별 "데이터 요소"가 다르게 들어간다. 모든 텍스트는 가상 예시. */
export type Rail =
  | { type: 'time'; from: number; to: number; blocks: [number, number][]; active: number; label: string }
  | { type: 'progress'; value: number; marks: string[]; active: number }
  | { type: 'segments'; labels: string[]; active: number }
  | { type: 'route'; stops: string[]; active: number };

export type Beat =
  | { kind: 'lower'; chip: string; title: string; sub: string }
  | { kind: 'beforeafter'; chip: string; before: string; after: string }
  | { kind: 'spec'; title: string; en: string; rows: { k: string; v: string }[] }
  | { kind: 'callout'; name: string; points: { x: number; y: number; t: string; s: string }[]; swatches: { c: string; n: string }[] }
  | { kind: 'route'; place: string; sub: string; stops: string[]; active: number; km: string }
  | { kind: 'caption'; step: string; title: string; quote: string; points: string[] }
  | { kind: 'stats'; kicker: string; items: { n: number; l: string; unit?: string; dec?: number }[] }
  | { kind: 'quote'; text: string; name: string; role: string }
  | { kind: 'schedule'; kicker: string; title: string; rows: { d: string; t: string; s?: string; hi?: boolean }[] }
  | { kind: 'names'; kicker: string; title: string; sub: string; names: string[] }
  | { kind: 'timeline'; kicker: string; title: string; unit: string; counts: number[]; bands: { label: string; from: number; to: number }[]; marks: { i: number; label: string }[] };

export type Outro = { title: string; sub: string; rows: { k: string; v: string }[]; stats?: { n: string; l: string }[]; cta?: string; extra?: 'sponsors' | 'qr' | 'progress' | 'route' | 'rating'; };

export type ModeSpec = {
  id: string; name: string; use: string; data: string[];
  accent: string; light: string; ink: string; onAccent: string;
  intro: { layout: 'photo' | 'split' | 'type'; panel?: 'accent' | 'paper'; kicker: string; title: string; sub: string; chips: { k: string; v: string }[] };
  card: { index: string; big: string; small: string; meta: { v: string; l: string }[]; rail: Rail };
  beat: Beat; outro: Outro;
};

export const MODES: Record<string, ModeSpec> = {
  event: {
    id: 'event', name: '행사 · 컨퍼런스', use: '컨퍼런스, 발표회, 세미나, 전시', data: ['세션 시간표', '연사·직함', '참석자 수', '장소'],
    accent: '#ff5a3c', light: '#f4ece6', ink: '#14163f', onAccent: '#ffffff',
    intro: { layout: 'photo', kicker: 'KOREA TECH SUMMIT', title: '2026 테크 서밋', sub: '새로운 연결, 다음 기준', chips: [{ k: '일시', v: '2026.11.12 (목)' }, { k: '장소', v: '서울 코엑스 그랜드볼룸' }, { k: '참석', v: '1,240명' }] },
    card: { index: '세션 03 / 08', big: '14:30', small: '데이터가 만드는 제품', meta: [{ v: '김서연', l: '최고데이터책임자' }, { v: 'Room B', l: '장소' }, { v: '312명', l: '참석' }], rail: { type: 'time', from: 9, to: 18, blocks: [[9.5, 10.5], [11, 12], [13.5, 14.3], [14.5, 15.5], [16, 17]], active: 3, label: '14:30 — 15:30' } },
    beat: { kind: 'lower', chip: '14:42', title: '데이터가 만드는 제품', sub: '김서연 · 최고데이터책임자' },
    outro: { title: '감사합니다', sub: '2026 테크 서밋', rows: [{ k: '다음 행사', v: '2027.11 · 서울' }, { k: '자료 다운로드', v: 'summit.example.com' }], stats: [{ n: '1,240', l: '참석자' }, { n: '18', l: '세션' }, { n: '24', l: '연사' }], extra: 'sponsors' },
  },
  site: {
    id: 'site', name: '현장 · 시공 기록', use: '건설·설비 현장 보고, 점검, 공정 기록', data: ['날짜(D+n)', '공정명', '공정률(%)', '위치(층·구역)', '날씨', '투입 인원'],
    accent: '#f2a900', light: '#eceae4', ink: '#1b1d20', onAccent: '#111111',
    intro: { layout: 'split', panel: 'accent', kicker: 'PROGRESS REPORT', title: '해오름 아파트\n신축공사', sub: '공정 보고 · 2026년 11월', chips: [{ k: '기간', v: '2026.10.01 – 11.30' }, { k: '공정률', v: '42%' }, { k: '현장', v: '경기 화성시' }] },
    card: { index: '공정 03 / 07', big: '철근 배근', small: '3F 슬래브 · 11.03 – 11.09', meta: [{ v: '42%', l: '공정률' }, { v: '38명', l: '투입 인원' }, { v: '맑음 14°', l: '날씨' }], rail: { type: 'progress', value: 0.42, marks: ['터파기', '기초', '골조', '설비', '마감'], active: 2 } },
    beat: { kind: 'beforeafter', chip: '3F 슬래브 · 공정률 42%', before: 'BEFORE 10.01', after: 'AFTER 11.03' },
    outro: { title: '다음 공정', sub: '골조 4층 · D-34', rows: [{ k: '예정', v: '11.10 – 11.30' }, { k: '담당', v: '김현장 소장' }, { k: '특이사항', v: '우천 예보 3일' }], extra: 'progress' },
  },
  store: {
    id: 'store', name: '매장 · 공간 오픈', use: '매장·카페·전시장 오픈, 부동산·인테리어 공간 소개', data: ['공간명', '면적·좌석', '콘셉트·소재', '주소', '영업시간'],
    accent: '#6f8f6a', light: '#f3ebdd', ink: '#2c2219', onAccent: '#ffffff',
    intro: { layout: 'type', kicker: 'GRAND OPEN', title: 'Maison Café', sub: '성수 플래그십 스토어', chips: [{ k: '오픈', v: '2026.11.12' }, { k: '위치', v: '서울 성동구 아차산로 12' }, { k: '영업', v: '매일 10:00 – 22:00' }] },
    card: { index: '공간 01 / 05', big: 'Entrance', small: '입구 · 1F', meta: [{ v: '48㎡', l: '면적' }, { v: '24석', l: '좌석' }, { v: 'Warm Wood', l: '콘셉트' }], rail: { type: 'segments', labels: ['Entrance', 'Bar', 'Seating', 'Terrace', 'Kitchen'], active: 0 } },
    beat: { kind: 'spec', title: '메인 바', en: 'Main Bar', rows: [{ k: '면적', v: '12㎡' }, { k: '소재', v: '월넛 · 테라조' }, { k: '조명', v: '2700K 간접조명' }, { k: '좌석', v: '8석' }] },
    outro: { title: '오시는 길', sub: 'Maison Café 성수', rows: [{ k: '주소', v: '서울 성동구 아차산로 12, 1F' }, { k: '영업시간', v: '매일 10:00 – 22:00' }, { k: '문의', v: '02-000-0000' }], cta: '오픈 기념 첫 주 음료 1+1', extra: 'qr' },
  },
  product: {
    id: 'product', name: '상품 소개', use: '신제품·서비스 소개, 카탈로그, 프로모션', data: ['제품명·태그라인', '핵심 스펙', '컬러 옵션', '가격', '출시일'],
    accent: '#3f6df6', light: '#eef1f5', ink: '#10131a', onAccent: '#ffffff',
    intro: { layout: 'split', panel: 'paper', kicker: 'NEW', title: 'AURA One', sub: '새로운 기준의 노이즈 캔슬링', chips: [{ k: '출시', v: '2026.11.20' }, { k: '가격', v: '₩299,000' }, { k: '컬러', v: '3종' }] },
    card: { index: '특징 03 / 06', big: '50MP', small: '카메라', meta: [{ v: '1/1.3"', l: '센서' }, { v: 'f/1.8', l: '조리개' }, { v: 'OIS', l: '손떨림 보정' }], rail: { type: 'segments', labels: ['Display', 'Chip', 'Camera', 'Battery', 'Design', 'Price'], active: 2 } },
    beat: { kind: 'callout', name: 'AURA One', points: [{ x: 0.58, y: 0.3, t: '50MP 카메라', s: 'f/1.8 · OIS' }, { x: 0.66, y: 0.58, t: '티타늄 프레임', s: '무게 187g' }, { x: 0.46, y: 0.74, t: '5,000mAh', s: '2일 사용' }], swatches: [{ c: '#1f2430', n: 'Midnight' }, { c: '#cfd6df', n: 'Silver' }, { c: '#3f6df6', n: 'Blue' }] },
    outro: { title: '지금 만나보세요', sub: 'AURA One', rows: [{ k: '가격', v: '₩299,000' }, { k: '사전 예약', v: '2026.11.12 – 11.19' }, { k: '출시', v: '2026.11.20' }], cta: '사전 예약하기', extra: 'qr' },
  },
  journey: {
    id: 'journey', name: '여행 · 출장', use: '출장 보고, 답사, 관광 상품, 여행 기록', data: ['GPS 경로·이동 거리', '일차(Day n)', '방문지', '날짜·기온'],
    accent: '#1d8fb5', light: '#e8f0f2', ink: '#0f2f3a', onAccent: '#ffffff',
    intro: { layout: 'photo', kicker: 'FIELD TRIP', title: '부산 · 제주\n4박 5일', sub: '남해안 답사 기록', chips: [{ k: '기간', v: '2026.11.03 – 07' }, { k: '이동', v: '612 km' }, { k: '방문', v: '5곳' }] },
    card: { index: 'Day 02 / 05', big: '부산', small: '해운대 · 광안대교', meta: [{ v: '148 km', l: '이동' }, { v: '37장', l: '사진' }, { v: '13°', l: '기온' }], rail: { type: 'route', stops: ['서울', '부산', '통영', '여수', '제주'], active: 1 } },
    beat: { kind: 'route', place: '광안대교', sub: '11.04 · 16:20', stops: ['서울', '부산', '통영', '여수', '제주'], active: 1, km: '148 km' },
    outro: { title: '총 612 km', sub: '4박 5일 · 5개 도시', rows: [{ k: '출발', v: '서울 11.03' }, { k: '도착', v: '제주 11.07' }], stats: [{ n: '612', l: 'km' }, { n: '5', l: '도시' }, { n: '184', l: '사진' }], extra: 'route' },
  },
  education: {
    id: 'education', name: '교육 · 워크숍', use: '사내 교육, 워크숍, 세미나, 강의 기록', data: ['커리큘럼 단계', '시간·장소', '강사', '참가자 수', '핵심 문장'],
    accent: '#d9822b', light: '#f4efe1', ink: '#23323a', onAccent: '#ffffff',
    intro: { layout: 'type', kicker: 'WORKSHOP', title: '리더십 워크숍 2기', sub: 'Practice · Reflect · Apply', chips: [{ k: '일정', v: '2026.11.05 – 06' }, { k: '참가', v: '32명' }, { k: '장소', v: '연수원 3층 세미나실' }] },
    card: { index: '단계 02 / 05', big: '팀 빌딩', small: '10:30 – 12:00 · 조별 활동', meta: [{ v: '6개 조', l: '구성' }, { v: '박민준', l: '진행' }, { v: '90분', l: '시간' }], rail: { type: 'segments', labels: ['오리엔테이션', '팀 빌딩', '사례 토론', '실습', '회고'], active: 1 } },
    beat: { kind: 'caption', step: '02', title: '팀 빌딩', quote: '"좋은 질문 하나가 회의 한 시간을 바꾼다"', points: ['역할 정하기', '공동 목표 합의', '피드백 규칙'] },
    outro: { title: '수료를 축하합니다', sub: '리더십 워크숍 2기', rows: [{ k: '다음 일정', v: '3기 2027.02' }, { k: '자료', v: 'workshop.example.com' }], stats: [{ n: '32', l: '수료' }, { n: '98%', l: '출석' }, { n: '4.8', l: '만족도 / 5' }], extra: 'rating' },
  },
  school: {
    id: 'school', name: '학교 홍보', use: '신입생 모집, 학교 소개, 입학 설명회', data: ['학교 숫자(학생·학급·동아리)', '교육과정', '재학생 한마디', '입학 일정'],
    accent: '#1f8a5b', light: '#eef3ec', ink: '#12332a', onAccent: '#ffffff',
    intro: { layout: 'photo', kicker: 'HANBIT HIGH SCHOOL', title: '한빛고등학교', sub: '스스로 묻고, 함께 답하는 학교', chips: [{ k: '모집', v: '2027학년도 신입생' }, { k: '원서 접수', v: '12.01 – 12.05' }, { k: '입학 설명회', v: '11.21 (토)' }] },
    card: { index: '소개 01 / 03', big: '교육과정', small: '선택형 수업 · 프로젝트 학습', meta: [{ v: '52개', l: '선택 과목' }, { v: '주 4시간', l: '프로젝트 수업' }, { v: '1:1', l: '학습 코칭' }], rail: { type: 'segments', labels: ['교육과정', '학교생활', '진로·진학'], active: 0 } },
    beat: { kind: 'stats', kicker: '숫자로 보는 한빛', items: [{ n: 742, l: '전교생', unit: '명' }, { n: 24, l: '학급당 학생', unit: '명' }, { n: 38, l: '동아리', unit: '개' }, { n: 52, l: '선택 과목', unit: '개' }] },
    outro: { title: '입학 안내', sub: '한빛고등학교 2027학년도', rows: [{ k: '원서 접수', v: '12.01 – 12.05' }, { k: '입학 설명회', v: '11.21 (토) 14:00 · 본교 강당' }, { k: '문의', v: '입학홍보부 02-000-0000' }], cta: '입학 설명회 신청하기', extra: 'qr' },
  },
  club: {
    id: 'club', name: '동아리 홍보', use: '신입 부원 모집, 동아리 박람회, 축제 홍보', data: ['활동 요일·장소', '연간 활동 일정', '부원 한마디', '모집 기간·방법'],
    accent: '#7a3cff', light: '#f3efff', ink: '#170f2e', onAccent: '#ffffff',
    intro: { layout: 'type', kicker: '2027 신입 부원 모집', title: 'SOUNDWAVE', sub: '한빛고 밴드부 · 무대는 우리가 만든다', chips: [{ k: '모집 기간', v: '03.04 – 03.15' }, { k: '대상', v: '1 · 2학년' }, { k: '오디션', v: '03.18 (목)' }] },
    card: { index: '활동 01 / 03', big: '정기 합주', small: '매주 화 · 목 16:30 · 음악실', meta: [{ v: '주 2회', l: '합주' }, { v: '90분', l: '연습 시간' }, { v: '5개', l: '세션' }], rail: { type: 'segments', labels: ['합주', '무대', '모집'], active: 0 } },
    beat: { kind: 'schedule', kicker: 'ONE YEAR', title: '1년\n활동', rows: [{ d: '3월', t: '신입 부원 오디션' }, { d: '5월', t: '봄 버스킹', s: '중앙 광장', hi: true }, { d: '7월', t: '여름 합숙', s: '2박 3일' }, { d: '9월', t: '축제 메인 공연', s: '한빛제', hi: true }, { d: '12월', t: '정기 공연', s: '본교 강당', hi: true }] },
    outro: { title: '지금 지원하세요', sub: 'SOUNDWAVE 신입 부원 모집', rows: [{ k: '지원 기간', v: '03.04 – 03.15' }, { k: '오디션', v: '03.18 (목) 16:30 · 음악실' }, { k: '문의', v: '@soundwave.band' }], cta: '지원서 작성하기', extra: 'qr' },
  },
  grad: {
    id: 'grad', name: '졸업 영상', use: '졸업식 상영, 학급·학년 추억 영상', data: ['촬영 날짜(학년·행사 자동 분류)', '행사명', '선생님 한마디', '졸업생 명단'],
    accent: '#b5483b', light: '#f4eee3', ink: '#2a211c', onAccent: '#ffffff',
    intro: { layout: 'split', panel: 'paper', kicker: 'CLASS OF 2027', title: '우리의\n3년', sub: '한빛고등학교 제42회 졸업', chips: [{ k: '입학', v: '2024.03.04' }, { k: '졸업', v: '2027.02.12' }, { k: '졸업생', v: '248명' }] },
    card: { index: '01 / 03', big: '1학년', small: '2024 · 처음 만난 봄', meta: [{ v: '514장', l: '사진' }, { v: '입학식 · 체육대회', l: '주요 행사' }, { v: 'D+1 – D+365', l: '함께한 날' }], rail: { type: 'segments', labels: ['1학년', '2학년', '3학년'], active: 0 } },
    beat: { kind: 'quote', text: '어디서든 너희답게.\n3년 동안 고마웠다.', name: '박정우 선생님', role: '3학년 담임' },
    outro: { title: '졸업을 축하합니다', sub: '한빛고등학교 제42회 졸업식 · 2027.02.12', rows: [{ k: '입학', v: '2024.03.04' }, { k: '졸업', v: '2027.02.12' }], stats: [{ n: '248', l: '졸업생' }, { n: '1,076', l: '함께한 날' }, { n: '1,956', l: '장의 사진' }] },
  },
};
export const MODE_IDS = Object.keys(MODES);
