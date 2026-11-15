import type { Reel } from './Reel';
import type { KPhoto, PartData, PartId } from './schema.ts';

/** 샘플 사진(블러 처리된 공용 샘플). 실제 사진·개인정보 없음 */
const L = (m: string, n: number): KPhoto => ({ src: `media/${m}_L${n}.jpg`, aspect: 1.5, fx: 0.5, fy: 0.45 });
const P = (m: string, n: number): KPhoto => ({ src: `media/${m}_P${n}.jpg`, aspect: 0.75, fx: 0.5, fy: 0.4 });
export const SAMPLE_PHOTOS: KPhoto[] = [
  { ...L('event_keynote', 1), caption: '첫 무대', time: '10:02' }, L('event_expo', 1), P('event_expo', 1), L('school', 2), L('club', 3), P('school', 1), L('education', 1), P('education', 2),
  { ...L('recap', 2), caption: '다 같이', time: '13:40' }, L('recap', 3), P('recap', 1), L('grad', 2), L('trip_kyoto', 2), P('grad', 1), L('store', 1), L('site', 2),
];

/** 부품마다 갤러리·검수에 쓰는 표준 입력(영상 종류에 치우치지 않은 문구) */
export const SAMPLE_PART: { [K in PartId]: { data: PartData[K]; photos: number[] } } = {
  'opener.title': { data: { kicker: '2026 가을', title: '함께 만든\n하루의 기록', sub: '사진으로 다시 보는 그날', chips: ['10.24 (금)', '시민 광장', '참여 320명'] }, photos: [0, 3, 5] },
  'opener.collage': { data: { kicker: 'RECAP 2026', title: '우리의 한 해', sub: '열두 달, 사진 1,204장' }, photos: [3, 4, 8, 9, 12] },
  'section.title': { data: { index: 2, total: 4, title: '함께 배우기', sub: '오후 1:30 – 3:00' }, photos: [6] },
  'photo.full': { data: { caption: '모두 모였어요', sub: '출발 전 단체 사진', chip: '10:02' }, photos: [0] },
  'photo.side': { data: { caption: '손으로 직접 만들어 봐요', sub: '두 번째 체험', chip: '13:40' }, photos: [8] },
  'photo.pair': { data: { label: '오전' }, photos: [2, 5] },
  'photo.trio': { data: { label: '체험' }, photos: [3, 7, 9] },
  'photo.grid': { data: { label: '이모저모' }, photos: [1, 4, 9, 11, 14] },
  'photo.strip': { data: { label: '흐름' }, photos: [6, 10, 12, 13, 15] },
  'text.statement': { data: { lines: ['같은 날,', '다른 서른 개의 장면', '하나의 기억'], emphasis: 1 }, photos: [] },
  'text.quote': { data: { text: '처음엔 어색했는데\n끝날 때는 아쉬웠어요.', who: '참가자', role: '두 번째 참여' }, photos: [5] },
  'data.numbers': { data: { title: '숫자로 보는 하루', items: [{ value: 320, unit: '명', label: '함께한 사람' }, { value: 12, unit: '개', label: '체험 부스' }, { value: 1204, unit: '장', label: '남긴 사진' }] }, photos: [] },
  'data.schedule': { data: { title: '오늘의 순서', rows: [{ when: '10:00', what: '여는 순서', note: '본관 강당', hi: true }, { when: '11:30', what: '체험 부스' }, { when: '13:00', what: '점심', note: '중앙 광장' }, { when: '14:30', what: '발표', hi: true }, { when: '16:00', what: '마무리' }] }, photos: [] },
  'data.list': { data: { title: '함께한 사람들', sub: '가나다순', items: ['강하늘', '김서연', '김민준', '박지우', '배도윤', '서하은', '송시우', '신수아', '안주원', '오지호', '유예린', '윤현우', '이채원', '임준서', '장다은', '정건우', '조유나', '최태윤', '한소율', '홍은우'] }, photos: [] },
  'outro.thanks': { data: { title: '함께해 주셔서\n고맙습니다', message: '다음에 또 만나요.', chips: ['2026.10.24', '시민 광장'] }, photos: [0, 8, 12] },
};

/** 모든 부품을 한 번씩 쓰는 샘플 설계도 */
export const sampleReel = (family = 'scrapbook'): Reel => ({
  family, brand: '샘플 브랜드', photos: SAMPLE_PHOTOS,
  scenes: [
    { part: 'opener.title', ...SAMPLE_PART['opener.title'] },
    { part: 'section.title', ...SAMPLE_PART['section.title'], data: { ...SAMPLE_PART['section.title'].data, index: 1, title: '시작' } },
    { part: 'photo.full', ...SAMPLE_PART['photo.full'] }, { part: 'photo.pair', ...SAMPLE_PART['photo.pair'] }, { part: 'photo.side', ...SAMPLE_PART['photo.side'] },
    { part: 'text.statement', ...SAMPLE_PART['text.statement'] },
    { part: 'section.title', ...SAMPLE_PART['section.title'] },
    { part: 'photo.trio', ...SAMPLE_PART['photo.trio'] }, { part: 'photo.grid', ...SAMPLE_PART['photo.grid'] }, { part: 'photo.strip', ...SAMPLE_PART['photo.strip'] }, { part: 'text.quote', ...SAMPLE_PART['text.quote'] },
    { part: 'section.title', ...SAMPLE_PART['section.title'], data: { ...SAMPLE_PART['section.title'].data, index: 3, title: '기록' } },
    { part: 'data.numbers', ...SAMPLE_PART['data.numbers'] }, { part: 'data.schedule', ...SAMPLE_PART['data.schedule'] }, { part: 'data.list', ...SAMPLE_PART['data.list'] },
    { part: 'opener.collage', ...SAMPLE_PART['opener.collage'] },
    { part: 'outro.thanks', ...SAMPLE_PART['outro.thanks'] },
  ] as Reel['scenes'],
});
