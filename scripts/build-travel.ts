// 여행 영상 데이터 빌드: 사진 메타데이터(또는 정차지 JSON) → 정차지·이동 구간(실제 도로/철도 경로)·지도 레이어·지형 텍스처
// 사용: npm run build:travel -- --photos <metadata.json|photo-bundle.zip> --out <dir> [--overrides <json>] [--no-terrain]
//       npm run build:travel -- --trip <stops.json> --out <dir>
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { normalize, groupBursts } from '../src/analysis/analyze.ts';
import { travelFromPhotos } from '../src/travel/fromPhotos.ts';
import { buildLegs, inferMode, waterFraction, km as distKm } from '../src/travel/geo.ts';
import type { LL, Leg, Mode, TravelProps, Texture } from '../src/travel/types.ts';
import { bboxOf, expand, places, BBox } from './travel/ne.ts';
import { route } from './travel/routing.ts';
import { extras } from './travel/mapdata.ts';
import { makeTexture } from './travel/terrain.ts';
import { fetchStreets, routeStreets, Street } from './travel/osm.ts';

const arg = (k: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const out = path.resolve(arg('out')!), media = path.join(out, 'media'); fs.mkdirSync(media, { recursive: true });
const COLORS = { accent: '#ff6b4a', light: '#efe9dc', ink: '#0f2a35', ocean: '#0f2b36', land: '#e8e0cf' };
const log: string[] = [];
let props: TravelProps; let cruise: number[] = [];

if (arg('photos')) {
  const src = arg('photos')!; let raw: any[]; let zip: Record<string, Uint8Array> | null = null;
  if (src.endsWith('.zip')) { zip = unzipSync(new Uint8Array(fs.readFileSync(src))); raw = JSON.parse(strFromU8(zip['metadata.json'])).photos; } else raw = JSON.parse(fs.readFileSync(src, 'utf8')).photos;
  const { dated } = normalize(raw); groupBursts(dated);
  const srcOf = (p: any) => { if (!p.thumb) return null; if (!zip) return p.thumb; const name = `media/tr_${String(p.id).padStart(4, '0')}.jpg`; fs.writeFileSync(path.join(out, name), zip[p.thumb]); return name; };
  const r = travelFromPhotos(dated, places(), { srcOf });
  props = { info: r.info, colors: COLORS, stops: r.stops }; cruise = r.cruise;
  log.push(`사진 ${raw.length}장 → 정차지 ${r.stops.length}곳 (GPS 없음 ${r.dropped.noGps}장, 이동 중 사진 ${r.dropped.transit}장 제외)`);
  log.push('자동 이름: ' + r.stops.map((s) => `${s.name}[${s.arrive.slice(5)}~${(s.depart ?? '').slice(11)} ${s.photos.length}컷]`).join(' → '));
} else props = JSON.parse(fs.readFileSync(arg('trip')!, 'utf8'));

if (arg('overrides')) { const o = JSON.parse(fs.readFileSync(arg('overrides')!, 'utf8'));
  for (const [i, v] of Object.entries<any>(o.stops ?? {})) { const s = props.stops[+i]; if (!s) continue; const old = s.name; Object.assign(s, v); s.photos.forEach((ph) => { if (ph.cap?.title === old) { ph.cap.title = s.name; if (v.sub) ph.cap.sub = v.sub; } }); }
  if (o.modes) props.modeOverride = o.modes; if (o.info) Object.assign(props.info, o.info); }

// 이동 구간: 기본(곡선) 계산 후, 자동차·자전거는 도로, 기차는 철도 데이터로 실제 경로 탐색
// 이동수단 재판정: 평균 속도는 정차지에서 머문 시간이 섞여 낮게 나오므로, 이동 중 사진에서 얻은 순항 속도가 더 높으면 그것으로 판정
{ const pre = buildLegs(props); for (const l of pre) { const v = cruise[l.a] ?? 0; if (v > l.speed * 1.15 && props.modeOverride?.[l.a] == null) { const A: LL = [props.stops[l.a].lon, props.stops[l.a].lat], B: LL = [props.stops[l.b].lon, props.stops[l.b].lat], m = inferMode(l.straightKm, (l.straightKm / v) * 60, waterFraction(A, B));
  if (m !== l.mode) { props.modeOverride = { ...(props.modeOverride ?? {}), [l.a]: m }; log.push(`구간 ${l.a + 1} 이동수단 보정: ${l.mode} → ${m} (평균 ${Math.round(l.speed)}km/h, 이동 중 사진 기준 순항 ${v}km/h)`); } } } }
const legs: Leg[] = buildLegs(props);
for (const l of legs) {
  const A: LL = [props.stops[l.a].lon, props.stops[l.a].lat], B: LL = [props.stops[l.b].lon, props.stops[l.b].lat];
  const kind = l.mode === 'car' || l.mode === 'bike' ? 'road' : l.mode === 'train' ? 'rail' : null; let note = '곡선(대권/추정)';
  if (kind) { const r = route(A, B, kind) ?? (kind === 'rail' ? null : null); if (r) { l.path = r.path; l.km = r.km; l.speed = r.km / (l.min / 60); l.routed = true; note = `${kind === 'road' ? '도로' : '철도'} 데이터 경로 ${r.km.toFixed(0)}km (직선 ${l.straightKm.toFixed(0)}km, 스냅 ${r.snapA.toFixed(1)}/${r.snapB.toFixed(1)}km)`; } else note = '경로 데이터 없음 → 곡선'; }
  log.push(`구간 ${l.a + 1}: ${props.stops[l.a].name} → ${props.stops[l.b].name} | ${l.mode} ${l.km.toFixed(1)}km ${Math.round(l.min)}분 ${Math.round(l.speed)}km/h | ${note}`);
}
// 도보·자전거(25km 이하): OpenStreetMap 거리 데이터로 실제 길을 따라가고, 골목 지도를 함께 저장
const streets: Street[] = []; const seenWay = new Set<string>();
for (const l of legs) { if ((l.mode !== 'walk' && l.mode !== 'bike') || l.straightKm > 25 || process.argv.includes('--no-osm')) continue;
  const A: LL = [props.stops[l.a].lon, props.stops[l.a].lat], B: LL = [props.stops[l.b].lon, props.stops[l.b].lat], bb = bboxOf([A, B]), m = Math.max(0.03, Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.9);
  const osm = fetchStreets(expand(bb, m)); if (!osm) { log.push(`구간 ${l.a + 1}: 거리 데이터를 받지 못해 곡선 유지`); continue; }
  for (const st of osm.streets) { const key = st.k + ':' + st.c[0] + st.c[st.c.length - 1] + st.c.length; if (!seenWay.has(key)) { seenWay.add(key); streets.push(st); } }
  const r = routeStreets(A, B, osm.walkable); if (r) { l.path = r.path; l.km = r.km; l.speed = r.km / (l.min / 60); l.routed = true; log.push(`구간 ${l.a + 1}: OSM 보행 경로 ${r.km.toFixed(2)}km (직선 ${l.straightKm.toFixed(2)}km, 스냅 ${(r.snapA * 1000).toFixed(0)}/${(r.snapB * 1000).toFixed(0)}m), 거리 ${osm.streets.length}개`); } else log.push(`구간 ${l.a + 1}: 보행 경로 탐색 실패 → 곡선 유지 (거리 ${osm.streets.length}개는 지도에 표시)`); }
props.legs = legs.map(({ cum, ...l }) => l);

// 지도 레이어 + 지형 텍스처
const allPts: LL[] = [...props.stops.map((s) => [s.lon, s.lat] as LL), ...legs.flatMap((l) => l.path)], tb = bboxOf(allPts), span = Math.max(tb[2] - tb[0], tb[3] - tb[1], 0.2);
const box: BBox = expand(tb, Math.max(1.2, span * 0.3));
const ex = extras(box); if (streets.length) ex.streets = streets; ex.credits = ['Natural Earth', 'Terrain Tiles (Mapzen · AWS Open Data)', ...(streets.length ? ['© OpenStreetMap contributors'] : [])];
fs.writeFileSync(path.join(media, 'geo.json'), JSON.stringify(ex));
log.push(`지도 레이어: 도로 ${ex.roads.length} · 철도 ${ex.rails.length} · 강 ${ex.rivers.length} · 호수 ${ex.lakes.length} · 도시권 ${ex.urban.length} · 도시명 ${ex.cities.length} · 거리 ${ex.streets?.length ?? 0} (geo.json ${(fs.statSync(path.join(media, 'geo.json')).size / 1024).toFixed(0)}KB)`);
const terrain: Texture[] = [];
if (!process.argv.includes('--no-terrain')) {
  // 세부(구간별) 텍스처를 먼저, 전체 텍스처를 마지막에: 렌더러는 앞에서부터 포함되는 첫 텍스처를 쓴다
  for (const l of legs) { if (l.mode === 'plane') continue; const lb = bboxOf(l.path), ls = Math.max(lb[2] - lb[0], lb[3] - lb[1]); if (ls > span * 0.45) continue;
    const t = await makeTexture(expand(lb, Math.max(0.09, ls * 0.7)), 1800, path.join(media, `terrain_leg${l.a}.png`), `media/terrain_leg${l.a}.png`); if (t) terrain.push(t); }
  const base = await makeTexture(box, 2600, path.join(media, 'terrain_base.png'), 'media/terrain_base.png'); if (base) terrain.push(base);
  log.push(`지형 텍스처 ${terrain.length}장: ` + terrain.map((t) => `${path.basename(t.src)} ${t.w}×${t.h}`).join(', '));
}
props.assets = { geo: 'media/geo.json', terrain };
fs.writeFileSync(path.join(out, 'travel-props.json'), JSON.stringify(props));
log.push(`props ${(fs.statSync(path.join(out, 'travel-props.json')).size / 1024).toFixed(0)}KB → ${path.join(out, 'travel-props.json')}`);
console.log(log.join('\n'));
void distKm; void ({} as Mode);
