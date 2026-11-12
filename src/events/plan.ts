import type { ChapterSpec } from '../analysis/videoData.ts';
import { planFlow } from '../analysis/videoData.ts';
import type { ModeSpec } from '../modes/config.ts';
import type { EventProps, EventSession } from './types.ts';

export const E_INTRO = 135, E_AGENDA = 130, E_CARD = 84, E_QUOTE = 105, E_STATS = 120, E_OUTRO = 120;

export const hm = (t: string) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };

export function sessionChapter(p: EventProps, s: EventSession, i: number, at?: number): ChapterSpec {
  const a = p.agenda[s.agenda];
  return { index: i, total: p.sessions.length, big: a.start, small: s.title, kicker: '', meta: [], accent: p.colors.accent, light: p.colors.light, fromDay: 0, toDay: 0, style: s.style, photos: s.photos, matchCut: s.photos[0].aspect >= 1.2, ...(p.audio ? { audio: p.audio, at } : {}) };
}

export function introSpec(p: EventProps): ModeSpec {
  const c = p.colors, i = p.info;
  return { id: 'event', name: '', use: '', data: [], accent: c.accent, light: c.light, ink: c.ink, onAccent: c.onAccent,
    intro: { layout: 'photo', kicker: i.kicker, title: i.name, sub: i.tagline, chips: [{ k: '일시', v: i.dateLabel }, { k: '장소', v: i.venue }, { k: '참석', v: i.attendees }] },
    card: { index: '', big: '', small: '', meta: [], rail: { type: 'segments', labels: [], active: 0 } }, beat: { kind: 'lower', chip: '', title: '', sub: '' }, outro: { title: '', sub: '', rows: [] } };
}
export function cardSpec(p: EventProps, s: EventSession, i: number): ModeSpec {
  const a = p.agenda[s.agenda], c = p.colors; const base = introSpec(p);
  return { ...base, card: { index: `하이라이트 ${String(i + 1).padStart(2, '0')} / ${String(p.sessions.length).padStart(2, '0')}`, big: a.start, small: s.title, meta: [{ v: s.speaker, l: s.role }, { v: s.room, l: '장소' }, { v: `${s.attendees.toLocaleString()}명`, l: '참석' }],
    rail: { type: 'time', from: Math.floor(hm(p.agenda[0].start)), to: Math.ceil(hm(p.agenda[p.agenda.length - 1].end)), blocks: p.agenda.map((x) => [hm(x.start), hm(x.end)] as [number, number]), active: s.agenda, label: `${a.start} — ${a.end}` } }, accent: c.accent };
}
export function outroSpec(p: EventProps): ModeSpec {
  const base = introSpec(p);
  return { ...base, outro: { title: p.outro.title, sub: p.info.name, rows: p.outro.rows, extra: 'sponsors' } };
}

export type EScene = { type: 'intro' | 'agenda' | 'card' | 'flow' | 'quote' | 'stats' | 'outro'; from: number; dur: number; i?: number };
export function planEvent(p: EventProps): { scenes: EScene[]; total: number } {
  const sc: EScene[] = []; let f = 0; const add = (type: EScene['type'], dur: number, i?: number) => { sc.push({ type, from: f, dur, i }); f += dur; };
  add('intro', E_INTRO); add('agenda', E_AGENDA);
  p.sessions.forEach((s, i) => { add('card', E_CARD, i); add('flow', planFlow(sessionChapter(p, s, i, f)).total, i); });
  add('quote', E_QUOTE); add('stats', E_STATS); add('outro', E_OUTRO);
  return { scenes: sc, total: f };
}
