import type { DataIntroProps } from './introData.ts';

export type PhotoSpec = { src: string; aspect: number; time: string; date: string; wd: string; hex: string; exif: string; model: string; fy: number; fx: number; cap?: { chip: string; title: string; sub: string }; ts?: number };
export type ChapterSpec = {
  index: number; total: number; big: string; small: string; kicker: string; meta: { v: string; l: string }[];
  accent: string; light: string; fromDay: number; toDay: number; style: 'fast' | 'steady' | 'slow';
  onAccent?: string;
  photos: PhotoSpec[]; // photos[0] = 챕터 대표(매치컷), 이후 시간순
  matchCut: boolean;   // 대표가 가로형이면 풀스크린으로 펼쳐지는 매치컷
};
export type OutroData = { photos: number; days: number; regions: number; chapters: number; hours: number[]; peakHour: number; busiest: string; busiestCount: number; device: string; deviceCount: number; title: string; range: string };
export type VideoProps = { intro: DataIntroProps; chapters: ChapterSpec[]; outro: OutroData };

/* ---------- 영상 계획 (프레임) ---------- */
export const FPS = 30, INTRO = 150, CARD = 84, OUTRO = 150, OV = 10, TAIL = 26, MAX_FLOW = 190;
export type Enter = 'none' | 'wipeUp' | 'wipeLeft' | 'push' | 'zoom';
export type Beat = { kind: 'full' | 'pair' | 'editorial' | 'grid'; photos: PhotoSpec[]; from: number; len: number; dur: number; enter: Enter; seed: number };

const rnd = (seed: number) => { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const portrait = (p?: PhotoSpec) => !!p && p.aspect < 0.9;

export function planFlow(ch: ChapterSpec): { beats: Beat[]; total: number } {
  const r = rnd(ch.index * 97 + 13);
  const spp = Math.round(FPS * (ch.style === 'fast' ? 0.8 : ch.style === 'steady' ? 1.15 : 1.7));
  const enters: Enter[] = ['wipeUp', 'push', 'zoom', 'wipeLeft'];
  const beats: Beat[] = []; let i = 0, cursor = 0; const ph = ch.photos;
  while (i < ph.length && cursor < MAX_FLOW - 20) {
    const p = ph[i], q = ph[i + 1]; let kind: Beat['kind'], n = 1, dur = spp;
    if (!beats.length) { kind = ch.matchCut ? 'full' : 'editorial'; dur = Math.round(spp * 1.25); }
    else if (portrait(p) && portrait(q)) { kind = 'pair'; n = 2; dur = Math.round(spp * 1.3); }
    else if (ch.style === 'fast' && ph.length - i >= 4 && beats.length % 2 === 1) { kind = 'grid'; n = 4; dur = Math.round(spp * 2.4); }
    else if (portrait(p)) { kind = 'editorial'; dur = Math.round(spp * 1.4); }
    else kind = 'full';
    dur = Math.max(26, dur);
    const enter: Enter = beats.length ? enters[(Math.floor(r() * 4) + beats.length) % enters.length] : 'none';
    beats.push({ kind, photos: ph.slice(i, i + n), from: beats.length ? cursor - OV : 0, len: dur + (beats.length ? OV : 0) + TAIL, dur, enter, seed: Math.floor(r() * 1e6) });
    cursor += dur; i += n;
  }
  if (beats.length) beats[beats.length - 1].len += 8; // 퇴장 와이프 동안 마지막 컷 유지(검은 화면 방지)
  return { beats, total: cursor + 8 };
}

export type Scene = { type: 'intro' | 'card' | 'flow' | 'outro'; from: number; dur: number; ch?: number };
export function planVideo(p: VideoProps): { scenes: Scene[]; total: number } {
  const scenes: Scene[] = [{ type: 'intro', from: 0, dur: INTRO }]; let f = INTRO;
  p.chapters.forEach((ch, i) => { scenes.push({ type: 'card', from: f, dur: CARD, ch: i }); f += CARD; const fl = planFlow(ch).total; scenes.push({ type: 'flow', from: f, dur: fl, ch: i }); f += fl; });
  scenes.push({ type: 'outro', from: f, dur: OUTRO }); return { scenes, total: f + OUTRO };
}
