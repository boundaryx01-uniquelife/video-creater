// OpenStreetMap 거리 데이터(Overpass API). 라이선스 ODbL: 영상에 "© OpenStreetMap contributors" 표기 필요. 응답은 data/osm 에 캐시.
// 공개 Overpass 서버는 가벼운 사용만 허용하므로, 도보·자전거처럼 좁은 범위에만 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { geoDistance } from 'd3-geo';
import type { LL } from '../../src/travel/types.ts';
import type { BBox } from './ne.ts';
import { resample } from './routing.ts';

const DIR = path.resolve(process.env.OSM_DIR || 'data/osm'), KM = (a: LL, b: LL) => geoDistance(a, b) * 6371;
export type Street = { k: number; c: LL[] }; // k: 0 간선, 1 일반 도로, 2 보행로, 3 철도, 4 물길
const CLS: Record<string, number> = { motorway: 0, trunk: 0, primary: 0, secondary: 0, motorway_link: 0, trunk_link: 0, primary_link: 0, secondary_link: 0, tertiary: 1, tertiary_link: 1, unclassified: 1, residential: 1, living_street: 1, pedestrian: 2, footway: 2, path: 2, steps: 2, cycleway: 2, track: 2 };

export function fetchStreets(b: BBox): { streets: Street[]; walkable: { c: LL[]; w: number }[] } | null {
  const bb = `${b[1].toFixed(5)},${b[0].toFixed(5)},${b[3].toFixed(5)},${b[2].toFixed(5)}`;
  const q = `[out:json][timeout:90];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|footway|path|steps|cycleway|track)(_link)?$"](${bb});way["railway"="rail"](${bb});way["waterway"~"^(river|canal)$"](${bb}););out geom qt;`;
  fs.mkdirSync(DIR, { recursive: true }); const f = path.join(DIR, crypto.createHash('sha1').update(q).digest('hex').slice(0, 16) + '.json');
  if (!fs.existsSync(f)) { try { execFileSync('curl', ['-sS', '-f', '-m', '120', '--retry', '1', '-o', f, '--data-urlencode', 'data=' + q, 'https://overpass-api.de/api/interpreter'], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e: any) { try { fs.unlinkSync(f); } catch { /* 없음 */ } console.warn('OSM 요청 실패:', String(e.stderr ?? e).slice(0, 160)); return null; } }
  let j: any; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { fs.unlinkSync(f); return null; }
  const streets: Street[] = [], walkable: { c: LL[]; w: number }[] = [];
  for (const el of j.elements ?? []) { if (el.type !== 'way' || !el.geometry) continue; const c: LL[] = el.geometry.map((g: any) => [+g.lon.toFixed(6), +g.lat.toFixed(6)] as LL), t = el.tags ?? {};
    if (t.railway) streets.push({ k: 3, c }); else if (t.waterway) streets.push({ k: 4, c });
    else { const k = CLS[t.highway]; if (k == null) continue; streets.push({ k, c }); if (!/^motorway|^trunk/.test(t.highway) && t.foot !== 'no' && t.access !== 'private') walkable.push({ c, w: k === 0 ? 1.25 : 1 }); } }
  return { streets, walkable };
}

/** OSM 길 위에서 A→B 최단 경로(도보용) */
export function routeStreets(A: LL, B: LL, ways: { c: LL[]; w: number }[]): { path: LL[]; km: number; snapA: number; snapB: number } | null {
  const id = new Map<string, number>(), pts: LL[] = [], adj: { to: number; w: number }[][] = [];
  const node = (p: LL) => { const k = p[0] + ',' + p[1]; let i = id.get(k); if (i == null) { i = pts.length; id.set(k, i); pts.push(p); adj.push([]); } return i; };
  for (const w of ways) { let prev = -1; for (const p of w.c) { const n = node(p); if (prev >= 0 && prev !== n) { const d = KM(pts[prev], pts[n]) * w.w; adj[prev].push({ to: n, w: d }); adj[n].push({ to: prev, w: d }); } prev = n; } }
  if (pts.length < 2) return null;
  const near = (p: LL) => { let bi = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const dx = (pts[i][0] - p[0]) * 0.82, dy = pts[i][1] - p[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } } return { i: bi, d: KM(p, pts[bi]) }; };
  const a = near(A), b = near(B); if (a.d > 0.6 || b.d > 0.6 || a.i === b.i) return null;
  const n = pts.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), heap: [number, number][] = [[0, a.i]]; dist[a.i] = 0;
  const up = (i: number) => { while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, u] = pop(); if (d > dist[u]) continue; if (u === b.i) break; for (const e of adj[u]) { const nd = d + e.w; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; heap.push([nd, e.to]); up(heap.length - 1); } } }
  if (!isFinite(dist[b.i])) return null; const ids: number[] = []; for (let u = b.i; u !== -1; u = prev[u]) ids.push(u); ids.reverse();
  const raw: LL[] = [A, ...ids.map((i) => pts[i]), B]; let len = 0; for (let i = 1; i < raw.length; i++) len += KM(raw[i - 1], raw[i]);
  if (len > KM(A, B) * 3) return null;
  return { path: resample(raw, 340), km: len, snapA: a.d, snapB: b.d };
}
