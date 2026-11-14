import type { PhotoSpec } from '../analysis/videoData.ts';
import type { AudioSpec } from '../audio/spec.ts';

/** 초등학교 활동 기록 영상(현장체험학습·운동회·학예회·공개수업·학급 행사 등) 입력 */
export type ElemChapter = {
  title: string;           // 예) 경복궁 관람
  sub: string;             // 예) 오전 10:00 – 12:00
  photos: PhotoSpec[];     // 사진 한 장마다 cap.title(한 줄 자막)을 넣을 수 있다
  quote?: { text: string; name: string }; // 친구·선생님 한마디(선택)
};
export type ElemProps = {
  school: string;          // 한빛초등학교
  klass: string;           // 3학년 2반 (없으면 빈 문자열)
  kicker: string;          // 2026 봄
  title: string;           // 현장체험학습 (줄바꿈 \n 가능)
  day: string;             // 2026.05.14 (목)
  place: string;           // 국립중앙박물관
  introPhotos: string[];   // 최대 3장(없으면 챕터 사진으로 채운다)
  chapters: ElemChapter[];
  stats?: { label: string; n: number; unit: string }[];
  outro: { title: string; message: string };
  outroPhotos?: string[];  // 마무리 장면에 놓을 사진(최대 3장). 없으면 처음·가운데·마지막 사진
  pace?: number;           // 장면 길이 배율(0.7 빠르게 ~ 1.5 천천히, 기본 1)
  theme?: string;          // 색 테마 이름(THEMES 참고, 기본 sunny)
  audio?: AudioSpec;
};

export type ElemScene =
  | { type: 'intro'; from: number; dur: number }
  | { type: 'title'; from: number; dur: number; ci: number }
  | { type: 'page'; from: number; dur: number; ci: number; photos: number[] }  // 사진 번호(챕터 안)
  | { type: 'quote'; from: number; dur: number; ci: number }
  | { type: 'stats'; from: number; dur: number }
  | { type: 'outro'; from: number; dur: number };

export const E = { intro: 135, title: 66, single: 78, pair: 90, trio: 102, quote: 96, stats: 108, outro: 140 };

/** 색 테마: 같은 디자인에서 색만 바뀐다. pal은 활동(챕터)마다 돌아가며 쓰는 색 */
export type ElemTheme = { name: string; label: string; pal: string[]; paper: string; sun: string; ink: string };
export const THEMES: Record<string, ElemTheme> = {
  sunny: { name: 'sunny', label: '해님(노랑·코랄)', pal: ['#ff6b57', '#1fb58a', '#3d9bff', '#8f6bff', '#ff9f1c'], paper: '#fff5e1', sun: '#ffcf4a', ink: '#2a2440' },
  mint: { name: 'mint', label: '새싹(초록·민트)', pal: ['#1fb58a', '#3d9bff', '#ff8a5b', '#8f6bff', '#e9b30c'], paper: '#f1f8e9', sun: '#b9e769', ink: '#1f3a2e' },
  sky: { name: 'sky', label: '하늘(파랑)', pal: ['#3d9bff', '#1fb58a', '#ff6b57', '#8f6bff', '#ff9f1c'], paper: '#eef6ff', sun: '#8fd3ff', ink: '#1d2b4d' },
  berry: { name: 'berry', label: '딸기(분홍·보라)', pal: ['#ff5d8f', '#8f6bff', '#ff9f1c', '#1fb58a', '#3d9bff'], paper: '#fff0f3', sun: '#ffc2d4', ink: '#3a1f3d' },
  autumn: { name: 'autumn', label: '단풍(주황·갈색)', pal: ['#e8662b', '#c98b13', '#2b8a6e', '#b5485f', '#5b6ee1'], paper: '#fff3e0', sun: '#ffc46b', ink: '#3b2a1c' },
};
export const themeOf = (p: { theme?: string }) => THEMES[p.theme ?? ''] ?? THEMES.sunny;
export const clampPace = (v: unknown) => Math.max(0.7, Math.min(1.5, Number(v) || 1));

/** 사진을 한 화면(한 장·두 장·세 장)씩 묶는다: 세로 사진 둘은 짝으로, 4번째 화면마다 3장 콜라주, 그 밖에는 변화를 주려고 가끔 2장 */
export function pagesOf(photos: PhotoSpec[]): number[][] {
  const out: number[][] = []; let i = 0, k = 0; const n = photos.length;
  while (i < n) {
    const port = (j: number) => photos[j].aspect < 1;
    if (k % 4 === 3 && n - i >= 3) { out.push([i, i + 1, i + 2]); i += 3; }
    else if (n - i >= 2 && port(i) && port(i + 1)) { out.push([i, i + 1]); i += 2; }
    else if (n - i >= 2 && k % 3 === 1) { out.push([i, i + 1]); i += 2; }
    else { out.push([i]); i += 1; }
    k++;
  }
  return out;
}

export function planElem(p: ElemProps): { scenes: ElemScene[]; total: number } {
  const scenes: ElemScene[] = []; let t = 0, k = clampPace(p.pace);
  const add = (s: ElemScene) => { s = { ...s, dur: Math.max(24, Math.round(s.dur * k)) } as ElemScene; scenes.push(s); t += s.dur; };
  add({ type: 'intro', from: t, dur: E.intro });
  p.chapters.forEach((c, ci) => {
    add({ type: 'title', from: t, dur: E.title, ci });
    for (const g of pagesOf(c.photos)) add({ type: 'page', from: t, dur: g.length === 1 ? E.single : g.length === 2 ? E.pair : E.trio, ci, photos: g });
    if (c.quote?.text) add({ type: 'quote', from: t, dur: E.quote, ci });
  });
  if (p.stats?.length) add({ type: 'stats', from: t, dur: E.stats });
  add({ type: 'outro', from: t, dur: E.outro });
  return { scenes, total: t };
}
