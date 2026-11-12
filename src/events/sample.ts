import type { PhotoSpec } from '../analysis/videoData.ts';
import type { EventProps, EventSession } from './types.ts';

const L = (kind: string, n: number) => `media/event_${kind}_L${n}.jpg`, P = (kind: string, n: number) => `media/event_${kind}_P${n}.jpg`;
const mk = (src: string, port: boolean, time: string, accent: string, cap?: PhotoSpec['cap']): PhotoSpec => ({ src, aspect: port ? 0.75 : 1.78, time, date: '2026.11.12', wd: '목', hex: accent, exif: '', model: '', fy: 0.4, fx: 0.5, cap });
const T = (chip: string, title = '', sub = '') => ({ chip, title, sub });

/** 가상의 행사(개인정보·실제 사진 없음)로 만든 샘플 입력 */
export function eventSample(): EventProps {
  const ac = '#ff5a3c';
  const s = (agenda: number, title: string, speaker: string, role: string, room: string, attendees: number, style: EventSession['style'], photos: PhotoSpec[]): EventSession => ({ agenda, title, speaker, role, room, attendees, style, photos });
  return {
    info: { kicker: 'KOREA TECH SUMMIT', name: '2026 테크 서밋', tagline: '새로운 연결, 다음 기준', date: '2026-11-12', dateLabel: '2026.11.12 (목)', venue: '서울 코엑스 그랜드볼룸', attendees: '1,240명', bug: 'TECH SUMMIT 2026' },
    colors: { accent: ac, ink: '#14163f', light: '#f4ece6', onAccent: '#ffffff' },
    introPhoto: L('keynote', 1),
    agenda: [
      { start: '09:00', end: '10:00', title: '등록 & 네트워킹', speaker: '로비', room: 'Lobby' },
      { start: '10:00', end: '11:00', title: '다음 10년의 기술', speaker: '정민호 · CEO', room: 'Main Hall', highlight: true },
      { start: '11:30', end: '12:30', title: 'AI와 일의 미래', speaker: '이수진 외 3인 · 패널', room: 'Room A', highlight: true },
      { start: '12:30', end: '14:00', title: '점심 · 네트워킹', speaker: '', room: 'Sky Lounge' },
      { start: '14:30', end: '15:30', title: '데이터가 만드는 제품', speaker: '김서연 · CDO', room: 'Room B', highlight: true },
      { start: '15:30', end: '16:30', title: '플랫폼 보안의 새 기준', speaker: '박도현 · CISO', room: 'Room C' },
      { start: '16:30', end: '18:00', title: '체험 존 · 스타트업 데모', speaker: '24개 부스', room: 'Hall C', highlight: true },
      { start: '18:00', end: '20:00', title: '네트워킹 파티', speaker: '', room: 'Sky Lounge' },
    ],
    sessions: [
      s(1, '다음 10년의 기술', '정민호', 'CEO · 키노트', 'Main Hall', 1100, 'slow', [
        mk(L('keynote', 1), false, '10:02', ac, T('10:02', '다음 10년의 기술', '정민호 · CEO')), mk(L('keynote', 2), false, '10:14', ac, T('10:14')), mk(P('keynote', 1), true, '10:21', ac, T('10:21')), mk(P('keynote', 2), true, '10:23', ac, T('10:23')),
        mk(L('keynote', 3), false, '10:35', ac, T('10:35', '"기술은 사람의 가능성을 넓힙니다"', '정민호 · CEO')), mk(P('keynote', 3), true, '10:48', ac, T('10:48')), mk(L('keynote', 4), false, '10:55', ac, T('10:55'))]),
      s(2, 'AI와 일의 미래', '이수진 외 3인', '패널 토론', 'Room A', 420, 'steady', [
        mk(L('panel', 1), false, '11:32', ac, T('11:32', 'AI와 일의 미래', '이수진 외 3인 · 패널')), mk(L('panel', 2), false, '11:44', ac, T('11:44')), mk(P('panel', 1), true, '11:51', ac, T('11:51')), mk(P('panel', 2), true, '11:52', ac, T('11:52')),
        mk(L('panel', 3), false, '12:05', ac, T('12:05', '청중 질의응답', '현장 투표 · 312명 참여')), mk(L('panel', 4), false, '12:20', ac, T('12:20'))]),
      s(4, '데이터가 만드는 제품', '김서연', '최고데이터책임자', 'Room B', 312, 'steady', [
        mk(L('session', 1), false, '14:31', ac, T('14:31', '데이터가 만드는 제품', '김서연 · CDO')), mk(P('session', 1), true, '14:44', ac, T('14:44', '실시간 지표로 제품을 고치다', '김서연 · CDO')), mk(L('session', 2), false, '14:58', ac, T('14:58')),
        mk(P('session', 2), true, '15:06', ac, T('15:06')), mk(P('session', 3), true, '15:07', ac, T('15:07')), mk(L('session', 3), false, '15:22', ac, T('15:22'))]),
      s(6, '체험 존 · 스타트업 데모', '24개 부스', '스타트업 데모', 'Hall C', 640, 'fast', [
        mk(L('expo', 1), false, '16:34', ac, T('16:34', '체험 존 오픈', '24개 부스 · Hall C')), mk(L('expo', 2), false, '16:41', ac, T('16:41')), mk(L('expo', 3), false, '16:48', ac, T('16:48')), mk(L('expo', 4), false, '16:55', ac, T('16:55')),
        mk(P('expo', 1), true, '17:02', ac, T('17:02')), mk(P('expo', 2), true, '17:03', ac, T('17:03')), mk(L('network', 1), false, '17:30', ac, T('17:30', '네트워킹', 'Sky Lounge'))]),
    ],
    quote: { text: '"기술은 사람을 대체하지 않습니다.\n사람의 가능성을 넓힙니다."', speaker: '정민호', role: 'CEO · 키노트', photo: P('keynote', 1) },
    stats: [{ n: 1240, l: '참석자' }, { n: 18, l: '세션' }, { n: 24, l: '연사' }, { n: 36, l: '전시 부스' }], statsPhoto: P('expo', 1),
    outro: { title: '감사합니다', rows: [{ k: '다음 행사', v: '2027.11 · 서울' }, { k: '발표 자료', v: 'summit.example.com' }, { k: '문의', v: 'hello@summit.example.com' }] },
  };
}
