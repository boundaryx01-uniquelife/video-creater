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

/** 사진 화면의 배치 종류 */
export type Layout = 'single' | 'full' | 'pair' | 'stack' | 'trio' | 'grid' | 'strip';
export const LAYOUT_KO: Record<Layout, string> = { single: '한 장+자막', full: '꽉 찬 한 장', pair: '두 장', stack: '두 장 겹치기', trio: '세 장', grid: '네 장 모자이크', strip: '필름 띠' };

export type ElemScene =
  | { type: 'intro'; from: number; dur: number }
  | { type: 'title'; from: number; dur: number; ci: number }
  | { type: 'page'; from: number; dur: number; ci: number; photos: number[]; layout: Layout }  // 사진 번호(챕터 안)
  | { type: 'quote'; from: number; dur: number; ci: number }
  | { type: 'stats'; from: number; dur: number }
  | { type: 'outro'; from: number; dur: number };

export const E = { intro: 135, title: 66, quote: 96, stats: 108, outro: 140 };
/** 배치별 화면 길이(프레임, 30fps). 띠는 사진 1장마다 길어진다 */
export const PAGE_DUR: Record<Layout, (n: number) => number> = { single: () => 84, full: () => 84, pair: () => 90, stack: () => 96, trio: () => 102, grid: () => 108, strip: (n) => 96 + n * 12 };

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

/**
 * 사진을 화면 단위로 묶고 배치를 고른다. 같은 배치가 연달아 나오지 않게 순서를 돌리되, 챕터마다 시작점을 달리해 챕터끼리도 다르게 보이게 한다.
 * - 자막이 있는 사진은 크게 보이는 배치(한 장+자막 또는 꽉 찬 한 장)에 둔다
 * - 세로 사진 둘이 이어지면 두 장 배치
 * - 남은 장수가 모자라면 더 작은 배치로 바꾼다
 */
export type PageGroup = { idx: number[]; layout: Layout };
const CYCLE: Layout[] = ['full', 'pair', 'single', 'strip', 'stack', 'trio', 'grid'];
const NEED: Record<Layout, number> = { single: 1, full: 1, pair: 2, stack: 2, trio: 3, grid: 4, strip: 4 };
export function pagesOf(photos: PhotoSpec[], ci = 0): PageGroup[] {
  const out: PageGroup[] = []; const n = photos.length; let i = 0, k = (ci * 3) % CYCLE.length, prev: Layout | null = null;
  const capd = (j: number) => !!photos[j]?.cap?.title, port = (j: number) => (photos[j]?.aspect ?? 1.5) < 1, wide = (j: number) => (photos[j]?.aspect ?? 1.5) >= 1.25;
  while (i < n) {
    const left = n - i; let lay: Layout;
    if (capd(i)) lay = wide(i) && prev !== 'full' ? 'full' : 'single';
    else if (left >= 2 && port(i) && port(i + 1) && !capd(i + 1)) lay = prev === 'pair' ? 'stack' : 'pair';
    else {
      lay = CYCLE[k % CYCLE.length]; k++;
      let guard = 0;
      while ((NEED[lay] > left || lay === prev || (lay === 'full' && !wide(i)) || (NEED[lay] > 1 && Array.from({ length: NEED[lay] - 1 }, (_, d) => capd(i + 1 + d)).some(Boolean))) && guard++ < CYCLE.length) { lay = CYCLE[k % CYCLE.length]; k++; }
      if (NEED[lay] > left || (lay === 'full' && !wide(i))) lay = left >= 2 && !capd(i + 1) ? 'pair' : 'single';
    }
    let take = NEED[lay];
    if (lay === 'strip') take = Math.min(left, 5, Math.max(4, left >= 7 ? 4 : left)); // 띠는 4–5장(남은 사진이 애매하면 한꺼번에)
    out.push({ idx: Array.from({ length: take }, (_, d) => i + d), layout: lay }); i += take; prev = lay;
  }
  return out;
}

export function planElem(p: ElemProps): { scenes: ElemScene[]; total: number } {
  const scenes: ElemScene[] = []; let t = 0; const k = clampPace(p.pace);
  // 음악에 박자 정보가 있으면 장면 길이를 박자의 배수로 맞춰 컷이 박자에 떨어지게 한다(음원은 0초에 첫 박이 오도록 만들어져 있어야 한다)
  const beat = p.audio?.syncCuts && p.audio.bpm && p.audio.bpm >= 40 && p.audio.bpm <= 240 && !(p.audio.startFromSec || p.audio.beatOffsetSec) ? (30 * 60) / p.audio.bpm : 0;
  const snap = (d: number) => { if (!beat) return d; const end = t + d, kk = Math.max(1, Math.round(end / beat)); return Math.max(Math.round(beat), Math.round(kk * beat) - t); };
  const add = (s: ElemScene) => { const d = snap(Math.max(24, Math.round(s.dur * k))); s = { ...s, from: t, dur: d } as ElemScene; scenes.push(s); t += d; };
  add({ type: 'intro', from: t, dur: E.intro });
  p.chapters.forEach((c, ci) => {
    add({ type: 'title', from: t, dur: E.title, ci });
    for (const g of pagesOf(c.photos, ci)) add({ type: 'page', from: t, dur: PAGE_DUR[g.layout](g.idx.length), ci, photos: g.idx, layout: g.layout });
    if (c.quote?.text) add({ type: 'quote', from: t, dur: E.quote, ci });
  });
  if (p.stats?.length) add({ type: 'stats', from: t, dur: E.stats });
  add({ type: 'outro', from: t, dur: E.outro });
  return { scenes, total: t };
}
