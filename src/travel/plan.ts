import type { ChapterSpec } from '../analysis/videoData.ts';
import { planFlow } from '../analysis/videoData.ts';
import { MODES, ModeSpec } from '../modes/config.ts';
import { MODE_DUR, MODE_LABEL } from './geo.ts';
import type { Leg, TravelProps } from './types.ts';

export const T_INTRO = 150, T_CARD = 84, T_OUTRO = 190;
const fmtMin = (m: number) => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? `${h}시간 ${String(mm).padStart(2, '0')}분` : `${mm}분`; };
export function stopChapter(p: TravelProps, legs: Leg[], i: number): ChapterSpec {
  const s = p.stops[legs[i].b];
  return { index: i, total: legs.length, big: s.name, small: s.sub, kicker: '', meta: [], accent: p.colors.accent, light: p.colors.light, fromDay: 0, toDay: 0, style: 'steady', photos: s.photos, matchCut: s.photos[0].aspect >= 1.2 };
}
export function stopCardSpec(p: TravelProps, legs: Leg[], i: number): ModeSpec {
  const l = legs[i], s = p.stops[l.b], base = MODES.journey;
  return { ...base, accent: p.colors.accent, light: p.colors.light, ink: p.colors.ink, card: { index: `도착 ${String(i + 1).padStart(2, '0')} / ${String(legs.length).padStart(2, '0')}`, big: s.name, small: s.sub,
    meta: [{ v: `${l.km >= 10 ? Math.round(l.km).toLocaleString() : l.km.toFixed(1)} km`, l: MODE_LABEL[l.mode] }, { v: fmtMin(l.min), l: '소요 시간' }, { v: `${Math.round(l.speed)} km/h`, l: '평균 속도' }],
    rail: { type: 'route', stops: p.stops.map((x) => (x.name.length > 5 ? x.name.split(' ')[0] : x.name)), active: l.b } } };
}
export type TScene = { type: 'intro' | 'leg' | 'card' | 'flow' | 'outro'; from: number; dur: number; i?: number };
export function planTravel(p: TravelProps, legs: Leg[]): { scenes: TScene[]; total: number } {
  const sc: TScene[] = []; let f = 0; const add = (type: TScene['type'], dur: number, i?: number) => { sc.push({ type, from: f, dur, i }); f += dur; };
  add('intro', T_INTRO);
  legs.forEach((l, i) => { add('leg', MODE_DUR[l.mode], i); add('card', T_CARD, i); add('flow', planFlow(stopChapter(p, legs, i)).total, i); });
  add('outro', T_OUTRO); return { scenes: sc, total: f };
}
