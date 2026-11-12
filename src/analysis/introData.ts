import type { Photo, Story } from './types.ts';

export type DataIntroProps = {
  title: string; subtitle: string; range: string; mode: 'light' | 'dark'; accent: string;
  spanDays: number; startMonth: { y: number; m: number; day: number }[]; // 월 눈금: 해당 월 1일의 day index
  points: { day: number; h: number; hex: string; s: number; i: number }[];
  chapters: { from: number; to: number; accent: string; photos: number; suggested: boolean }[];
  busiest: { day: number; hour: number; count: number; label: string };
  stats: { n: number; label: string }[];
  hero: { src: string; fx: number; fy: number; day: number; h: number; label: string };
};

const DAY = 1440;
const hsl = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; return { s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l }; };

const toRgb = (h: number, s: number, l: number) => { const a = s * Math.min(l, 1 - l); const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); }; return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join(''); };
const hue = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d) return 0; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };

/** 사진 고유의 색(색상은 유지)을 종이 배경에서 또렷하게 보이도록 채도·명도만 보정 */
export function dotColor(p: Photo): string {
  const pal = p.palette ?? []; let best = '', bs = -1;
  for (const c of pal) { const { s, l } = hsl(c.hex); if (l > 0.9 || l < 0.1) continue; const v = (s + 0.2) * Math.sqrt(c.share + 0.02); if (v > bs) { bs = v; best = c.hex; } }
  if (!best) return '#6b6b6b';
  const { s, l } = hsl(best);
  return s < 0.08 ? toRgb(0, 0, 0.36) : toRgb(hue(best), Math.min(0.88, Math.max(0.42, s * 1.4 + 0.12)), Math.min(0.6, Math.max(0.4, l)));
}

/** 가장 큰 시간 군집만 사용 (120일 이상 떨어진 옛 사진 등 이상치 제외) */
export function mainCluster(ps: Photo[]): Photo[] {
  const s = [...ps].sort((a, b) => a.t - b.t); const cl: Photo[][] = []; let cur: Photo[] = [];
  s.forEach((p, i) => { if (i && p.t - s[i - 1].t > 120 * DAY) { cl.push(cur); cur = []; } cur.push(p); }); cl.push(cur);
  return cl.sort((a, b) => b.length - a.length)[0];
}

export function buildDataIntro(all: Photo[], story: Story, o: { title?: string; mode?: 'light' | 'dark'; hero: { src: string; fx: number; fy: number; id: number } }): DataIntroProps {
  const ps = mainCluster(all); const t0 = ps[0].t, tN = ps[ps.length - 1].t; const day0 = Math.floor(t0 / DAY);
  const dayOf = (t: number) => Math.floor(t / DAY) - day0;
  const points = ps.map((p, i) => ({ day: dayOf(p.t), h: (p.t % DAY) / 60, hex: dotColor(p), s: Math.min(1, Math.max(0, p.score)), i }));
  const perDay = new Map<number, number[]>(); points.forEach((p) => (perDay.get(p.day) ?? perDay.set(p.day, []).get(p.day)!).push(p.h));
  const [bd, bh] = [...perDay.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const med = [...bh].sort((a, b) => a - b)[Math.floor(bh.length / 2)];
  const bdate = new Date((day0 + bd) * DAY * 60000);
  const lo = (t: number) => t / DAY - day0;
  const chapters = story.episodes.map((e) => ({ from: Math.floor(Date.parse(e.from + 'Z') / 60000 / DAY) - day0, to: Math.floor(Date.parse(e.to + 'Z') / 60000 / DAY) - day0, accent: e.palette.accent, photos: e.photos, suggested: e.suggested })).filter((c) => c.from >= 0 && c.to <= dayOf(tN));
  const months: DataIntroProps['startMonth'] = []; const d0 = new Date(day0 * DAY * 60000);
  for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1; ; ) { const day = Math.floor(Date.UTC(y, m - 1, 1) / 60000 / DAY) - day0; if (day > dayOf(tN)) break; if (day >= 0) months.push({ y, m, day }); m++; if (m > 12) { m = 1; y++; } }
  const days = perDay.size; const a = new Date(t0 * 60000), b = new Date(tN * 60000); const f = (d: Date) => `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const cell = new Map<string, number>(); ps.forEach((p) => p.latitude != null && !p.placeInferred && cell.set(`${p.latitude.toFixed(1)},${p.longitude!.toFixed(1)}`, (cell.get(`${p.latitude.toFixed(1)},${p.longitude!.toFixed(1)}`) ?? 0) + 1));
  const regions = Math.max(1, [...cell.values()].filter((n) => n >= 3).length);
  const bch = chapters.filter((c) => c.suggested).sort((x, y) => y.photos - x.photos)[0];
  return {
    title: o.title ?? `${days}일의 기록`, subtitle: '', range: `${f(a)} — ${f(b)}`, mode: o.mode ?? 'light', accent: bch?.accent ?? '#e2553a',
    spanDays: Math.max(1, dayOf(tN)), startMonth: months, points, chapters,
    busiest: { day: bd, hour: med, count: bh.length, label: `${String(bdate.getUTCMonth() + 1).padStart(2, '0')}.${String(bdate.getUTCDate()).padStart(2, '0')}` },
    stats: [{ n: ps.length, label: '장의 사진' }, { n: regions, label: '개 지역' }],
    hero: (() => { const hp = ps.find((q) => q.id === o.hero.id) ?? ps[0]; const d = new Date(hp.t * 60000); const z = (n: number) => String(n).padStart(2, '0'); return { src: o.hero.src, fx: o.hero.fx, fy: o.hero.fy, day: dayOf(hp.t), h: (hp.t % DAY) / 60, label: `${d.getUTCFullYear()}.${z(d.getUTCMonth() + 1)}.${z(d.getUTCDate())} · ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}` }; })(),
  };
}
