import { geoOrthographic, geoPath, geoInterpolate, geoDistance, geoGraticule, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';
import land50 from 'world-atlas/land-50m.json';
import land10 from 'world-atlas/land-10m.json';
import type { Leg, LL, Mode, TravelProps } from './types.ts';

export const EARTH = 6371, RAD = Math.PI / 180;
export const MODE_COLOR: Record<Mode, string> = { plane: '#ff6b4a', train: '#f2b134', car: '#3cc4b0', walk: '#b8a4ff', ship: '#4aa8ff', bike: '#9bd65b' };
export const MODE_LABEL: Record<Mode, string> = { plane: '비행기', train: '기차', car: '자동차', walk: '도보', ship: '배', bike: '자전거' };
export const MODE_DUR: Record<Mode, number> = { plane: 160, train: 132, car: 120, walk: 104, ship: 132, bike: 110 };

/* ---------- 거리·경로 ---------- */
export const km = (a: LL, b: LL) => geoDistance(a, b) * EARTH;
const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

let land110F: any = null;
/** A→B 직선(대권) 중 바다 위 비율 (0~1) */
export function waterFraction(A: LL, B: LL, n = 14): number {
  if (!land110F) { const t: any = land110; land110F = feature(t, t.objects.land); }
  const gi = geoInterpolate(A, B); let w = 0;
  for (let i = 1; i <= n; i++) if (!geoContains(land110F, gi(i / (n + 1)))) w++;
  return w / n;
}
/** 이동수단 추정 규칙: 사진 GPS·촬영 시각에서 나온 거리·평균 속도·바다 비율만 사용. 틀리면 modeOverride로 고친다 */
export function inferMode(dist: number, minutes: number, water = 0): Mode {
  const v = dist / Math.max(1 / 60, minutes / 60);
  if (dist >= 400 && v >= 110) return 'plane';
  if (water > 0.5 && dist > 25) return v >= 110 ? 'plane' : 'ship';
  if (dist >= 40 && v >= 100) return 'train';
  if (v >= 8) return 'car';
  return 'walk';
}

/** 모드별 경로 모양. 도로망 데이터가 없으므로 비행기는 대권(그레이트서클), 나머지는 매끄러운 곡선으로 표현 */
export function makePath(A: LL, B: LL, mode: Mode, seed: number): LL[] {
  const n = mode === 'plane' || mode === 'ship' ? 160 : 180, gi = geoInterpolate(A, B), rnd = mulberry(seed * 7919 + 3), ph = rnd() * 6;
  const amp = mode === 'plane' ? 0 : mode === 'ship' ? 0.015 : mode === 'train' ? 0.02 : mode === 'car' || mode === 'bike' ? 0.05 : 0.075;
  const lat0 = (A[1] + B[1]) / 2, dx = (B[0] - A[0]) * Math.cos(lat0 * RAD), dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1e-9;
  const px = -dy / len, py = dx / len;   // 진행 방향의 수직(단위)
  const pts: LL[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = gi(t), env = Math.pow(Math.sin(Math.PI * t), 0.8);
    const o = amp * len * env * (Math.sin(t * Math.PI * (mode === 'walk' ? 4 : 2) + ph) * 0.8 + 0.35 * Math.sin(t * Math.PI * 7 + ph * 2));
    pts.push([p[0] + (px * o) / Math.cos(lat0 * RAD), p[1] + py * o]);
  }
  return pts;
}
export function cumulative(path: LL[]) { const c = [0]; for (let i = 1; i < path.length; i++) c.push(c[i - 1] + km(path[i - 1], path[i])); return c; }

export const wallMin = (s: string) => Date.parse(s.length === 16 ? s + ':00Z' : s + 'Z') / 60000;
/** IANA 시간대의 UTC 오프셋(분). 현지 벽시계 시각(wall, 분) 기준 */
export function tzOffsetMin(tz: string | undefined, wall: number): number {
  if (!tz) return 0;
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const at = (utc: number) => { const o: any = {}; for (const p of f.formatToParts(new Date(utc * 60000))) o[p.type] = +p.value; return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute) / 60000 - utc; };
    return at(wall - at(wall));
  } catch { return 0; }
}
/** 정차지 목록에서 이동 구간 계산(브라우저에서도 동작하는 기본 버전: 경로는 곡선). 빌드 스크립트는 여기에 실제 도로 경로를 덮어쓴다 */
export function buildLegs(p: TravelProps): Leg[] {
  const legs: Leg[] = [];
  for (let i = 0; i < p.stops.length - 1; i++) {
    const a = p.stops[i], b = p.stops[i + 1], A: LL = [a.lon, a.lat], B: LL = [b.lon, b.lat];
    const t0 = wallMin(a.depart ?? a.arrive), t1 = wallMin(b.arrive);
    const dist = km(A, B), min = Math.max(1, (t1 - tzOffsetMin(b.tz, t1)) - (t0 - tzOffsetMin(a.tz, t0)));
    const mode = p.modeOverride?.[i] ?? inferMode(dist, min, waterFraction(A, B)), path = makePath(A, B, mode, i + 1);
    legs.push({ a: i, b: i + 1, mode, km: dist, straightKm: dist, min, speed: dist / (min / 60), path, cum: cumulative(path), t0, t1, routed: false });
  }
  return legs;
}
/** props에 미리 계산된 legs가 있으면 그것을, 없으면 기본 계산을 사용 */
export const legsOf = (p: TravelProps): Leg[] => (p.legs?.length ? p.legs.map((l) => ({ ...l, cum: cumulative(l.path) })) : buildLegs(p));
/** 경로 진행률 u(0~1, 길이 기준) 위치와 진행 방향 */
export function pointAt(l: Leg, u: number): { p: LL; i: number; ahead: LL } {
  const tot = l.cum[l.cum.length - 1], d = Math.max(0, Math.min(1, u)) * tot; let i = 1; while (i < l.cum.length - 1 && l.cum[i] < d) i++;
  const k = (d - l.cum[i - 1]) / Math.max(1e-9, l.cum[i] - l.cum[i - 1]), a = l.path[i - 1], b = l.path[i];
  return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], i, ahead: l.path[Math.min(l.path.length - 1, i + 2)] };
}

/* ---------- 지도(육지 폴리곤) ---------- */
type Poly = { b: [number, number, number, number]; c: number[][][] };
const cache = new Map<string, Poly[]>();
function polys(res: '110' | '50' | '10'): Poly[] {
  if (cache.has(res)) return cache.get(res)!;
  const topo: any = res === '110' ? land110 : res === '50' ? land50 : land10;
  const f: any = feature(topo, topo.objects.land), g = f.features ? f.features.map((x: any) => x.geometry) : [f.geometry], out: Poly[] = [];
  for (const geo of g) for (const poly of geo.type === 'MultiPolygon' ? geo.coordinates : [geo.coordinates]) {
    let x0 = 999, y0 = 999, x1 = -999, y1 = -999; for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    out.push({ b: [x0, y0, x1, y1], c: poly });
  }
  cache.set(res, out); return out;
}
export function makeProj(center: LL, R: number, tx: number, ty: number) {
  return geoOrthographic().rotate([-center[0], -center[1]]).scale(R).translate([tx, ty]).clipAngle(90).precision(0.7);
}
export function landPath(proj: ReturnType<typeof makeProj>, center: LL, R: number, diag: number): string {
  const res = R < 1300 ? '110' : R < 12000 ? '50' : '10', r = Math.min(Math.PI / 2, (diag / R) * 0.62), dlat = r / RAD, dlon = Math.min(180, dlat / Math.max(0.05, Math.cos(center[1] * RAD)));
  const sel = polys(res).filter((p) => r >= Math.PI / 2 - 1e-6 || (p.b[2] >= center[0] - dlon && p.b[0] <= center[0] + dlon && p.b[3] >= center[1] - dlat && p.b[1] <= center[1] + dlat));
  return geoPath(proj)({ type: 'MultiPolygon', coordinates: sel.map((p) => p.c) } as any) ?? '';
}
const STEPS = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30];
export function graticulePath(proj: ReturnType<typeof makeProj>, center: LL, R: number, diag: number): string {
  const want = 150 / R / RAD, step = STEPS.find((s) => s >= want) ?? 30, r = Math.min(Math.PI / 2, (diag / R) * 0.62), dlat = r / RAD, dlon = Math.min(180, dlat / Math.max(0.05, Math.cos(center[1] * RAD)));
  const g = geoGraticule().step([step, step]).extent([[Math.max(-180, center[0] - dlon), Math.max(-90, center[1] - dlat)], [Math.min(180, center[0] + dlon), Math.min(90, center[1] + dlat)]]);
  return geoPath(proj)(g()) ?? '';
}
export const linePath = (proj: ReturnType<typeof makeProj>, pts: LL[]) => (pts.length < 2 ? '' : geoPath(proj)({ type: 'LineString', coordinates: pts } as any) ?? '');
export const slerp = (a: LL, b: LL, t: number): LL => geoInterpolate(a, b)(t) as LL;

/* ---------- 기울인 지도(CSS 3D)에서 지도 좌표 → 화면 좌표 ---------- */
export const PERSP = 1500;
export function toScreen(x: number, y: number, W: number, H: number, tilt: number, cx: number, cy: number) {
  const th = tilt * RAD, dy = y - cy, dx = x - cx, z = dy * Math.sin(th), s = 1 / (1 - z / PERSP);
  return { x: W / 2 + dx * s, y: H / 2 + dy * Math.cos(th) * s, s };
}

/** 정사영 역변환(빠른 버전): 레이어 좌표 → [lon, lat] 또는 null */
export function invOrtho(x: number, y: number, lon0: number, sin0: number, cos0: number, R: number, tx: number, ty: number): LL | null {
  const X = (x - tx) / R, Y = -(y - ty) / R, r2 = X * X + Y * Y; if (r2 >= 1) return null;
  const cc = Math.sqrt(1 - r2);
  return [lon0 + Math.atan2(X, cc * cos0 - Y * sin0) / RAD, Math.asin(cc * sin0 + Y * cos0) / RAD];
}
