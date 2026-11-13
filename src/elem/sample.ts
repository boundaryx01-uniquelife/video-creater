import type { PhotoSpec } from '../analysis/videoData.ts';
import type { ElemProps } from './types.ts';

const L = (m: string, n: number) => `media/${m}_L${n}.jpg`, P = (m: string, n: number) => `media/${m}_P${n}.jpg`;
const ph = (src: string, port: boolean, time: string, title = '', sub = ''): PhotoSpec => ({ src, aspect: port ? 0.75 : 1.5, time, date: '', wd: '', hex: '#888', exif: '', model: '', fy: 0.42, fx: 0.5, cap: { chip: time, title, sub } });

/** 가상 데이터(실제 학교·학생 정보 없음) */
export function elemSample(): ElemProps {
  const E = 'education', S = 'school', R = 'recap';
  return {
    school: '새싹초등학교', klass: '3학년 2반', kicker: '2026 봄', title: '현장체험학습\n박물관 나들이', day: '2026.05.14 (목)', place: '국립중앙박물관',
    introPhotos: [L(E, 1), P(E, 1), L(S, 2)],
    chapters: [
      { title: '박물관 도착!', sub: '오전 10:00 – 11:30',
        photos: [ph(L(E, 1), false, '10:05', '모두 모였어요', '출발 전 단체 사진'), ph(P(E, 1), true, '10:20', '두근두근'), ph(P(E, 2), true, '10:25', '입장 줄'), ph(L(E, 2), false, '10:40', '옛날 물건을 찾아요', '선사 시대 관'), ph(L(E, 3), false, '11:05'), ph(P(E, 3), true, '11:15', '반짝반짝 금관'), ph(L(E, 4), false, '11:25', '해설 선생님 말씀 쫑긋')],
        quote: { text: '금관이 진짜 반짝반짝해서\n깜짝 놀랐어요!', name: '김하늘' } },
      { title: '냠냠 점심시간', sub: '낮 12:00 – 13:00',
        photos: [ph(L(S, 2), false, '12:05', '도시락 열어요', '엄마가 싸 준 김밥'), ph(L(S, 3), false, '12:15'), ph(P(S, 1), true, '12:20', '김밥 한 입'), ph(P(S, 2), true, '12:30', '나눠 먹기'), ph(L(S, 4), false, '12:45', '배불러요')] },
      { title: '우리가 만든 작품', sub: '오후 13:30 – 15:00',
        photos: [ph(L(R, 1), false, '13:35', '토기 빚기 체험', '손으로 조물조물'), ph(P(R, 1), true, '13:50', '내 거 먼저!'), ph(P(R, 2), true, '14:00', '완성!'), ph(L(R, 2), false, '14:20'), ph(L(R, 3), false, '14:40', '다 같이 모여서', '친구들과 함께'), ph(P(R, 3), true, '14:50', '또 오고 싶어요')],
        quote: { text: '친구들이랑 같이 만들어서\n더 재미있었어요.', name: '이준서' } },
    ],
    stats: [{ label: '함께한 친구들', n: 28, unit: '명' }, { label: '관람한 전시관', n: 5, unit: '곳' }, { label: '남긴 사진', n: 18, unit: '장' }],
    outro: { title: '오늘도\n수고했어요!', message: '박물관에서 배운 것을 교실에서 이야기해 봐요.\n함께해 주신 선생님과 부모님께 감사드립니다.' },
  };
}
