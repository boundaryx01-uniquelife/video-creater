// 여정 범위의 지도 레이어(도로·철도·강·호수·도시권·도시명)를 Natural Earth에서 잘라낸다
import type { GeoExtras, LL } from '../../src/travel/types.ts';
import { BBox, lines, places, polygons, simplify } from './ne.ts';

export function extras(box: BBox): GeoExtras {
  const span = Math.max(box[2] - box[0], box[3] - box[1]), q = span > 40 ? 0.02 : span > 12 ? 0.008 : 0.003, maxRoad = span > 40 ? 5 : span > 12 ? 8 : 12;
  const roads = lines('ne_10m_roads', box, (p) => (p.scalerank ?? 9) <= maxRoad).map((l) => simplify(l.c, q)).filter((c) => c.length > 1);
  const rails = lines('ne_10m_railroads', box, (p) => (p.scalerank ?? 9) <= maxRoad).map((l) => simplify(l.c, q)).filter((c) => c.length > 1);
  const rivers = lines('ne_10m_rivers_lake_centerlines', box).map((l) => ({ r: l.p.scalerank ?? 9, c: simplify(l.c, q) })).filter((x) => x.c.length > 1);
  const lakes = polygons('ne_10m_lakes', box).map((c) => simplify(c, q)).filter((c) => c.length > 3);
  const urban = span > 40 ? [] : polygons('ne_10m_urban_areas', box).map((c) => simplify(c, q)).filter((c) => c.length > 3);
  const cities = places().filter((p) => p.lon >= box[0] && p.lon <= box[2] && p.lat >= box[1] && p.lat <= box[3]).sort((a, b) => b.pop - a.pop).slice(0, 400).map((p) => ({ n: p.n, lon: +p.lon.toFixed(4), lat: +p.lat.toFixed(4), pop: p.pop }));
  return { roads, rails, rivers, lakes, urban, cities };
}
