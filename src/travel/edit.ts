// 여행 영상 편집용 순수 함수(브라우저·Node 공용): 이동수단 자동 추정, 정차지 이름 수정·삭제·병합, 사진 선택.
// 정차지 목록이 바뀌면 경로(legs)는 서버의 재계산 API(/api/travel/reroute)가 다시 만든다. 여기서는 legs 를 비워 곡선 미리보기로 돌려 둔다.
import type { PhotoSpec } from '../analysis/videoData.ts';
import type { Mode, Stop, TravelProps } from './types.ts';
import { inferMode, km, tzOffsetMin, waterFraction, wallMin } from './geo.ts';

/** 편집 대상: 영상 입력(props)과 정차지별 사진 후보, 구간별 이동 중 순항 속도 힌트(km/h) */
export type TravelDoc = { props: TravelProps; cands: PhotoSpec[][]; cruise: number[] };

const legStats = (p: TravelProps, i: number) => {
  const a = p.stops[i], b = p.stops[i + 1], A: [number, number] = [a.lon, a.lat], B: [number, number] = [b.lon, b.lat];
  const t0 = wallMin(a.depart ?? a.arrive), t1 = wallMin(b.arrive), dist = km(A, B), min = Math.max(1, t1 - tzOffsetMin(b.tz, t1) - (t0 - tzOffsetMin(a.tz, t0)));
  return { A, B, dist, min, speed: dist / (min / 60) };
};
/** 구간 i의 이동수단 자동 추정값(수동 지정 modeOverride 는 무시). cruise: 이동 중 찍힌 사진으로 얻은 순항 속도 */
export function autoMode(p: TravelProps, i: number, cruise?: number[]): Mode {
  const { A, B, dist, min, speed } = legStats(p, i), water = waterFraction(A, B), v = cruise?.[i] ?? 0;
  return v > speed * 1.15 ? inferMode(dist, (dist / v) * 60, water) : inferMode(dist, min, water);
}
/** 구간 i의 이동수단: 수동 지정이 있으면 그것, 없으면 자동 추정 */
export const modeOf = (p: TravelProps, i: number, cruise?: number[]): Mode => p.modeOverride?.[i] ?? autoMode(p, i, cruise);

const patch = (d: TravelDoc, props: Partial<TravelProps>, extra: Partial<TravelDoc> = {}): TravelDoc => ({ ...d, ...extra, props: { ...d.props, ...props } });
const setStop = (d: TravelDoc, i: number, f: (s: Stop) => Stop) => patch(d, { stops: d.props.stops.map((s, k) => (k === i ? f(s) : s)) });
const hm = (s: string) => s.slice(11, 16);

/** 정차지 이름·부제 수정. 대표 사진 자막이 옛 이름이었다면 같이 바꾼다 */
export function renameStop(d: TravelDoc, i: number, name: string, sub: string): TravelDoc {
  return setStop(d, i, (s) => ({ ...s, name, sub, photos: s.photos.map((ph, k) => (k === 0 && ph.cap && ph.cap.title === s.name ? { ...ph, cap: { ...ph.cap, title: name, sub } } : ph)) }));
}
/** 구간 i 이동수단 지정(null = 자동으로 되돌리기). 경로는 서버에서 해당 구간만 다시 계산한다 */
export function setMode(d: TravelDoc, i: number, m: Mode | null): TravelDoc {
  const mo = { ...(d.props.modeOverride ?? {}) }; if (m) mo[i] = m; else delete mo[i];
  return patch(d, { modeOverride: mo, legs: undefined });
}
const shiftModes = (mo: TravelProps['modeOverride'], drop: number[], from: number, by: number) => {
  const out: Record<number, Mode> = {}; for (const [k, v] of Object.entries(mo ?? {})) { const n = +k; if (drop.includes(n)) continue; out[n >= from ? n + by : n] = v; } return out;
};
const refreshSub = (d: TravelDoc, before: TravelProps): TravelDoc => {
  const first = before.stops[0]?.name, last = before.stops[before.stops.length - 1]?.name, now = d.props.stops;
  return before.info.sub === `${first}에서 ${last}까지` && now.length ? patch(d, { info: { ...d.props.info, sub: `${now[0].name}에서 ${now[now.length - 1].name}까지` } }) : d;
};
/** 정차지 삭제. 앞뒤 두 구간은 하나로 합쳐져 새로 계산된다 */
export function deleteStop(d: TravelDoc, i: number): TravelDoc {
  const n = d.props.stops.length; if (n <= 2) return d;
  const cruise = [...d.cruise]; let drop: number[], from: number;
  if (i === 0) { drop = [0]; from = 1; cruise.splice(0, 1); } else if (i === n - 1) { drop = [n - 2]; from = n; cruise.splice(n - 2, 1); }
  else { drop = [i - 1, i]; from = i + 1; cruise.splice(i - 1, 2, Math.max(d.cruise[i - 1] ?? 0, d.cruise[i] ?? 0)); }
  const mo = shiftModes(d.props.modeOverride, drop, from, i === 0 || i === n - 1 ? (i === 0 ? -1 : 0) : -1);
  const r = patch(d, { stops: d.props.stops.filter((_, k) => k !== i), modeOverride: mo, legs: undefined }, { cands: d.cands.filter((_, k) => k !== i), cruise });
  return refreshSub(r, d.props);
}
/** 정차지 i 와 i+1 을 하나로 합친다(위치는 사진 수 가중 평균, 시간은 처음~끝, 이름은 사진이 더 많은 쪽) */
export function mergeStops(d: TravelDoc, i: number): TravelDoc {
  const S = d.props.stops, a = S[i], b = S[i + 1]; if (!a || !b || S.length <= 2) return d;
  const na = Math.max(1, d.cands[i]?.length ?? a.photos.length), nb = Math.max(1, d.cands[i + 1]?.length ?? b.photos.length), big = na >= nb ? a : b;
  const seen = new Set<string>(), photos = [...a.photos, ...b.photos].filter((p) => !seen.has(p.src) && seen.add(p.src)).map((p, k) => ({ ...p, cap: { chip: p.cap?.chip ?? '', title: k === 0 ? big.name : '', sub: k === 0 ? big.sub : '' } }));
  const m: Stop = { name: big.name, sub: big.sub, lat: +((a.lat * na + b.lat * nb) / (na + nb)).toFixed(5), lon: +((a.lon * na + b.lon * nb) / (na + nb)).toFixed(5), arrive: a.arrive, depart: b.depart ?? b.arrive, tz: big.tz, photos };
  const cruise = [...d.cruise]; cruise.splice(i, 1);
  const cands = [...d.cands]; cands.splice(i, 2, [...(d.cands[i] ?? []), ...(d.cands[i + 1] ?? [])].filter((p, k, arr) => arr.findIndex((q) => q.src === p.src) === k).sort((x, y) => (x.ts ?? 0) - (y.ts ?? 0)));
  const stops = [...S]; stops.splice(i, 2, m);
  const r = patch(d, { stops, modeOverride: shiftModes(d.props.modeOverride, [i], i + 1, -1), legs: undefined }, { cands, cruise });
  return refreshSub(r, d.props);
}
/** 정차지의 영상용 사진 선택 상태 */
export const hasPhoto = (s: Stop, src: string) => s.photos.some((p) => p.src === src);
export function togglePhoto(d: TravelDoc, i: number, c: PhotoSpec): TravelDoc {
  return setStop(d, i, (s) => {
    if (hasPhoto(s, c.src)) return s.photos.length <= 1 ? s : { ...s, photos: s.photos.filter((p) => p.src !== c.src).map((p, k) => (k === 0 && !p.cap?.title ? { ...p, cap: { chip: p.cap?.chip ?? '', title: s.name, sub: s.sub } } : p)) };
    const t = c.ts ?? 0, photos = [...s.photos]; let at = photos.length; for (let k = 1; k < photos.length; k++) if ((photos[k].ts ?? 0) > t) { at = k; break; }
    photos.splice(Math.max(1, at), 0, { ...c, cap: { chip: c.cap?.chip ?? hm(s.arrive), title: '', sub: '' } }); return { ...s, photos };
  });
}
/** 사진을 대표(첫 장)로: 정차지 이름 자막이 새 대표로 옮겨 간다 */
export function makeHero(d: TravelDoc, i: number, src: string): TravelDoc {
  return setStop(d, i, (s) => {
    const k = s.photos.findIndex((p) => p.src === src); if (k <= 0) return s;
    const old = s.photos[0], hero = s.photos[k], rest = s.photos.filter((_, j) => j !== 0 && j !== k);
    return { ...s, photos: [{ ...hero, cap: { chip: hero.cap?.chip ?? '', title: s.name, sub: s.sub } }, { ...old, cap: { chip: old.cap?.chip ?? '', title: '', sub: '' } }, ...rest] };
  });
}
export function setCaption(d: TravelDoc, i: number, src: string, cap: Partial<{ chip: string; title: string; sub: string }>): TravelDoc {
  return setStop(d, i, (s) => ({ ...s, photos: s.photos.map((p) => (p.src === src ? { ...p, cap: { chip: '', title: '', sub: '', ...p.cap, ...cap } } : p)) }));
}
export const setInfo = (d: TravelDoc, info: Partial<TravelProps['info']>): TravelDoc => patch(d, { info: { ...d.props.info, ...info } });
