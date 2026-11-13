import type { Photo } from '../analysis/types.ts';
import type { PhotoSpec } from '../analysis/videoData.ts';
import type { LL, Stop, TravelProps } from './types.ts';
import { km } from './geo.ts';

export type PlaceLite = { n: string; lon: number; lat: number; pop: number; tz: string };
/** attachNoGps: GPS 없이 촬영 시각만 있는 사진을, 머문 시간(앞뒤 10분) 안에 찍힌 정차지의 사진 후보에 넣는다(기본 꺼짐) */
export type FromPhotosOpts = { radiusKm?: number; minPhotos?: number; minDwellMin?: number; maxStops?: number; photosPerStop?: number; attachNoGps?: boolean; srcOf: (p: Photo) => string | null };
type Cl = { ps: Photo[]; lon: number; lat: number; extra?: Photo[] };

const z2 = (n: number) => String(n).padStart(2, '0');
const D = (t: number) => new Date(t * 60000);
const wall = (t: number) => { const d = D(t); return `${d.getUTCFullYear()}-${z2(d.getUTCMonth() + 1)}-${z2(d.getUTCDate())}T${z2(d.getUTCHours())}:${z2(d.getUTCMinutes())}`; };
const hm = (t: number) => { const d = D(t); return `${z2(d.getUTCHours())}:${z2(d.getUTCMinutes())}`; };
const centroid = (c: Cl) => { c.lon = c.ps.reduce((s, p) => s + p.longitude!, 0) / c.ps.length; c.lat = c.ps.reduce((s, p) => s + p.latitude!, 0) / c.ps.length; return c; };
const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
const dirOf = (a: LL, b: LL) => DIRS[Math.round((((Math.atan2((b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180), b[1] - a[1]) * 180) / Math.PI + 360) % 360) / 45) % 8];

/** 좌표 → 가까운 도시 이름(오프라인). 12km 안에서는 큰 도시 우선, 35km 안이면 가장 가까운 도시, 80km 안이면 "근교" */
export function nameOf(lon: number, lat: number, places: PlaceLite[]): { name: string; tz: string; exact: boolean } {
  let near: PlaceLite | null = null, nd = 1e9, big: PlaceLite | null = null, bs = 0;
  // 35km 안에서는 "인구 ÷ (거리+5km)²" 점수가 가장 높은 도시(가깝고 큰 도시)를 고른다
  for (const p of places) { if (Math.abs(p.lat - lat) > 1.2 || Math.abs(p.lon - lon) > 2) continue; const d = km([lon, lat], [p.lon, p.lat]); if (d < nd) { nd = d; near = p; } const sc = (p.pop + 1e4) / (d + 5) ** 2; if (d <= 35 && sc > bs) { bs = sc; big = p; } }
  if (big) return { name: big.n, tz: big.tz, exact: true };
  if (near && nd <= 35) return { name: near.n, tz: near.tz, exact: true };
  if (near && nd <= 80) return { name: `${near.n} 근교`, tz: near.tz, exact: false };
  return { name: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`, tz: near?.tz ?? '', exact: false };
}

/** 사진(GPS·촬영 시각·품질 점수) → 여행 정차지와 영상 기본 정보. 이름은 자동 추정이므로 사용자가 고칠 수 있어야 한다 */
export function travelFromPhotos(photos: Photo[], places: PlaceLite[], o: FromPhotosOpts): { info: TravelProps['info']; stops: Stop[]; dropped: { noGps: number; transit: number; attached: number }; cruise: number[]; candidates: PhotoSpec[][] } {
  const R = o.radiusKm ?? 3, minN = o.minPhotos ?? 3, minDwell = o.minDwellMin ?? 20, maxStops = o.maxStops ?? 7, per = o.photosPerStop ?? 6;
  const gp = photos.filter((p) => p.latitude != null && p.longitude != null && !p.placeInferred).sort((a, b) => a.t - b.t);
  // 1) 시간순으로 훑으며 반경 R을 벗어나면 새 묶음
  let cls: Cl[] = [];
  for (const p of gp) { const c = cls[cls.length - 1]; if (c && km([c.lon, c.lat], [p.longitude!, p.latitude!]) <= R) { c.ps.push(p); centroid(c); } else cls.push(centroid({ ps: [p], lon: 0, lat: 0 })); }
  // 2) 이동 중에 찍힌 소수의 사진(머문 시간이 짧은 묶음)은 정차지에서 제외
  const before = cls.length; let transit = 0;
  cls = cls.filter((c) => { const keep = c.ps.length >= minN || c.ps[c.ps.length - 1].t - c.ps[0].t >= minDwell; if (!keep) transit += c.ps.length; return keep; });
  // 3) 인접한 묶음이 다시 가까워졌으면 합치고, 너무 많으면 가장 가까운 이웃끼리 합친다
  const merge = (i: number) => { cls[i].ps.push(...cls[i + 1].ps); centroid(cls[i]); cls.splice(i + 1, 1); };
  for (let i = 0; i < cls.length - 1; ) if (km([cls[i].lon, cls[i].lat], [cls[i + 1].lon, cls[i + 1].lat]) <= R) merge(i); else i++;
  while (cls.length > maxStops) { let bi = 0, bd = 1e9; for (let i = 0; i < cls.length - 1; i++) { const d = km([cls[i].lon, cls[i].lat], [cls[i + 1].lon, cls[i + 1].lat]); if (d < bd) { bd = d; bi = i; } } merge(bi); }
  void before;
  // 3.5) GPS 없는 사진: 어느 정차지의 머문 시간(앞뒤 10분)에 찍혔다면 그 정차지의 사진 후보로
  let attached = 0;
  if (o.attachNoGps) for (const p of photos.filter((q) => q.latitude == null || q.longitude == null)) {
    const c = cls.find((x) => p.t >= x.ps[0].t - 10 && p.t <= x.ps[x.ps.length - 1].t + 10); if (c) { (c.extra ??= []).push(p); attached++; } }
  // 4) 이름·시각·사진 선택
  const seen = new Map<string, LL>(), cand: PhotoSpec[][] = [];
  const stops: Stop[] = cls.map((c) => {
    const nm = nameOf(c.lon, c.lat, places); let name = nm.name; const first = seen.get(nm.name);
    if (first) { const d = km(first, [c.lon, c.lat]); if (d > 1) name = `${nm.name} ${dirOf(first, [c.lon, c.lat])}쪽 ${d < 10 ? d.toFixed(1) : Math.round(d)}km`; } else seen.set(nm.name, [c.lon, c.lat]);
    const t0 = c.ps[0].t, t1 = c.ps[c.ps.length - 1].t, d0 = D(t0);
    const sub = `${d0.getUTCMonth() + 1}월 ${d0.getUTCDate()}일 · 사진 ${c.ps.length + (c.extra?.length ?? 0)}장`;
    const pool = c.extra ? [...c.ps, ...c.extra] : c.ps, best = new Map<number, Photo>(); for (const p of pool) { if (!o.srcOf(p)) continue; const g = p.group ?? p.id, b = best.get(g); if (!b || p.score > b.score) best.set(g, p); }
    const top = [...best.values()].sort((a, b) => b.score - a.score).slice(0, per), hero = top.find((p) => (p.aspect ?? 1) >= 1.2) ?? top[0];
    const ordered = hero ? [hero, ...top.filter((p) => p !== hero).sort((a, b) => a.t - b.t)] : [];
    const specs: PhotoSpec[] = ordered.map((p, i) => ({ src: o.srcOf(p)!, aspect: p.aspect ?? 1.5, time: hm(p.t), date: '', wd: '', hex: '#ff6b4a', exif: '', model: String(p.Model ?? ''), fy: 0.42, fx: 0.5, cap: { chip: hm(p.t), title: i === 0 ? name : '', sub: i === 0 ? sub : '' } }));
    cand.push(pool.filter((p) => o.srcOf(p)).sort((a, b) => a.t - b.t).map((p) => ({ src: o.srcOf(p)!, aspect: p.aspect ?? 1.5, time: hm(p.t), date: '', wd: '', hex: '#ff6b4a', exif: '', model: String(p.Model ?? ''), fy: 0.42, fx: 0.5, cap: { chip: hm(p.t), title: '', sub: '' }, ts: p.t * 60000 })));
    return { name, sub, lat: +c.lat.toFixed(5), lon: +c.lon.toFixed(5), arrive: wall(t0), depart: wall(t1), tz: nm.tz || undefined, photos: specs };
  });
  const a = D(gp[0]?.t ?? 0), b = D(gp[gp.length - 1]?.t ?? 0), days = gp.length ? Math.floor(Math.max(...gp.map((p) => p.t)) / 1440) - Math.floor(Math.min(...gp.map((p) => p.t)) / 1440) + 1 : 0; // 사진이 있는 날 수가 아니라 첫날~마지막 날의 달력상 일수
  const main = [...stops].map((s, i) => ({ s, i, n: cls[i].ps.length })).sort((x, y) => y.n - x.n).slice(0, 2).sort((x, y) => x.i - y.i).map((x) => x.s.name.split(' ')[0]);
  const info = { kicker: 'TRAVEL LOG', title: `${[...new Set(main)].join(' · ')}\n${days <= 1 ? '당일 여행' : `${days - 1}박 ${days}일`}`, sub: stops.length ? `${stops[0].name}에서 ${stops[stops.length - 1].name}까지` : '', range: `${a.getUTCFullYear()}.${z2(a.getUTCMonth() + 1)}.${z2(a.getUTCDate())} – ${z2(b.getUTCMonth() + 1)}.${z2(b.getUTCDate())}` };
  // 구간별 순항 속도 힌트: 이동 중에 찍힌 사진까지 포함해, 연속한 두 GPS 사진 사이(5km 이상)의 최고 속도
  const cruise = cls.slice(0, -1).map((c, i) => { const t0 = c.ps[c.ps.length - 1].t, t1 = cls[i + 1].ps[0].t, seq = gp.filter((p) => p.t >= t0 && p.t <= t1); let v = 0;
    for (let k = 1; k < seq.length; k++) { const d = km([seq[k - 1].longitude!, seq[k - 1].latitude!], [seq[k].longitude!, seq[k].latitude!]), dt = (seq[k].t - seq[k - 1].t) / 60; if (d >= 5 && dt > 0.02) v = Math.max(v, d / dt); } return Math.round(v); });
  return { info, stops, dropped: { noGps: photos.length - gp.length, transit, attached }, cruise, candidates: cand };
}
