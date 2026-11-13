/** 입력 폼에 표시할 한국어 이름 */
export const LABELS: Record<string, string> = {
  info: '기본 정보', intro: '인트로', introPhoto: '인트로 사진', colors: '색상', bug: '코너 문구', opening: '오프닝 장면', chapters: '챕터', closing: '마무리 장면', outro: '아웃트로',
  kicker: '상단 문구', title: '제목', sub: '부제', chips: '정보 칩', k: '항목', v: '값', l: '라벨', n: '숫자', unit: '단위', dec: '소수 자릿수',
  accent: '포인트 색', light: '밝은 배경', ink: '어두운 배경·글자', onAccent: '포인트 위 글자', ocean: '바다', land: '육지',
  card: '챕터 카드', index: '번호 표시', big: '큰 글자', small: '설명', meta: '요약 수치', photos: '사진', style: '컷 속도', beat: '데이터 장면', beatPhotos: '장면 사진',
  rows: '행', stats: '숫자', cta: '버튼 문구', items: '항목', text: '문구', name: '이름', role: '소속 · 직함', d: '날짜', t: '내용', s: '보조 설명', hi: '강조',
  names: '명단 (한 줄에 한 명)', counts: '월별 사진 수 (쉼표로 구분)', bands: '구간', marks: '표시', label: '라벨', from: '시작 위치', to: '끝 위치', i: '위치',
  agenda: '일정표', sessions: '하이라이트 세션', start: '시작', end: '종료', speaker: '연사', room: '장소', highlight: '하이라이트', attendees: '참석 인원',
  quote: '인용문', statsPhoto: '숫자 장면 사진', photo: '사진', stops: '정차지', range: '기간', dateLabel: '날짜 표시', venue: '장소', tagline: '슬로건',
  before: 'Before 라벨', after: 'After 라벨', chip: '칩 문구', en: '영문 제목', points: '항목', swatches: '컬러 옵션', c: '색', x: '가로 위치(0~1)', y: '세로 위치(0~1)',
  school: '학교', klass: '학년·반', day: '날짜', introPhotos: '인트로 사진 (최대 3장)', message: '마무리 인사', step: '단계 번호', place: '장소명', km: '거리', active: '현재 위치', dur: '길이(프레임)',
};
export const HIDE = new Set(['rail', 'aspect', 'hex', 'exif', 'model', 'fy', 'fx', 'wd', 'legs', 'assets', 'kind', 'mode', 'lat', 'lon', 'tz', 'arrive', 'depart', 'modeOverride', 'layout', 'panel', 'extra', 'type', 'time', 'date', 'ts', 'src', 'cap']);
/** 마지막 하나는 지울 수 없는 목록(비면 영상이 깨진다) */
export const MIN1 = new Set(['chapters', 'sessions', 'agenda', 'photos', 'stops', 'items', 'bands']);
export const labelOf = (k: string) => LABELS[k] ?? k;
