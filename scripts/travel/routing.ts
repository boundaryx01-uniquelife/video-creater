// Natural Earth 도로/철도 선형 데이터 위에서 최단 경로 탐색(다익스트라). 주요 간선 수준의 데이터라 골목·세부 도로는 없다.
import { geoDistance } from 'd3-geo';
import type { LL } from '../../src/travel/types.ts';
import { BBox, bboxOf, expand, lines } from './ne.ts';

const KM = (a: LL, b: LL) => geoDistance(a, b) * 6371;
const Q = 0.002;

type Graph = { pts: LL[]; adj: { to: number; w: number }[][] };
function buildGraph(ls: LL[][]): Graph {
  const id = new Map<string, number>(), pts: LL[] = [], adj: { to: number; w: number }[][] = [];
  const node = (p: LL) => { const k = `${Math.round(p[0] / Q)},${Math.round(p[1] / Q)}`; let i = id.get(k); if (i == null) { i = pts.length; id.set(k, i); pts.push(p); adj.push([]); } return i; };
  const link = (a: number, b: number, w: number) => { if (a === b) return; adj[a].push({ to: b, w }); adj[b].push({ to: a, w }); };
  const ends: number[] = [];
  for (const l of ls) { let prev = -1; l.forEach((p, k) => { const n = node(p); if (prev >= 0) link(prev, n, KM(pts[prev], pts[n])); prev = n; if (k === 0 || k === l.length - 1) ends.push(n); }); }
  // 끊긴 선 잇기: 선의 끝점에서 2.5km 안의 다른 노드와 연결
  const C = 0.03, grid = new Map<string, number[]>(); pts.forEach((p, i) => { const k = `${Math.floor(p[0] / C)},${Math.floor(p[1] / C)}`; (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); });
  for (const e of new Set(ends)) { const p = pts[e], gx = Math.floor(p[0] / C), gy = Math.floor(p[1] / C);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) { if (j === e) continue; const d = KM(p, pts[j]); if (d < 2.5 && !adj[e].some((x) => x.to === j)) link(e, j, d * 1.3 + 0.2); } }
  return { pts, adj };
}
function nearest(g: Graph, p: LL) { let bi = -1, bd = 1e9; for (let i = 0; i < g.pts.length; i++) { const d = KM(p, g.pts[i]); if (d < bd) { bd = d; bi = i; } } return { i: bi, d: bd }; }
function dijkstra(g: Graph, s: number, t: number): number[] | null {
  const n = g.pts.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), heap: [number, number][] = [[0, s]]; dist[s] = 0;
  const push = (x: [number, number]) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, u] = pop(); if (d > dist[u]) continue; if (u === t) break; for (const e of g.adj[u]) { const nd = d + e.w; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; push([nd, e.to]); } } }
  if (!isFinite(dist[t])) return null; const out: number[] = []; for (let u = t; u !== -1; u = prev[u]) out.push(u); return out.reverse();
}
const chaikin = (c: LL[]): LL[] => { if (c.length < 3) return c; const o: LL[] = [c[0]]; for (let i = 0; i < c.length - 1; i++) { const a = c[i], b = c[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(c[c.length - 1]); return o; };
export function resample(c: LL[], n: number): LL[] {
  const cum = [0]; for (let i = 1; i < c.length; i++) cum.push(cum[i - 1] + KM(c[i - 1], c[i])); const tot = cum[cum.length - 1] || 1e-9, o: LL[] = []; let j = 1;
  for (let k = 0; k <= n; k++) { const d = (k / n) * tot; while (j < c.length - 1 && cum[j] < d) j++; const t = (d - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]); o.push([+(c[j - 1][0] + (c[j][0] - c[j - 1][0]) * t).toFixed(5), +(c[j - 1][1] + (c[j][1] - c[j - 1][1]) * t).toFixed(5)]); }
  return o;
}
const graphs = new Map<string, Graph>();
/** A→B를 도로(road) 또는 철도(rail) 데이터로 잇는다. 실패 시 null (호출 측이 곡선으로 대체) */
export function route(A: LL, B: LL, kind: 'road' | 'rail'): { path: LL[]; km: number; snapA: number; snapB: number } | null {
  const straight = KM(A, B), box: BBox = expand(bboxOf([A, B]), Math.max(0.5, Math.min(3, straight / 111 * 0.45)));
  const key = kind + box.map((v) => v.toFixed(2)).join(','); if (!graphs.has(key)) graphs.set(key, buildGraph(lines(kind === 'road' ? 'ne_10m_roads' : 'ne_10m_railroads', box).map((l) => l.c)));
  const g = graphs.get(key)!; if (g.pts.length < 2) return null;
  const a = nearest(g, A), b = nearest(g, B), maxSnap = Math.max(12, straight * 0.22);
  if (a.d > maxSnap || b.d > maxSnap || a.i === b.i) return null;
  const ids = dijkstra(g, a.i, b.i); if (!ids) return null;
  let path: LL[] = [A, ...ids.map((i) => g.pts[i]), B]; path = resample(chaikin(chaikin(path)), 320);
  let len = 0; for (let i = 1; i < path.length; i++) len += KM(path[i - 1], path[i]);
  if (len > straight * 2.3) return null;
  return { path, km: len, snapA: a.d, snapB: b.d };
}
