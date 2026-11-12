// 여행 영상 데이터 파이프라인(CLI scripts/build-travel.ts 와 스튜디오 서버가 함께 쓴다).
//   입력: 사진 분석 결과(RawPhoto[]) 또는 정차지 JSON(TravelProps)
//   출력: props(정차지·이동 구간·에셋 주소) + out 폴더의 에셋 파일(media/geo*.json, media/terrain_*.png)
// 단계: 정차지 추출 → 이동수단 보정 → 경로(도로·철도·도보) → 지도 레이어 → 지형 텍스처
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalize, groupBursts } from '../../src/analysis/analyze.ts';
import type { RawPhoto, Photo } from '../../src/analysis/types.ts';
import type { PhotoSpec } from '../../src/analysis/videoData.ts';
import { travelFromPhotos } from '../../src/travel/fromPhotos.ts';
import { buildLegs, km } from '../../src/travel/geo.ts';
import { autoMode } from '../../src/travel/edit.ts';
import type { LL, Leg, TravelProps, Texture } from '../../src/travel/types.ts';
import { bboxOf, expand, neStatus, places, BBox } from './ne.ts';
import { route } from './routing.ts';
import { extras } from './mapdata.ts';
import { makeTexture, terrainStats } from './terrain.ts';
import { fetchStreets, routeStreets, Street } from './osm.ts';

export const COLORS = { accent: '#ff6b4a', light: '#efe9dc', ink: '#0f2a35', ocean: '#0f2b36', land: '#e8e0cf' };
export type Stage = 'analyze' | 'stops' | 'routes' | 'layers' | 'terrain' | 'done';
export type Warn = { code: string; level: 'info' | 'warn'; msg: string };
/** 사용자에게 그대로 보여 줄 수 있는 한국어 메시지를 가진 실패. code 로 화면이 안내 방식을 고른다 */
export class TravelError extends Error { constructor(public code: string, msg: string, public hint?: string) { super(msg); } }

export type PipelineOpts = {
  out: string;                 // 결과 폴더(media/ 와 travel-props.json 이 만들어진다)
  terrain?: boolean;           // 지형 텍스처 생성(기본 true)
  osm?: boolean;               // 도보·자전거 구간에 OpenStreetMap 사용(기본 true)
  attachNoGps?: boolean;       // GPS 없는 사진을 시각이 맞는 정차지의 후보로 넣기(기본 false)
  assetPrefix?: string;        // props 에 적는 에셋 주소 앞부분(예: '/studio-assets/ab12/'). 기본 ''(상대 경로)
  rev?: string;                // 지정하면 geo.<rev>.json · terrain_*.<해시>.png 처럼 버전이 붙은 파일명을 쓴다(브라우저 캐시 방지)
  overrides?: any;             // CLI --overrides 와 같은 형식
  stage?: (s: Stage, msg: string, frac?: number) => void;
};
export type TravelMeta = {
  version: 1; created: string;
  summary: { photos: number; failed: number; withGps: number; noGps: number; noTime: number; transit: number; attached: number; stops: number; fineRadius: boolean };
  candidates: PhotoSpec[][]; cruise: number[]; warnings: Warn[]; log: string[];
};
export type BuildResult = { props: TravelProps; meta: TravelMeta; log: string[]; warnings: Warn[] };
type Ctx = { log: string[]; warnings: Warn[]; o: PipelineOpts };
const mk = (o: PipelineOpts): Ctx => ({ log: [], warnings: [], o });
const stage = (c: Ctx, s: Stage, msg: string, f?: number) => c.o.stage?.(s, msg, f);
const warn = (c: Ctx, code: string, msg: string, level: Warn['level'] = 'warn') => c.warnings.push({ code, level, msg });
const prefixOf = (o: PipelineOpts) => o.assetPrefix ?? '';

export function requireMapData() {
  const st = neStatus();
  if (!st.ready) throw new TravelError('no-map-data', '지도 데이터가 없습니다.', `Natural Earth 지도 데이터(${st.missing.length}개 파일)가 ${st.dir} 에 없습니다. 터미널에서 npm run fetch:data 를 실행하거나 화면의 [지도 데이터 내려받기]를 누르세요.`);
}

/* ---------- 1. 사진 → 정차지 ---------- */
export type StopsFrom = { props: TravelProps; cruise: number[]; candidates: PhotoSpec[][]; summary: TravelMeta['summary'] };
export function stopsFromRaw(raw: RawPhoto[], srcOf: (p: Photo) => string | null, c: Ctx, failed = 0): StopsFrom {
  if (!raw.length) throw new TravelError('no-photos', '읽을 수 있는 사진이 없습니다.', 'JPG·PNG·WebP 사진을 올려 주세요. (HEIC는 지원하지 않습니다 — 카메라 설정에서 JPEG로 저장하거나 변환해 올리세요)');
  const { dated, undated } = normalize(raw); groupBursts(dated);
  const gps = dated.filter((p) => p.latitude != null && p.longitude != null);
  if (!dated.length) throw new TravelError('no-time', `촬영 시각이 있는 사진이 없습니다 (${raw.length}장 모두 시각 정보 없음).`, '여행 영상은 사진의 촬영 시각 순서로 이동 경로를 만듭니다. 메신저로 받은 사진은 시각 정보가 지워지는 경우가 많으니 카메라 원본을 올려 주세요.');
  if (!gps.length) throw new TravelError('no-gps', `위치(GPS) 정보가 있는 사진이 없습니다 (${dated.length}장 모두 위치 없음).`, '카메라 앱의 위치 태그를 켜고 찍은 원본을 올려 주세요. 메신저·SNS를 거친 사진은 위치가 지워집니다.');
  const places0 = places();
  const run = (o: object) => travelFromPhotos(dated, places0, { srcOf, attachNoGps: c.o.attachNoGps, ...o });
  let r = run({}), fine = false;
  if (r.stops.length < 2) {
    // 한 곳에 몰린 사진(당일치기·시내 산책): 반경 350m 단위의 세부 장소로 다시 나눠 본다
    const r2 = run({ radiusKm: 0.35, minPhotos: 3, minDwellMin: 8 });
    if (r2.stops.length >= 2) { r = r2; fine = true; warn(c, 'one-area', `사진이 거의 한 지역에서 찍혀, 약 350m 단위의 세부 장소로 나눠 ${r2.stops.length}곳을 만들었습니다. 이동수단은 대부분 도보로 추정되며 이름은 가까운 도시 이름이 반복될 수 있어 직접 고치는 것이 좋습니다.`); }
    else if (gps.length < 2) throw new TravelError('few-gps', `위치 정보가 있는 사진이 ${gps.length}장뿐이라 이동 경로를 만들 수 없습니다.`, '위치가 있는 사진이 서로 다른 두 곳 이상에서 필요합니다.');
    else {
      const cx = gps.reduce((s, p) => s + p.longitude!, 0) / gps.length, cy = gps.reduce((s, p) => s + p.latitude!, 0) / gps.length, spread = Math.max(...gps.map((p) => km([cx, cy], [p.longitude!, p.latitude!])));
      throw new TravelError('one-place', spread < 1 ? `위치가 있는 사진 ${gps.length}장이 모두 한 곳(반경 ${Math.round(spread * 1000)}m 안)에서 찍혔습니다.` : `머문 곳을 2곳 이상 찾지 못했습니다 (위치 사진 ${gps.length}장, 이동 중 사진 ${r.dropped.transit}장 제외).`, '여행 영상은 서로 다른 두 곳 이상이 필요합니다. 다른 장소에서 찍은 사진을 함께 올려 주세요. (한 곳에서 3장 이상 또는 20분 이상 머문 기록이 있어야 정차지로 인정됩니다)');
    }
  }
  const days = new Set(gps.map((p) => Math.floor(p.t / 1440))).size;
  if (days <= 1 && !fine) warn(c, 'same-day', '하루 안의 여행(당일치기)입니다. 구간 시간이 짧아 이동수단이 실제와 다르게 추정될 수 있으니 구간별로 확인해 주세요.', 'info');
  if (undated.length) warn(c, 'no-time', `촬영 시각이 없는 사진 ${undated.length}장은 순서를 알 수 없어 제외했습니다.`);
  const nog = dated.length - gps.length;
  if (nog) warn(c, 'no-gps', c.o.attachNoGps ? `위치 정보가 없는 사진 ${nog}장은 지도에 표시되지 않습니다. 그중 ${r.dropped.attached}장은 촬영 시각이 머문 시간과 맞아 해당 정차지의 사진 후보로 넣었습니다${r.dropped.attached < nog ? ` (나머지 ${nog - r.dropped.attached}장은 이동 중이라 쓰지 않음)` : ''}.` : `위치 정보가 없는 사진 ${nog}장은 지도에 표시되지 않습니다.`, 'info');
  if (r.dropped.transit) warn(c, 'transit', `이동 중에 찍힌 것으로 보이는 사진 ${r.dropped.transit}장은 정차지에서 제외했습니다 (머문 곳이 아님).`, 'info');
  const weak = r.stops.filter((s) => /근교$|°[NS] /.test(s.name));
  if (weak.length) warn(c, 'names', `이름을 정확히 알 수 없는 정차지가 있습니다: ${weak.map((s) => s.name).join(', ')}. 이름은 가까운 도시를 자동으로 고른 추정값이니 직접 확인해 주세요.`);
  c.log.push(`사진 ${raw.length}장 → 정차지 ${r.stops.length}곳 (GPS 없음 ${r.dropped.noGps}장, 이동 중 사진 ${r.dropped.transit}장 제외)`);
  c.log.push('자동 이름: ' + r.stops.map((s) => `${s.name}[${s.arrive.slice(5)}~${(s.depart ?? '').slice(11)} ${s.photos.length}컷]`).join(' → '));
  return {
    props: { info: r.info, colors: COLORS, stops: r.stops }, cruise: r.cruise, candidates: r.candidates,
    summary: { photos: raw.length + failed, failed, withGps: gps.length, noGps: nog, noTime: undated.length, transit: r.dropped.transit, attached: r.dropped.attached, stops: r.stops.length, fineRadius: fine },
  };
}

export function applyOverrides(props: TravelProps, o: any) {
  for (const [i, v] of Object.entries<any>(o.stops ?? {})) { const s = props.stops[+i]; if (!s) continue; const old = s.name; Object.assign(s, v); s.photos.forEach((ph) => { if (ph.cap?.title === old) { ph.cap.title = s.name; if (v.sub) ph.cap.sub = v.sub; } }); }
  if (o.modes) props.modeOverride = o.modes; if (o.info) Object.assign(props.info, o.info);
}

/* ---------- 2~3. 이동수단 보정 + 경로 ---------- */
/** 평균 속도는 머문 시간이 섞여 낮게 나오므로, 이동 중 사진에서 얻은 순항 속도가 더 높으면 그것으로 이동수단을 다시 판정 */
function refineModes(props: TravelProps, cruise: number[], c: Ctx) {
  for (const l of buildLegs(props)) { const v = cruise[l.a] ?? 0;
    if (v > l.speed * 1.15 && props.modeOverride?.[l.a] == null) { const m = autoMode(props, l.a, cruise);
      if (m !== l.mode) { props.modeOverride = { ...(props.modeOverride ?? {}), [l.a]: m }; c.log.push(`구간 ${l.a + 1} 이동수단 보정: ${l.mode} → ${m} (평균 ${Math.round(l.speed)}km/h, 이동 중 사진 기준 순항 ${v}km/h)`); } } }
}
type OldLeg = Omit<Leg, 'cum'>;
const near = (p: LL, q: LL) => Math.abs(p[0] - q[0]) < 3e-4 && Math.abs(p[1] - q[1]) < 3e-4;

/** 이동 구간 계산. reuse 로 이전에 계산한 구간을 주면, 양 끝 좌표와 이동수단이 같은 구간은 경로를 다시 만들지 않는다 */
async function routeLegs(props: TravelProps, c: Ctx, reuse?: OldLeg[]): Promise<{ legs: Leg[]; streets: Street[] }> {
  const legs = buildLegs(props), total = Math.max(1, legs.length);
  for (const l of legs) {
    const A: LL = [props.stops[l.a].lon, props.stops[l.a].lat], B: LL = [props.stops[l.b].lon, props.stops[l.b].lat];
    stage(c, 'routes', `구간 ${l.a + 1}/${legs.length} 경로 탐색 (${props.stops[l.a].name} → ${props.stops[l.b].name})`, l.a / total);
    const old = reuse?.find((x) => x.mode === l.mode && x.path?.length > 1 && near(x.path[0], A) && near(x.path[x.path.length - 1], B));
    if (old) { l.path = old.path; l.km = old.km; l.speed = l.km / (l.min / 60); l.routed = old.routed; c.log.push(`구간 ${l.a + 1}: ${props.stops[l.a].name} → ${props.stops[l.b].name} | ${l.mode} ${l.km.toFixed(1)}km ${Math.round(l.min)}분 ${Math.round(l.speed)}km/h | 이전 경로 재사용`);
      if (!l.routed && (l.mode === 'car' || l.mode === 'train')) warn(c, 'route-fallback', `구간 ${l.a + 1} (${props.stops[l.a].name} → ${props.stops[l.b].name}): ${l.mode === 'car' ? '도로' : '철도'} 데이터에서 이어지는 경로를 찾지 못해 곡선으로 표시합니다. 이동수단을 바꿔 보거나 그대로 사용하세요.`);
      continue; }
    const kind = l.mode === 'car' || l.mode === 'bike' ? 'road' : l.mode === 'train' ? 'rail' : null; let note = '곡선(대권/추정)';
    if (kind) {
      const r = route(A, B, kind);
      if (r) { l.path = r.path; l.km = r.km; l.speed = r.km / (l.min / 60); l.routed = true; note = `${kind === 'road' ? '도로' : '철도'} 데이터 경로 ${r.km.toFixed(0)}km (직선 ${l.straightKm.toFixed(0)}km, 스냅 ${r.snapA.toFixed(1)}/${r.snapB.toFixed(1)}km)`; }
      else { note = '경로 데이터 없음 → 곡선'; warn(c, 'route-fallback', `구간 ${l.a + 1} (${props.stops[l.a].name} → ${props.stops[l.b].name}): ${kind === 'road' ? '도로' : '철도'} 데이터에서 이어지는 경로를 찾지 못해 곡선으로 표시합니다. 이동수단을 바꿔 보거나 그대로 사용하세요.`); }
    }
    c.log.push(`구간 ${l.a + 1}: ${props.stops[l.a].name} → ${props.stops[l.b].name} | ${l.mode} ${l.km.toFixed(1)}km ${Math.round(l.min)}분 ${Math.round(l.speed)}km/h | ${note}`);
  }
  // 도보·자전거(25km 이하): OpenStreetMap 거리 데이터로 실제 길을 따라가고, 골목 지도를 함께 저장
  const streets: Street[] = [], seenWay = new Set<string>();
  for (const l of legs) {
    if ((l.mode !== 'walk' && l.mode !== 'bike') || l.straightKm > 25 || c.o.osm === false) continue;
    const A: LL = [props.stops[l.a].lon, props.stops[l.a].lat], B: LL = [props.stops[l.b].lon, props.stops[l.b].lat], bb = bboxOf([A, B]), m = Math.max(0.03, Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.9);
    const had = l.routed;
    stage(c, 'routes', `구간 ${l.a + 1} 걷는 길 데이터(OpenStreetMap) 받는 중`, l.a / total);
    const osm = await fetchStreets(expand(bb, m));
    if (!osm) { c.log.push(`구간 ${l.a + 1}: 거리 데이터를 받지 못해 곡선 유지`); if (!had) warn(c, 'osm-fail', `구간 ${l.a + 1} (${props.stops[l.a].name} → ${props.stops[l.b].name}): 걷는 길 데이터(OpenStreetMap)를 받지 못해 곡선으로 표시합니다. 네트워크가 연결된 곳에서 이동수단을 한 번 바꿨다 되돌리면 다시 시도합니다.`); continue; }
    for (const st of osm.streets) { const key = st.k + ':' + st.c[0] + st.c[st.c.length - 1] + st.c.length; if (!seenWay.has(key)) { seenWay.add(key); streets.push(st); } }
    if (had) continue;
    const r = routeStreets(A, B, osm.walkable);
    if (r) { l.path = r.path; l.km = r.km; l.speed = r.km / (l.min / 60); l.routed = true; c.log.push(`구간 ${l.a + 1}: OSM 보행 경로 ${r.km.toFixed(2)}km (직선 ${l.straightKm.toFixed(2)}km, 스냅 ${(r.snapA * 1000).toFixed(0)}/${(r.snapB * 1000).toFixed(0)}m), 거리 ${osm.streets.length}개`); }
    else { c.log.push(`구간 ${l.a + 1}: 보행 경로 탐색 실패 → 곡선 유지 (거리 ${osm.streets.length}개는 지도에 표시)`); warn(c, 'osm-noroute', `구간 ${l.a + 1} (${props.stops[l.a].name} → ${props.stops[l.b].name}): 걷는 길을 따라 이어지는 경로를 찾지 못해 곡선으로 표시합니다.`); }
  }
  return { legs, streets };
}

/* ---------- 4~5. 지도 레이어 + 지형 ---------- */
const sameBox = (t: Texture, b: BBox) => Math.abs(t.lon0 - b[0]) < 1e-6 && Math.abs(t.lon1 - b[2]) < 1e-6 && Math.abs(t.lat0 - Math.max(-84, b[1])) < 1e-6 && Math.abs(t.lat1 - Math.min(84, b[3])) < 1e-6;
async function layers(props: TravelProps, legs: Leg[], streets: Street[], c: Ctx, prev?: TravelProps['assets']) {
  const o = c.o, out = path.resolve(o.out), media = path.join(out, 'media'), pre = prefixOf(o); fs.mkdirSync(media, { recursive: true });
  const allPts: LL[] = [...props.stops.map((s) => [s.lon, s.lat] as LL), ...legs.flatMap((l) => l.path)], tb = bboxOf(allPts), span = Math.max(tb[2] - tb[0], tb[3] - tb[1], 0.2);
  const box: BBox = expand(tb, Math.max(1.2, span * 0.3));
  stage(c, 'layers', '지도 레이어(도로·철도·강·호수·도시) 자르는 중', 0);
  const ex = extras(box); if (streets.length) ex.streets = streets; ex.credits = ['Natural Earth', 'Terrain Tiles (Mapzen · AWS Open Data)', ...(streets.length ? ['© OpenStreetMap contributors'] : [])];
  const geoName = o.rev ? `geo.${o.rev}.json` : 'geo.json';
  fs.writeFileSync(path.join(media, geoName), JSON.stringify(ex));
  c.log.push(`지도 레이어: 도로 ${ex.roads.length} · 철도 ${ex.rails.length} · 강 ${ex.rivers.length} · 호수 ${ex.lakes.length} · 도시권 ${ex.urban.length} · 도시명 ${ex.cities.length} · 거리 ${ex.streets?.length ?? 0} (geo.json ${(fs.statSync(path.join(media, geoName)).size / 1024).toFixed(0)}KB)`);
  const terrain: Texture[] = [];
  if (o.terrain !== false) {
    // 세부(구간별) 텍스처를 먼저, 전체 텍스처를 마지막에: 렌더러는 앞에서부터 포함되는 첫 텍스처를 쓴다
    const old = prev?.terrain ?? [], jobs: { box: BBox; px: number; name: string }[] = [];
    for (const l of legs) { if (l.mode === 'plane') continue; const lb = bboxOf(l.path), ls = Math.max(lb[2] - lb[0], lb[3] - lb[1]); if (ls > span * 0.45) continue; jobs.push({ box: expand(lb, Math.max(0.09, ls * 0.7)), px: 1800, name: `terrain_leg${l.a}` }); }
    jobs.push({ box, px: 2600, name: 'terrain_base' });
    let failedTex = 0, partial = 0, skipped = 0;
    for (const [k, j] of jobs.entries()) {
      stage(c, 'terrain', `지형 텍스처 ${k + 1}/${jobs.length}`, k / jobs.length);
      const hash = crypto.createHash('md5').update(j.box.map((v) => v.toFixed(4)).join(',') + j.px).digest('hex').slice(0, 8), file = o.rev ? `${j.name}.${hash}.png` : `${j.name}.png`, src = `media/${file}`;
      const kept = o.rev ? old.find((t) => sameBox(t, j.box) && t.src.endsWith(src)) : undefined;   // 같은 영역이면 이전 텍스처 재사용
      if (kept && fs.existsSync(path.join(media, file))) { terrain.push({ ...kept, src: pre + src }); continue; }
      const t = await makeTexture(j.box, j.px, path.join(media, file), pre + src);
      if (t) { terrain.push(t); if (terrainStats.got < terrainStats.need) partial++; } else if (terrainStats.need <= 220) failedTex++; else skipped++;   // 220장 초과: 영역이 너무 넓어 만들지 않음(오류 아님)
    }
    if (failedTex && failedTex + skipped === jobs.length) warn(c, 'terrain-fail', '지형 타일을 받지 못했습니다 (AWS Terrain Tiles 접속 실패). 지형 음영 없이 평평한 지도로 진행합니다. 네트워크를 확인한 뒤 이동수단을 바꿨다 되돌리면 다시 시도할 수 있습니다.');
    else if (failedTex || partial) warn(c, 'terrain-partial', `지형 타일 일부(${failedTex + partial}/${jobs.length}곳)를 완전히 받지 못해 해당 지역은 지형 음영이 비어 보일 수 있습니다.`);
    c.log.push(`지형 텍스처 ${terrain.length}장: ` + terrain.map((t) => `${path.basename(t.src)} ${t.w}×${t.h}`).join(', '));
  }
  props.assets = { geo: pre + `media/${geoName}`, terrain };
  // 더 이상 쓰지 않는 이전 버전 파일 정리
  if (o.rev) { const keep = new Set([geoName, ...terrain.map((t) => path.basename(t.src))]); for (const f of fs.readdirSync(media)) if (/^(geo\..+\.json|terrain_.+\.png)$/.test(f) && !keep.has(f)) { try { fs.unlinkSync(path.join(media, f)); } catch { /* 무시 */ } } }
}

async function finish(props: TravelProps, c: Ctx, reuse?: OldLeg[], prevAssets?: TravelProps['assets']) {
  const { legs, streets } = await routeLegs(props, c, reuse);
  props.legs = legs.map(({ cum, ...l }) => l);
  await layers(props, legs, streets, c, prevAssets);
  const f = path.join(path.resolve(c.o.out), 'travel-props.json'); fs.writeFileSync(f, JSON.stringify(props));
  c.log.push(`props ${(fs.statSync(f).size / 1024).toFixed(0)}KB → ${f}`);
}

/* ---------- 공개 API ---------- */
export type BuildInput = { raw: RawPhoto[]; srcOf: (p: Photo) => string | null; failed?: number } | { trip: TravelProps };
export async function buildTravel(input: BuildInput, o: PipelineOpts): Promise<BuildResult> {
  const c = mk(o); fs.mkdirSync(path.join(path.resolve(o.out), 'media'), { recursive: true });
  requireMapData();
  let props: TravelProps, cruise: number[] = [], candidates: PhotoSpec[][] = [], summary: TravelMeta['summary'];
  stage(c, 'stops', '사진의 위치·시각으로 머문 곳(정차지) 찾는 중', 0);
  if ('trip' in input) { props = input.trip; summary = { photos: 0, failed: 0, withGps: 0, noGps: 0, noTime: 0, transit: 0, attached: 0, stops: props.stops.length, fineRadius: false }; candidates = props.stops.map((s) => s.photos); }
  else { const r = stopsFromRaw(input.raw, input.srcOf, c, input.failed ?? 0); ({ props, cruise, candidates, summary } = r); }
  if (o.overrides) applyOverrides(props, o.overrides);
  refineModes(props, cruise, c);
  await finish(props, c);
  stage(c, 'done', '완료', 1);
  const meta: TravelMeta = { version: 1, created: new Date().toISOString(), summary, candidates, cruise, warnings: c.warnings, log: c.log };
  fs.writeFileSync(path.join(path.resolve(o.out), 'travel-meta.json'), JSON.stringify(meta));
  return { props, meta, log: c.log, warnings: c.warnings };
}

/** 편집된 props(정차지·modeOverride)로 구간을 다시 계산한다. 양 끝과 이동수단이 그대로인 구간은 props.legs 의 이전 경로를 재사용 */
export async function rerouteTravel(edited: TravelProps, o: PipelineOpts, reuse?: OldLeg[], cruise?: number[]): Promise<{ props: TravelProps; log: string[]; warnings: Warn[] }> {
  const c = mk(o); requireMapData();
  const props: TravelProps = JSON.parse(JSON.stringify(edited)), prevAssets = props.assets;
  // 수동 지정이 없는 구간은 빌드 때와 같은 규칙(이동 중 사진의 순항 속도 반영)으로 판정하되, 돌려주는 modeOverride 에는 섞지 않는다
  const orig = props.modeOverride ? { ...props.modeOverride } : undefined; if (cruise?.length) refineModes(props, cruise, c);
  await finish(props, c, [...(reuse ?? []), ...(edited.legs ?? [])], prevAssets);
  props.modeOverride = orig; if (!orig) delete props.modeOverride;
  stage(c, 'done', '완료', 1);
  return { props, log: c.log, warnings: c.warnings };
}
