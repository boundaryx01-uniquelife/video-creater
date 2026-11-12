import type { Photo, RawPhoto, Episode, Story, Swatch } from './types.ts';

const HOUR = 60, DAY = 1440;
const wall = (s: string) => Date.parse(s.length === 19 ? s + 'Z' : s) / 60000;
const iso = (t: number) => new Date(t * 60000).toISOString().slice(0, 19);

/* ---------- 유틸 ---------- */
const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
export const hamming = (a?: string, b?: string) => { if (!a || !b || a.length !== b.length) return 64; let d = 0; for (let i = 0; i < a.length; i++) d += POP[parseInt(a[i], 16) ^ parseInt(b[i], 16)]; return d; };
const km = (a: Photo, b: { lat: number; lon: number }) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.latitude!) * r, dLo = (b.lon - a.longitude!) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude! * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function hsl(h: string) { const [r, g, b] = hex2rgb(h).map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let hh = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = (hh * 60 + 360) % 360; } return { h: hh, s, l }; }
const toHex2 = (h: number, s: number, l: number) => { const a = s * Math.min(l, 1 - l); const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return rgb2hex([f(0) * 255, f(8) * 255, f(4) * 255]); };
const pct = (arr: number[]) => { const s = [...arr].sort((a, b) => a - b); return (v: number) => { let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < v) lo = m + 1; else hi = m; } return s.length > 1 ? lo / (s.length - 1) : 0.5; }; };
const season = (t: number) => { const m = new Date(t * 60000).getUTCMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; };
const todOf = (t: number) => { const h = new Date(t * 60000).getUTCHours(); return h < 5 ? 'night' : h < 8 ? 'dawn' : h < 11 ? 'morning' : h < 16 ? 'day' : h < 19 ? 'golden' : h < 21 ? 'evening' : 'night'; };

/* ---------- 1. 정규화 + 품질 점수 ---------- */
export function normalize(raw: RawPhoto[]): { dated: Photo[]; undated: RawPhoto[] } {
  const ok = raw.filter((p) => !p.decodeFailed || p.DateTimeOriginal);
  const dated = ok.filter((p) => p.timeSource === 'exif' || p.timeSource === 'exif-create');
  const undated = ok.filter((p) => !dated.includes(p));
  const sharpR = pct(dated.map((p) => Math.log10(1 + (p.sharpness ?? 0))));
  const ps: Photo[] = dated.map((p) => {
    const t = wall(p.DateTimeOriginal ?? (p as any).CreateDate);
    const sharp = sharpR(Math.log10(1 + (p.sharpness ?? 0)));
    const expo = Math.max(0, 1 - Math.abs((p.brightness ?? 0.5) - 0.5) * 1.8);
    const sat = Math.min(1, (p.saturation ?? 0.3) * 1.4);
    const res = Math.min(1, ((p.width ?? 1000) * (p.height ?? 1000)) / 8e6);
    return { ...p, t, score: +(0.5 * sharp + 0.25 * expo + 0.15 * sat + 0.1 * res).toFixed(4) };
  });
  ps.sort((a, b) => a.t - b.t || a.id - b.id);
  return { dated: ps, undated };
}

/* ---------- 2. 연사/유사컷 그룹 ---------- */
export function groupBursts(ps: Photo[]) {
  let g = 0; const reps: number[] = [];
  ps.forEach((p, i) => {
    const prev = ps[i - 1]; const gap = prev ? (p.t - prev.t) : 1e9;
    const same = prev && ((gap <= 0.2 && hamming(prev.dhash, p.dhash) <= 20) || (gap <= 2 && hamming(prev.dhash, p.dhash) <= 16) || (gap <= 10 && hamming(prev.dhash, p.dhash) <= 9));
    if (!same) g++; p.group = g;
  });
  const best = new Map<number, Photo>();
  ps.forEach((p) => { const b = best.get(p.group!); if (!b || p.score > b.score) best.set(p.group!, p); });
  best.forEach((p) => reps.push(p.id));
  return { groups: g, reps: new Set(reps) };
}

/* ---------- 3. 장소 클러스터 ---------- */
export function clusterPlaces(ps: Photo[], radiusKm = 3) {
  const cl: { id: number; lat: number; lon: number; n: number }[] = [];
  for (const p of ps) {
    if (p.latitude == null) continue;
    let best: (typeof cl)[number] | undefined, bd = 1e9;
    for (const c of cl) { const d = km(p, c); if (d < bd) { bd = d; best = c; } }
    if (best && bd <= radiusKm) { best.lat = (best.lat * best.n + p.latitude) / (best.n + 1); best.lon = (best.lon * best.n + p.longitude!) / (best.n + 1); best.n++; p.place = best.id; }
    else { const c = { id: cl.length, lat: p.latitude, lon: p.longitude!, n: 1 }; cl.push(c); p.place = c.id; }
  }
  // GPS 없는 사진은 앞뒤 30분 이내 GPS 사진의 장소를 상속
  ps.forEach((p, i) => { if (p.place != null) return; for (let d = 1; d < 6; d++) for (const q of [ps[i - d], ps[i + d]]) if (q && q.place != null && Math.abs(q.t - p.t) <= 30) { p.place = q.place; p.placeInferred = true; return; } });
  return cl;
}

/* ---------- 4. 챕터: 사진이 몰린 날(이벤트) + 나머지는 월별 모음 ---------- */
export function splitChapters(ps: Photo[], minEventGroups = 8): { chapters: Photo[][]; kinds: ('event' | 'roundup')[]; scraps: Photo[] } {
  const byDay = new Map<number, Photo[]>(); ps.forEach((p) => { const d = Math.floor(p.t / DAY); (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(p); });
  const days = [...byDay.keys()].sort((a, b) => a - b); const clusters: Photo[][] = []; let cur: Photo[] = [], last = -9;
  for (const d of days) { if (d - last > 1 && cur.length) { clusters.push(cur); cur = []; } cur.push(...byDay.get(d)!); last = d; }
  if (cur.length) clusters.push(cur);
  const groupsOf = (e: Photo[]) => new Set(e.map((p) => p.group)).size;
  const chapters: Photo[][] = [], kinds: ('event' | 'roundup')[] = []; const rest: Photo[] = [];
  for (const c of clusters) groupsOf(c) >= minEventGroups ? (chapters.push(c), kinds.push('event')) : rest.push(...c);
  const byMonth = new Map<string, Photo[]>(); rest.forEach((p) => { const k = iso(p.t).slice(0, 7); (byMonth.get(k) ?? byMonth.set(k, []).get(k)!).push(p); });
  const scraps: Photo[] = [];
  [...byMonth.values()].forEach((m) => (groupsOf(m) >= 4 ? (chapters.push(m), kinds.push('roundup')) : scraps.push(...m)));
  const order = chapters.map((c, i) => i).sort((a, b) => chapters[a][0].t - chapters[b][0].t);
  return { chapters: order.map((i) => chapters[i]), kinds: order.map((i) => kinds[i]), scraps };
}

/* ---------- 5. 팔레트 ---------- */
function globalSwatches(ps: Photo[]) { const g: Swatch[] = []; for (const p of ps) for (const c of p.palette ?? []) { const k = hex2rgb(c.hex); const n = g.find((s) => { const r = hex2rgb(s.hex); return Math.hypot(r[0] - k[0], r[1] - k[1], r[2] - k[2]) < 50; }); if (n) n.weight += c.share; else g.push({ hex: c.hex, weight: c.share }); } const t = g.reduce((a, s) => a + s.weight, 0) || 1; g.forEach((s) => (s.weight /= t)); return g; }
function paletteOf(ps: Photo[], glob: Swatch[]) {
  const sw: Swatch[] = []; let warm = 0, wsum = 0, br = 0;
  for (const p of ps) {
    br += (p.brightness ?? 0.5) * p.score;
    for (const c of p.palette ?? []) {
      const w = c.share * (0.4 + p.score); const k = hex2rgb(c.hex);
      const near = sw.find((s) => { const r = hex2rgb(s.hex); return Math.hypot(r[0] - k[0], r[1] - k[1], r[2] - k[2]) < 40; });
      if (near) { const r = hex2rgb(near.hex), t = near.weight + w; near.hex = rgb2hex(r.map((v, i) => (v * near.weight + k[i] * w) / t)); near.weight = t; } else sw.push({ hex: c.hex, weight: w });
      const h = hsl(c.hex); if (h.s > 0.2) { warm += w * Math.cos(((h.h - 30) * Math.PI) / 180); wsum += w; }
    }
  }
  const tot = sw.reduce((a, s) => a + s.weight, 0) || 1; sw.sort((a, b) => b.weight - a.weight);
  // 액센트: 채도가 있고 너무 어둡거나 밝지 않으면서 비중이 있는 색
  const lift = (h: string) => { const c = hsl(h); return c.l < 0.34 ? toHex2(c.h, Math.max(c.s, 0.35), 0.5) : h; };
  const distinct = (s: Swatch) => { const k = hex2rgb(s.hex); const g = glob.filter((x) => { const r = hex2rgb(x.hex); return Math.hypot(r[0] - k[0], r[1] - k[1], r[2] - k[2]) < 60; }).reduce((a, x) => a + x.weight, 0); const c = hsl(s.hex); const skin = c.h >= 8 && c.h <= 40 && c.s > 0.18 && c.s < 0.7 && c.l > 0.35 && c.l < 0.85 ? 0.35 : 1; return c.s * Math.sqrt(s.weight) / (1 + 8 * g) * (c.l > 0.25 && c.l < 0.8 ? 1 : 0.3) * skin; };
  const isSky = (h: string) => { const c = hsl(h); return c.h >= 185 && c.h <= 240 && c.l > 0.5 && c.s > 0.25; };
  const cand = sw.filter((s) => hsl(s.hex).s > 0.3 && hsl(s.hex).l > 0.2 && hsl(s.hex).l < 0.85 && !isSky(s.hex)).sort((a, b) => distinct(b) - distinct(a));
  const mode: 'vivid' | 'muted' = cand.length ? 'vivid' : 'muted';
  const muted = sw.filter((s) => { const c = hsl(s.hex); return c.l > 0.3 && c.l < 0.75 && c.s > 0.06 && !isSky(s.hex); }).sort((a, b) => b.weight - a.weight)[0] ?? sw.filter((s) => hsl(s.hex).l > 0.3 && hsl(s.hex).l < 0.8)[0];
  const accent = lift((cand[0] ?? muted ?? sw[0] ?? { hex: '#bbbbbb' }).hex); const ah = hsl(accent);
  // 배경색: 액센트 색상각을 따르는 아주 어두운/밝은 중립색
  return { mode, accent, dark: toHex2(ah.h, 0.25, 0.07), light: toHex2(ah.h, 0.2, 0.94), swatches: sw.slice(0, 6).map((s) => ({ hex: s.hex, weight: +(s.weight / tot).toFixed(3) })), warmth: +(wsum ? warm / wsum : 0).toFixed(2), brightness: +(br / Math.max(1e-9, ps.reduce((a, p) => a + p.score, 0))).toFixed(2) };
}

/* ---------- 6. 대표컷 선택 (품질 + 다양성) ---------- */
function pickBest(ps: Photo[], reps: Set<number>, n: number, requireThumb = false): number[] {
  const pool = ps.filter((p) => reps.has(p.id) && (!requireThumb || p.thumb)).sort((a, b) => b.score - a.score); const sel: Photo[] = [];
  for (const p of pool) {
    if (sel.length >= n) break;
    if (sel.every((s) => hamming(s.dhash, p.dhash) > 14 || Math.abs(s.t - p.t) > 20)) sel.push(p);
  }
  return sel.sort((a, b) => a.t - b.t).map((p) => p.id);
}

/* ---------- 메인 ---------- */
export function analyze(raw: RawPhoto[], opts: { maxPicks?: number; maxChapters?: number; requireThumb?: boolean } = {}): { story: Story; photos: Photo[] } {
  const { dated, undated } = normalize(raw);
  const { groups, reps } = groupBursts(dated);
  const places = clusterPlaces(dated);
  const { chapters, kinds, scraps } = splitChapters(dated);
  const glob = globalSwatches(dated.filter((p) => reps.has(p.id)));
  const imp = chapters.map((e) => new Set(e.map((p) => p.group)).size * (0.6 + e.reduce((a, p) => a + p.score, 0) / e.length));
  const K = opts.maxChapters ?? 8; const top = new Set(imp.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]).slice(0, K).map((x) => x[1]));
  const episodes: Episode[] = chapters.map((e, i) => {
    const gs = new Set(e.map((p) => p.group)), burst = e.length ? 1 - gs.size / e.length : 0;
    const days = new Set(e.map((p) => Math.floor(p.t / DAY))).size;
    const tod: Record<string, number> = {}; e.forEach((p) => { const k = todOf(p.t); tod[k] = (tod[k] ?? 0) + 1; });
    for (const k in tod) tod[k] = +(tod[k] / e.length).toFixed(2);
    const pc: Record<number, number> = {}; e.forEach((p) => p.place != null && (pc[p.place] = (pc[p.place] ?? 0) + 1));
    const pl = Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ id: +id, share: +(n / e.length).toFixed(2), lat: places[+id].lat, lon: places[+id].lon }));
    const picks = pickBest(e, reps, opts.maxPicks ?? Math.min(14, Math.max(4, Math.round(Math.sqrt(gs.size) * 1.6))), opts.requireThumb);
    const hero = ([...e].filter((p) => reps.has(p.id) && (!opts.requireThumb || p.thumb))[0] ? [...e].filter((p) => reps.has(p.id) && (!opts.requireThumb || p.thumb)) : [...e].filter((p) => reps.has(p.id))).sort((a, b) => b.score - a.score)[0].id;
    const spanH = Math.max(1, (e[e.length - 1].t - e[0].t) / HOUR), perH = e.length / Math.min(spanH, 10 * days);
    const style = kinds[i] === 'event' && perH > 8 ? 'fast' : perH > 3 ? 'steady' : 'slow';
    const from = iso(e[0].t), to = iso(e[e.length - 1].t);
    return {
      id: i, from, to, days, season: season(e[Math.floor(e.length / 2)].t), photos: e.length, groups: gs.size, timeOfDay: tod,
      portraitShare: +(e.filter((p) => (p.aspect ?? 1) < 1).length / e.length).toFixed(2), places: pl, hero, picks, palette: paletteOf(e.filter((p) => reps.has(p.id)), glob),
      rhythm: { style, secondsPerPhoto: style === 'fast' ? 0.7 : style === 'steady' ? 1.2 : 1.8, burstShare: +burst.toFixed(2) },
      kind: kinds[i], importance: +imp[i].toFixed(1), suggested: top.has(i), label: kinds[i] === 'event' ? (days > 1 ? `${from.slice(5, 10)}~${to.slice(5, 10)}` : from.slice(5, 10)) : `${from.slice(0, 7)} 모음`,
    };
  });
  const cams: Record<string, number> = {}; dated.forEach((p) => { const k = `${p.Make ?? ''} ${p.Model ?? ''}`.trim() || 'unknown'; cams[k] = (cams[k] ?? 0) + 1; });
  const gsc = (dated.filter((p) => p.latitude != null).length) / dated.length;
  const heroPhoto = dated.find((p) => p.id === (episodes.filter((e) => e.suggested).sort((x, y) => y.importance - x.importance)[0]?.hero));
  const story: Story = {
    summary: { photos: raw.length, dated: dated.length, undated: undated.length, groups, episodes: episodes.length, scraps: scraps.length, from: iso(dated[0].t), to: iso(dated[dated.length - 1].t), cameras: cams, portraitShare: +(dated.filter((p) => (p.aspect ?? 1) < 1).length / dated.length).toFixed(2), gpsShare: +gsc.toFixed(2) },
    hero: heroPhoto?.id ?? dated[0].id, episodes, undated: undated.map((p) => p.id), places: places.map((c) => ({ id: c.id, lat: +c.lat.toFixed(4), lon: +c.lon.toFixed(4), count: c.n })),
  };
  return { story, photos: dated };
}
