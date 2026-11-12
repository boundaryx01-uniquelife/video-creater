// Natural Earth(공공 도메인) 벡터 데이터 로더. data/ne/*.geojson 은 raw.githubusercontent.com 에서 받아 둔 캐시.
import fs from 'node:fs';
import path from 'node:path';
import type { LL } from '../../src/travel/types.ts';

export type BBox = [number, number, number, number]; // lon0, lat0, lon1, lat1
const DIR = path.resolve(process.env.NE_DIR || 'data/ne');
const cache = new Map<string, any>();
/** 여행 빌드에 필요한 Natural Earth 파일 목록(scripts/fetch-data.mjs 의 NE_FILES 와 같다) */
export const NE_REQUIRED = ['ne_10m_populated_places', 'ne_10m_roads', 'ne_10m_railroads', 'ne_10m_rivers_lake_centerlines', 'ne_10m_lakes', 'ne_10m_urban_areas'];
/** 지도 데이터가 갖춰졌는지 확인 */
export function neStatus(): { ready: boolean; missing: string[]; dir: string } {
  const missing = NE_REQUIRED.filter((n) => { try { return fs.statSync(path.join(DIR, n + '.geojson')).size < 1e6; } catch { return true; } });
  return { ready: !missing.length, missing, dir: DIR };
}
export const load = (name: string) => { if (!cache.has(name)) cache.set(name, JSON.parse(fs.readFileSync(path.join(DIR, name + '.geojson'), 'utf8'))); return cache.get(name); };
const inBox = (c: number[], b: BBox) => c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3];
export const expand = (b: BBox, m: number): BBox => [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
export const bboxOf = (pts: LL[]): BBox => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];

export function lines(name: string, b: BBox, keep?: (props: any) => boolean): { c: LL[]; p: any }[] {
  const out: { c: LL[]; p: any }[] = [];
  for (const f of load(name).features) {
    if (!f.geometry || (keep && !keep(f.properties))) continue;
    for (const l of f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates) if (l.some((c: number[]) => inBox(c, b))) out.push({ c: l.map((c: number[]) => [c[0], c[1]] as LL), p: f.properties });
  }
  return out;
}
export function polygons(name: string, b: BBox): LL[][] {
  const out: LL[][] = [];
  for (const f of load(name).features) {
    if (!f.geometry) continue;
    for (const poly of f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) if (poly[0].some((c: number[]) => inBox(c, b))) out.push(poly[0].map((c: number[]) => [c[0], c[1]] as LL));
  }
  return out;
}
/** 좌표 단순화: 격자 반올림 후 연속 중복 제거 */
export const simplify = (c: LL[], q: number): LL[] => { const o: LL[] = []; for (const p of c) { const r: LL = [Math.round(p[0] / q) * q, Math.round(p[1] / q) * q]; const l = o[o.length - 1]; if (!l || l[0] !== r[0] || l[1] !== r[1]) o.push([+r[0].toFixed(4), +r[1].toFixed(4)]); } return o; };

export type Place = { n: string; en: string; lon: number; lat: number; pop: number; tz: string; rank: number };
const strip = (s: string) => (s.length >= 3 ? s.replace(/(특별자치시|특별자치도|특별시|광역시)$/, '').replace(/(?<=..)(도|시|현|부)$/, '') : s);
export function places(): Place[] {
  return load('ne_10m_populated_places').features.map((f: any) => { const p = f.properties; return { n: strip(String(p.NAME_KO || p.NAME)), en: p.NAME, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], pop: p.POP_MAX || 0, tz: p.TIMEZONE || '', rank: p.SCALERANK ?? 9 }; });
}
