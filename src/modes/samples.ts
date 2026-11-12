import type { PhotoSpec } from '../analysis/videoData.ts';
import { MODES } from './config.ts';
import type { ModeVideoProps } from './video.ts';

const L = (m: string, n: number) => `media/${m}_L${n}.jpg`, P = (m: string, n: number) => `media/${m}_P${n}.jpg`;
const ph = (src: string, port: boolean, chip: string, title = '', sub = ''): PhotoSpec => ({ src, aspect: port ? 0.75 : 1.78, time: chip, date: '', wd: '', hex: '#888', exif: '', model: '', fy: 0.42, fx: 0.5, cap: { chip, title, sub } });
const colors = (id: string) => { const m = MODES[id]; return { accent: m.accent, light: m.light, ink: m.ink, onAccent: m.onAccent }; };

/** 가상 데이터(실제 사진·개인정보 없음). 각 모드의 입력 형식 예시이기도 하다 */
export function siteSample(): ModeVideoProps {
  const m = 'site', marks = ['터파기', '기초', '골조', '설비', '마감'];
  return { mode: m, colors: colors(m), bug: '해오름 아파트 · 공정 보고', intro: MODES.site.intro, introPhoto: P(m, 1),
    chapters: [
      { style: 'steady', card: { index: '공정 01 / 03', big: '기초 공사', small: 'B1 · 10.01 – 10.20', meta: [{ v: '18%', l: '공정률' }, { v: '26명', l: '투입 인원' }, { v: '맑음 19°', l: '날씨' }], rail: { type: 'progress', value: 0.18, marks, active: 1 } },
        photos: [ph(L(m, 1), false, 'D+3 · 10.03', '터파기', 'B1 · 굴착 깊이 6.2m'), ph(L(m, 2), false, 'D+9 · 10.09'), ph(P(m, 1), true, 'D+12 · 10.12'), ph(P(m, 2), true, 'D+13 · 10.13'), ph(L(m, 3), false, 'D+19 · 10.19', '기초 타설 완료', '콘크리트 420㎥')],
        beat: { kind: 'beforeafter', chip: 'B1 기초 · 공정률 18%', before: 'BEFORE 10.01', after: 'AFTER 10.20' }, beatPhotos: [L(m, 4), L(m, 3)] },
      { style: 'steady', card: { index: '공정 02 / 03', big: '철근 배근', small: '3F 슬래브 · 11.03 – 11.09', meta: [{ v: '42%', l: '공정률' }, { v: '38명', l: '투입 인원' }, { v: '맑음 14°', l: '날씨' }], rail: { type: 'progress', value: 0.42, marks, active: 2 } },
        photos: [ph(L(m, 5), false, 'D+34 · 11.03', '3F 슬래브 배근', 'HD13 @200 · 2단 배근'), ph(P(m, 3), true, 'D+36 · 11.05'), ph(P(m, 4), true, 'D+36 · 11.05'), ph(L(m, 6), false, 'D+38 · 11.07'), ph(L(m, 2), false, 'D+40 · 11.09', '배근 검측 완료', '감리 입회 · 적합')],
        beat: { kind: 'beforeafter', chip: '3F 슬래브 · 공정률 42%', before: 'BEFORE 11.03', after: 'AFTER 11.09' }, beatPhotos: [L(m, 5), L(m, 1)] },
      { style: 'fast', card: { index: '공정 03 / 03', big: '안전 점검', small: '전 구역 · 11.10', meta: [{ v: '24건', l: '점검 항목' }, { v: '2건', l: '지적 사항' }, { v: '61일', l: '무재해' }], rail: { type: 'progress', value: 0.42, marks, active: 2 } },
        photos: [ph(L(m, 3), false, '11.10 09:20', '추락 방지 시설', '3F 외부 비계'), ph(L(m, 4), false, '11.10 09:48'), ph(L(m, 6), false, '11.10 10:15'), ph(L(m, 1), false, '11.10 10:40'), ph(P(m, 1), true, '11.10 11:05'), ph(P(m, 3), true, '11.10 11:06')],
        beat: { kind: 'spec', title: '점검 결과', en: 'Safety Inspection', rows: [{ k: '점검 항목', v: '24건' }, { k: '지적 사항', v: '2건' }, { k: '조치 완료', v: '2건 (100%)' }, { k: '무재해', v: '61일' }] }, beatPhotos: [P(m, 2)] },
    ], outro: MODES.site.outro };
}
export function storeSample(): ModeVideoProps {
  const m = 'store', labels = ['Entrance', 'Main Bar', 'Seating', 'Terrace'];
  return { mode: m, colors: colors(m), bug: 'MAISON CAFÉ', intro: MODES.store.intro, introPhoto: L(m, 2),
    chapters: [
      { style: 'slow', card: { index: '공간 01 / 03', big: 'Entrance', small: '입구 · 1F', meta: [{ v: '48㎡', l: '면적' }, { v: 'Warm Wood', l: '콘셉트' }, { v: '2.9m', l: '층고' }], rail: { type: 'segments', labels, active: 0 } },
        photos: [ph(L(m, 1), false, '1F', '입구', '오크 루버 파사드'), ph(P(m, 1), true, '1F'), ph(P(m, 2), true, '1F'), ph(L(m, 3), false, '1F', '웰컴 존', '시즈널 디스플레이')],
        beat: { kind: 'spec', title: '입구', en: 'Entrance', rows: [{ k: '면적', v: '48㎡' }, { k: '소재', v: '오크 · 라임스톤' }, { k: '조명', v: '3000K 라인 조명' }, { k: '동선', v: '주문대까지 6m' }] }, beatPhotos: [P(m, 3)] },
      { style: 'slow', card: { index: '공간 02 / 03', big: 'Main Bar', small: '메인 바 · 1F', meta: [{ v: '12㎡', l: '면적' }, { v: '8석', l: '바 좌석' }, { v: '월넛', l: '상판' }], rail: { type: 'segments', labels, active: 1 } },
        photos: [ph(L(m, 4), false, 'BAR', '메인 바', '월넛 상판 · 테라조'), ph(L(m, 5), false, 'BAR'), ph(P(m, 4), true, 'BAR'), ph(P(m, 1), true, 'BAR'), ph(L(m, 6), false, 'BAR', '시그니처 메뉴', '핸드드립 · 디저트 페어링')],
        beat: { kind: 'spec', title: '메인 바', en: 'Main Bar', rows: [{ k: '면적', v: '12㎡' }, { k: '소재', v: '월넛 · 테라조' }, { k: '조명', v: '2700K 간접조명' }, { k: '좌석', v: '8석' }] }, beatPhotos: [P(m, 2)] },
      { style: 'steady', card: { index: '공간 03 / 03', big: 'Seating', small: '좌석 · 1F–2F', meta: [{ v: '96㎡', l: '면적' }, { v: '42석', l: '좌석' }, { v: '6곳', l: '콘센트 좌석' }], rail: { type: 'segments', labels, active: 2 } },
        photos: [ph(L(m, 2), false, '2F', '라운지 좌석', '창가 6석 · 소파 12석'), ph(L(m, 3), false, '2F'), ph(P(m, 3), true, '2F'), ph(P(m, 4), true, '2F'), ph(L(m, 1), false, '1F', '커뮤널 테이블', '10인 · 예약 가능')] },
    ], outro: MODES.store.outro };
}
export function productSample(): ModeVideoProps {
  const m = 'product', labels = ['Design', 'Camera', 'Battery', 'Price'];
  return { mode: m, colors: colors(m), bug: 'AURA ONE', intro: MODES.product.intro, introPhoto: P(m, 1),
    chapters: [
      { style: 'steady', card: { index: '특징 01 / 03', big: '187g', small: '디자인 · 티타늄 프레임', meta: [{ v: '7.6mm', l: '두께' }, { v: 'IP68', l: '방수·방진' }, { v: '3색', l: '컬러' }], rail: { type: 'segments', labels, active: 0 } },
        photos: [ph(L(m, 1), false, 'DESIGN', '티타늄 프레임', '무게 187g · 두께 7.6mm'), ph(L(m, 2), false, 'DESIGN'), ph(P(m, 1), true, 'MIDNIGHT'), ph(P(m, 2), true, 'SILVER'), ph(L(m, 3), false, 'DESIGN', '세 가지 컬러', 'Midnight · Silver · Blue')],
        beat: MODES.product.beat, beatPhotos: [L(m, 4)] },
      { style: 'fast', card: { ...MODES.product.card, index: '특징 02 / 03', rail: { type: 'segments', labels, active: 1 } },
        photos: [ph(L(m, 5), false, 'CAMERA', '50MP 메인 카메라', '1/1.3" 센서 · f/1.8 · OIS'), ph(L(m, 6), false, 'SAMPLE'), ph(L(m, 2), false, 'SAMPLE'), ph(L(m, 3), false, 'SAMPLE'), ph(L(m, 4), false, 'SAMPLE'), ph(P(m, 3), true, 'NIGHT'), ph(P(m, 4), true, 'PORTRAIT')],
        beat: { kind: 'spec', title: '카메라', en: 'Camera', rows: [{ k: '메인', v: '50MP · f/1.8' }, { k: '초광각', v: '12MP · 120°' }, { k: '망원', v: '10MP · 3배' }, { k: '동영상', v: '4K 60fps' }] }, beatPhotos: [P(m, 2)] },
      { style: 'steady', card: { index: '특징 03 / 03', big: '2일', small: '배터리 · 5,000mAh', meta: [{ v: '45W', l: '고속 충전' }, { v: '30분', l: '65% 충전' }, { v: '15W', l: '무선 충전' }], rail: { type: 'segments', labels, active: 2 } },
        photos: [ph(L(m, 6), false, 'BATTERY', '이틀 가는 배터리', '5,000mAh · 45W 고속 충전'), ph(P(m, 1), true, 'CHARGE'), ph(P(m, 3), true, 'CHARGE'), ph(L(m, 1), false, 'BATTERY', '30분에 65%', '무선 충전 15W')] },
    ], outro: MODES.product.outro };
}

/* ---------- 학교 ---------- */
export function schoolSample(): ModeVideoProps {
  const m = 'school', M = MODES.school, labels = ['교육과정', '학교생활', '진로·진학'], E = 'education';
  return { mode: m, colors: colors(m), bug: '한빛고등학교', intro: M.intro, introPhoto: L(m, 1),
    opening: [{ beat: M.beat, photos: [P(m, 1)] }],
    chapters: [
      { style: 'steady', card: M.card,
        photos: [ph(L(E, 1), false, '수업', '프로젝트 수업', '2학년 · 융합과학'), ph(L(E, 2), false, '수업'), ph(P(E, 1), true, '토론'), ph(P(E, 2), true, '실험'), ph(L(E, 3), false, '코칭', '1:1 학습 코칭', '주 1회 · 담임 교사')],
        beat: { kind: 'spec', title: '교육과정', en: 'Curriculum', rows: [{ k: '선택 과목', v: '52개' }, { k: '프로젝트 학기', v: '2학년 1학기' }, { k: '방과후 강좌', v: '24개' }, { k: '학습 코칭', v: '주 1회' }] }, beatPhotos: [P(E, 3)] },
      { style: 'fast', card: { index: '소개 02 / 03', big: '학교생활', small: '동아리 · 축제 · 급식', meta: [{ v: '38개', l: '동아리' }, { v: '4.6 / 5', l: '급식 만족도' }, { v: '연 2회', l: '축제 · 체육대회' }], rail: { type: 'segments', labels, active: 1 } },
        photos: [ph(L(m, 2), false, '캠퍼스', '중앙 광장', '점심시간 버스킹'), ph(L('club', 1), false, '동아리'), ph(L('club', 2), false, '축제'), ph(L(m, 3), false, '체육대회'), ph(L(m, 4), false, '도서관'), ph(P(m, 2), true, '급식'), ph(P(m, 3), true, '동아리')],
        beat: { kind: 'quote', text: '하고 싶은 걸 말하면,\n같이 방법을 찾아주는 학교예요.', name: '김하늘', role: '2학년 재학생' }, beatPhotos: [P(m, 4)] },
      { style: 'steady', card: { index: '소개 03 / 03', big: '진로·진학', small: '상담 · 대학 연계 · 졸업생 멘토', meta: [{ v: '연 6회', l: '진로 상담' }, { v: '12곳', l: '대학 연계 프로그램' }, { v: '80명', l: '졸업생 멘토' }], rail: { type: 'segments', labels, active: 2 } },
        photos: [ph(L(E, 4), false, '진로', '졸업생 멘토링', '전공별 소그룹'), ph(P(E, 3), true, '상담'), ph(P(E, 4), true, '탐방'), ph(L(E, 5), false, '진학', '대학 연계 수업', '12개 대학 참여')] },
    ],
    closing: [{ beat: { kind: 'schedule', kicker: 'ADMISSION', title: '입학\n일정', rows: [{ d: '11.21', t: '입학 설명회', s: '토요일 14:00 · 본교 강당', hi: true }, { d: '12.01 – 05', t: '원서 접수', s: '온라인 접수', hi: true }, { d: '12.12', t: '면접' }, { d: '12.19', t: '합격자 발표' }] } }],
    outro: M.outro };
}

/* ---------- 동아리 ---------- */
export function clubSample(): ModeVideoProps {
  const m = 'club', M = MODES.club, labels = ['합주', '무대', '모집'];
  return { mode: m, colors: colors(m), bug: 'SOUNDWAVE', intro: M.intro, introPhoto: L(m, 1),
    opening: [{ beat: { kind: 'stats', kicker: 'SOUNDWAVE IN NUMBERS', items: [{ n: 24, l: '부원', unit: '명' }, { n: 6, l: '연간 공연', unit: '회' }, { n: 12, l: '창단', unit: '년' }, { n: 9, l: '자작곡', unit: '곡' }] }, photos: [P(m, 1)] }],
    chapters: [
      { style: 'fast', card: M.card,
        photos: [ph(L(m, 2), false, '화 16:30', '정기 합주', '음악실 · 주 2회'), ph(L(m, 3), false, '합주'), ph(L(m, 4), false, '합주'), ph(L(m, 5), false, '합주'), ph(L(m, 6), false, '합주'), ph(P(m, 2), true, '기타'), ph(P(m, 3), true, '드럼')],
        beat: M.beat },
      { style: 'fast', card: { index: '활동 02 / 03', big: '무대', small: '축제 · 버스킹 · 정기 공연', meta: [{ v: '6회', l: '연간 공연' }, { v: '800명', l: '축제 관객' }, { v: '9곡', l: '자작곡' }], rail: { type: 'segments', labels, active: 1 } },
        photos: [ph(L(m, 1), false, '9월', '한빛제 메인 공연', '관객 800명'), ph(P(m, 4), true, '5월'), ph(P(m, 1), true, '5월'), ph(L(m, 3), false, '12월'), ph(L(m, 5), false, '12월', '정기 공연', '본교 강당')],
        beat: { kind: 'quote', text: '처음엔 코드도 몰랐는데,\n지금은 무대가 제일 편해요.', name: '이서준', role: '2학년 · 기타' }, beatPhotos: [P(m, 2)] },
      { style: 'steady', card: { index: '활동 03 / 03', big: '5파트', small: '보컬 · 기타 · 베이스 · 드럼 · 키보드', meta: [{ v: '8명', l: '모집 인원' }, { v: '초보 환영', l: '경험 무관' }, { v: '악기 대여', l: '동아리 보유' }], rail: { type: 'segments', labels, active: 2 } },
        photos: [ph(L(m, 4), false, '모집', '모집 파트', '보컬 2 · 기타 2 · 베이스 1 · 드럼 1 · 키보드 2'), ph(P(m, 3), true, '드럼'), ph(P(m, 4), true, '보컬'), ph(L(m, 6), false, '오디션', '오디션은 편하게', '자유곡 1분 · 03.18')] },
    ],
    outro: M.outro };
}

/* ---------- 졸업 ---------- */
const SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황'], GIV = ['서연', '민준', '지우', '도윤', '하은', '시우', '수아', '주원', '지호', '예린', '현우', '채원', '준서', '다은', '건우', '유나', '태윤', '소율', '은우', '가은'];
const NAMES = Array.from({ length: 80 }, (_, i) => SUR[(i * 7 + 3) % SUR.length] + GIV[(i * 11 + Math.floor(i / 20) * 7 + 5) % GIV.length]); // 가상 이름
export function gradSample(): ModeVideoProps {
  const m = 'grad', M = MODES.grad, labels = ['1학년', '2학년', '3학년'], E = 'education', Sc = 'school';
  // 2024.03 ~ 2027.02 (36개월) 월별 사진 수: 실제로는 촬영 날짜에서 집계한다
  const counts = [96, 38, 124, 30, 22, 8, 41, 66, 28, 35, 12, 14, 44, 182, 60, 34, 26, 10, 48, 236, 52, 40, 18, 16, 58, 36, 70, 30, 24, 12, 64, 88, 46, 62, 38, 148];
  return { mode: m, colors: colors(m), bug: 'CLASS OF 2027', intro: M.intro, introPhoto: P(Sc, 1),
    opening: [{ dur: 128, beat: { kind: 'timeline', kicker: 'THREE YEARS', title: '3년의 기록', unit: '장', counts, bands: [{ label: '1학년 · 2024', from: 0, to: 11 }, { label: '2학년 · 2025', from: 12, to: 23 }, { label: '3학년 · 2026', from: 24, to: 35 }], marks: [{ i: 0, label: '입학식' }, { i: 2, label: '체육대회' }, { i: 13, label: '수학여행' }, { i: 19, label: '축제' }, { i: 35, label: '졸업식' }] } }],
    chapters: [
      { style: 'slow', card: M.card,
        photos: [ph(L(Sc, 1), false, '2024.03.04', '입학식', 'D+1'), ph(L(m, 1), false, '2024.04.12'), ph(P(E, 1), true, '2024.05.03'), ph(P(m, 1), true, '2024.05.17'), ph(L(Sc, 3), false, '2024.05.17', '체육대회', 'D+75'), ph(L(E, 2), false, '2024.10.24')] },
      { style: 'steady', card: { index: '02 / 03', big: '2학년', small: '2025 · 가장 뜨거웠던 여름', meta: [{ v: '766장', l: '사진' }, { v: '수학여행 · 축제', l: '주요 행사' }, { v: 'D+366 – D+730', l: '함께한 날' }], rail: { type: 'segments', labels, active: 1 } },
        photos: [ph(L('journey', 1), false, '2025.04.23', '수학여행', 'D+416 · 제주'), ph(L('journey', 2), false, '2025.04.24'), ph(P('journey', 1), true, '2025.04.24'), ph(P('journey', 2), true, '2025.04.25'), ph(L('club', 1), false, '2025.10.17', '한빛제', 'D+593'), ph(L('club', 2), false, '2025.10.17'), ph(L(m, 3), false, '2025.11.06')] },
      { style: 'slow', card: { index: '03 / 03', big: '3학년', small: '2026 · 마지막 교실', meta: [{ v: '676장', l: '사진' }, { v: '졸업 사진 · 졸업식', l: '주요 행사' }, { v: 'D+731 – D+1,076', l: '함께한 날' }], rail: { type: 'segments', labels, active: 2 } },
        photos: [ph(L(E, 3), false, '2026.03.03', '3학년 첫날', 'D+730'), ph(P(E, 2), true, '2026.06.12'), ph(P(m, 2), true, '2026.09.18'), ph(L(m, 2), false, '2026.10.08', '졸업 사진 촬영', 'D+949'), ph(L(E, 5), false, '2026.12.23'), ph(L(m, 4), false, '2027.02.12', '졸업식', 'D+1,076')],
        beat: M.beat, beatPhotos: [P(m, 3)] },
    ],
    closing: [{ dur: 178, beat: { kind: 'names', kicker: 'CLASS OF 2027', title: '졸업생', sub: '제42회 · 248명 중 일부', names: NAMES } }],
    outro: M.outro };
}
