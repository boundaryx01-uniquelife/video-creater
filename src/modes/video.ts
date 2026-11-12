import type { ChapterSpec, PhotoSpec } from '../analysis/videoData.ts';
import { planFlow } from '../analysis/videoData.ts';
import type { Beat, ModeSpec, Outro } from './config.ts';

/** 업무 모드 공통 영상 입력: 인트로 → (챕터 카드 → 사진 플로우 → 데이터 장면) × N → 아웃트로 */
export type ModeChapter = { card: ModeSpec['card']; photos: PhotoSpec[]; style: 'fast' | 'steady' | 'slow'; beat?: Beat; beatPhotos?: string[] };
export type ExtraScene = { beat: Beat; photos?: string[]; dur?: number };
export type ModeVideoProps = {
  mode: string; colors: { accent: string; light: string; ink: string; onAccent: string }; bug: string;
  intro: ModeSpec['intro']; introPhoto: string; opening?: ExtraScene[]; chapters: ModeChapter[]; closing?: ExtraScene[]; outro: Outro;
};
export const M_INTRO = 126, M_CARD = 84, M_BEAT = 104, M_OUTRO = 130;
export const baseSpec = (p: ModeVideoProps): ModeSpec => ({ id: p.mode, name: '', use: '', data: [], ...p.colors, intro: p.intro, card: p.chapters[0].card, beat: p.chapters[0].beat ?? { kind: 'lower', chip: '', title: '', sub: '' }, outro: p.outro });
export const chapterSpec = (p: ModeVideoProps, i: number): ChapterSpec => { const c = p.chapters[i]; return { index: i, total: p.chapters.length, big: c.card.big, small: c.card.small, kicker: '', meta: [], accent: p.colors.accent, onAccent: p.colors.onAccent, light: p.colors.light, fromDay: 0, toDay: 0, style: c.style, photos: c.photos, matchCut: c.photos[0].aspect >= 1.2 }; };
export type MScene = { type: 'intro' | 'card' | 'flow' | 'beat' | 'open' | 'close' | 'outro'; from: number; dur: number; i?: number };
export function planMode(p: ModeVideoProps): { scenes: MScene[]; total: number } {
  const sc: MScene[] = []; let f = 0; const add = (type: MScene['type'], dur: number, i?: number) => { sc.push({ type, from: f, dur, i }); f += dur; };
  add('intro', M_INTRO); (p.opening ?? []).forEach((x, i) => add('open', x.dur ?? M_BEAT, i)); p.chapters.forEach((c, i) => { add('card', M_CARD, i); add('flow', planFlow(chapterSpec(p, i)).total, i); if (c.beat) add('beat', M_BEAT, i); }); (p.closing ?? []).forEach((x, i) => add('close', x.dur ?? M_BEAT, i)); add('outro', M_OUTRO);
  return { scenes: sc, total: f };
}
