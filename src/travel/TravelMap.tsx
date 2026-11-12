import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useVideoConfig } from 'remotion';
import { geoPath } from 'd3-geo';
import type { GeoExtras, LL, Leg, Mode, Texture, TravelProps } from './types.ts';
import { MODE_COLOR, PERSP, RAD, graticulePath, km, landPath, linePath, makeProj, toScreen } from './geo.ts';
import { FONT_UI, TNUM, clamp } from '../lib/common';

export type MapLabel = { pos: LL; text: string; sub?: string; o: number; big?: boolean; dx?: number; dy?: number; small?: boolean };
type Tex = Texture & { data: Uint8ClampedArray };
type Assets = { geo: GeoExtras | null; tex: Tex[] };

/* ---------- 에셋 로딩(지도 레이어 JSON, 지형 텍스처). 장면마다 다시 받지 않도록 모듈 캐시 ---------- */
const texCache = new Map<string, Promise<Tex>>(), geoCache = new Map<string, Promise<GeoExtras>>();
const loadTex = (t: Texture) => { if (!texCache.has(t.src)) texCache.set(t.src, new Promise<Tex>((res, rej) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(im, 0, 0); res({ ...t, w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data }); }; im.onerror = () => rej(new Error('지형 텍스처 로드 실패: ' + t.src)); im.src = staticFile(t.src); })); return texCache.get(t.src)!; };
const loadGeo = (src: string) => { if (!geoCache.has(src)) geoCache.set(src, fetch(staticFile(src)).then((r) => r.json())); return geoCache.get(src)!; };
export function useTravelAssets(p: TravelProps): Assets | null {
  const none = !p.assets?.geo && !p.assets?.terrain?.length;
  const [st, setSt] = useState<Assets | null>(none ? { geo: null, tex: [] } : null);
  const [handle] = useState(() => (none ? null : delayRender('travel-assets')));
  useEffect(() => { if (none || handle == null) return; Promise.all([p.assets?.geo ? loadGeo(p.assets.geo) : Promise.resolve(null), Promise.all((p.assets?.terrain ?? []).map(loadTex))]).then(([geo, tex]) => { setSt({ geo, tex }); continueRender(handle); }).catch((e) => cancelRender(e)); }, [none, handle, p.assets]);
  return st;
}

/* ---------- 이동수단 아이콘(위에서 본 모양, 진행 방향 = 위쪽) ---------- */
export const ModeIcon: React.FC<{ mode: Mode; size: number; color?: string; stroke?: string }> = ({ mode, size, color = '#fff', stroke }) => {
  const st = { fill: color, stroke, strokeWidth: stroke ? 1.2 : 0, strokeLinejoin: 'round' as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
      {mode === 'plane' && <path d="M12 1.2c.9 0 1.6.9 1.6 2.2v5.4l8.4 5v2.3l-8.4-2.6v4.8l2.3 1.8V22L12 21l-3.9 1v-1.9l2.3-1.8v-4.8L2 16.1v-2.3l8.4-5V3.4c0-1.3.7-2.2 1.6-2.2z" {...st} />}
      {mode === 'train' && <g><rect x="7.5" y="1" width="9" height="22" rx="4.5" {...st} /><rect x="9.2" y="3" width="5.6" height="4.2" rx="1.4" fill="#fff" opacity=".9" /><rect x="9.2" y="9" width="5.6" height="1.6" fill="#fff" opacity=".5" /></g>}
      {mode === 'car' && <g><rect x="6.5" y="2.5" width="11" height="19" rx="4" {...st} /><rect x="8.3" y="6.5" width="7.4" height="4.2" rx="1.2" fill="#fff" opacity=".9" /><rect x="8.3" y="15" width="7.4" height="2.6" rx="1" fill="#fff" opacity=".55" /></g>}
      {mode === 'walk' && <g><circle cx="12" cy="12" r="6.5" {...st} /><path d="M12 3.2l4 6H8z" {...st} /></g>}
      {mode === 'ship' && <g><path d="M12 1C15.6 4.6 17 8.6 17 13.5V20.5Q12 23.4 7 20.5V13.5C7 8.6 8.4 4.6 12 1z" {...st} /><rect x="9.2" y="11" width="5.6" height="6.5" rx="1.2" fill="#fff" opacity=".9" /></g>}
      {mode === 'bike' && <g><rect x="10.6" y="2" width="2.8" height="20" rx="1.4" {...st} /><rect x="7" y="6.2" width="10" height="2.2" rx="1.1" {...st} /><circle cx="12" cy="13" r="3.6" fill="#fff" stroke={color} strokeWidth="1.6" /></g>}
    </svg>
  );
};

const sliceTo = (l: Leg, u: number): { pts: LL[]; head: LL; ahead: LL; i: number } => {
  const tot = l.cum[l.cum.length - 1], d = clamp(u, 0, 1) * tot; let i = 1; while (i < l.cum.length - 1 && l.cum[i] < d) i++;
  const k = (d - l.cum[i - 1]) / Math.max(1e-9, l.cum[i] - l.cum[i - 1]), a = l.path[i - 1], b = l.path[i];
  const head: LL = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  return { pts: [...l.path.slice(0, i), head], head, ahead: l.path[Math.min(l.path.length - 1, i + 2)], i };
};

/* ---------- 지형 캔버스: 화면 픽셀 → 위경도 역변환 → 지형 텍스처 샘플링 ---------- */
const TerrainCanvas: React.FC<{ tex: Tex[]; center: LL; R: number; ptx: number; pty: number; x0: number; y0: number; x1: number; y1: number; S: number }> = ({ tex, center, R, ptx, pty, x0, y0, x1, y1, S }) => {
  const ref = useRef<HTMLCanvasElement>(null), cols = Math.ceil((x1 - x0) / S), rows = Math.ceil((y1 - y0) / S);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv || !tex.length) return; const ctx = cv.getContext('2d')!, img = ctx.createImageData(cols, rows), d = img.data;
    const lon0 = center[0], sin0 = Math.sin(center[1] * RAD), cos0 = Math.cos(center[1] * RAD), n = tex.length;
    for (let r = 0; r < rows; r++) { const Y = -((y0 + (r + 0.5) * S) - pty) / R;
      for (let c = 0; c < cols; c++) {
        const X = ((x0 + (c + 0.5) * S) - ptx) / R, r2 = X * X + Y * Y; if (r2 >= 1) continue;
        const cc = Math.sqrt(1 - r2), lon = lon0 + Math.atan2(X, cc * cos0 - Y * sin0) / RAD, lat = Math.asin(cc * sin0 + Y * cos0) / RAD;
        for (let k = 0; k < n; k++) { const t = tex[k]; if (lon < t.lon0 || lon > t.lon1 || lat < t.lat0 || lat > t.lat1) continue;
          const fx = Math.min(t.w - 1.001, Math.max(0, ((lon - t.lon0) / (t.lon1 - t.lon0)) * t.w - 0.5)), fy = Math.min(t.h - 1.001, Math.max(0, ((t.lat1 - lat) / (t.lat1 - t.lat0)) * t.h - 0.5));
          const xi = fx | 0, yi = fy | 0, ax = fx - xi, ay = fy - yi, i0 = (yi * t.w + xi) * 4, i1 = i0 + 4, i2 = i0 + t.w * 4, i3 = i2 + 4, td = t.data;
          const w0 = (1 - ax) * (1 - ay) * td[i0 + 3], w1 = ax * (1 - ay) * td[i1 + 3], w2 = (1 - ax) * ay * td[i2 + 3], w3 = ax * ay * td[i3 + 3], ws = w0 + w1 + w2 + w3;
          if (ws > 0) { const o = (r * cols + c) * 4; d[o] = (td[i0] * w0 + td[i1] * w1 + td[i2] * w2 + td[i3] * w3) / ws; d[o + 1] = (td[i0 + 1] * w0 + td[i1 + 1] * w1 + td[i2 + 1] * w2 + td[i3 + 1] * w3) / ws; d[o + 2] = (td[i0 + 2] * w0 + td[i1 + 2] * w1 + td[i2 + 2] * w2 + td[i3 + 2] * w3) / ws; d[o + 3] = ws; }
          break; }
      } }
    ctx.putImageData(img, 0, 0);
  }, [tex, center[0], center[1], R, ptx, pty, x0, y0, cols, rows, S]);
  return <canvas ref={ref} width={cols} height={rows} style={{ position: 'absolute', left: x0, top: y0, width: cols * S, height: rows * S }} />;
};

/** 지구본/기울인 지도 렌더러: 육지·지형 음영·호수·강·도로망·도시명 + 경로 궤적·이동수단·정차지 핀 + 라벨 */
export const TravelMap: React.FC<{
  p: TravelProps; legs: Leg[]; assets: Assets; center: LL; R: number; tilt?: number; tx?: number; ty?: number;
  progress: number[]; pins: boolean[]; labels?: MapLabel[]; vehicle?: { leg: number } | null; fog?: boolean; bg?: string; cityLabels?: boolean;
}> = ({ p, legs, assets, center, R, tilt = 0, tx, ty, progress, pins, labels = [], vehicle = null, fog = false, bg, cityLabels = true }) => {
  const { width: W, height: H } = useVideoConfig(); const portrait = H > W;
  // 세로 화면은 원근 거리를 화면 높이에 비례시켜 가로와 같은 투영 비율을 유지한다
  const persp = portrait ? Math.round(H * 1.39) : PERSP;
  const LW = W * 2, LH = H * 2.8, cx = LW / 2, cy = LH / 2, c = p.colors, ptx = cx + ((tx ?? W / 2) - W / 2), pty = cy + ((ty ?? H / 2) - H / 2);
  // 화면에 보일 수 있는 레이어 영역(기울이면 위쪽이 더 많이 보인다)
  const th = tilt * RAD, sTop = (-H / 2) * persp / (persp * Math.cos(th) + (-H / 2) * Math.sin(th)), sBot = (H / 2) * persp / (persp * Math.cos(th) + (H / 2) * Math.sin(th)), kTop = persp / (persp - sTop * Math.sin(th));
  const tx0 = portrait ? Math.min(LW / 2 - 10, (W / 2) / kTop * 1.12 + W * 0.1) : W * 0.78;
  const vx0 = tilt > 0 ? cx - tx0 : cx - W / 2, vx1 = tilt > 0 ? cx + tx0 : cx + W / 2, vy0 = tilt > 0 ? (portrait ? Math.max(0, cy + sTop - H * 0.1) : cy - H * 1.12) : cy - H / 2, vy1 = tilt > 0 ? (portrait ? cy + sBot + H * 0.1 : cy + H * 0.56) : cy + H / 2;
  const proj = makeProj(center, R, ptx, pty); proj.clipExtent([[vx0 - 40, vy0 - 40], [vx1 + 40, vy1 + 40]]);
  const gpath = geoPath(proj), diag = Math.hypot(W, H) * (tilt > 0 ? 1.7 : 1.15);
  const sphere = gpath({ type: 'Sphere' } as any) ?? '', lp = landPath(proj, center, R, diag), gp = graticulePath(proj, center, R, diag);
  const geo = assets.geo;
  const G = useMemo(() => (geo ? {
    roads: { type: 'MultiLineString', coordinates: geo.roads }, rails: { type: 'MultiLineString', coordinates: geo.rails },
    riversBig: { type: 'MultiLineString', coordinates: geo.rivers.filter((r) => r.r <= 6).map((r) => r.c) }, riversAll: { type: 'MultiLineString', coordinates: geo.rivers.map((r) => r.c) },
    st: [0, 1, 2, 3, 4].map((k) => ({ type: 'MultiLineString', coordinates: (geo.streets ?? []).filter((x) => x.k === k).map((x) => x.c) })),
    lakes: { type: 'MultiPolygon', coordinates: geo.lakes.map((l) => [l]) }, urban: { type: 'MultiPolygon', coordinates: geo.urban.map((l) => [l]) },
  } : null), [geo]);
  const D = (o: any) => gpath(o) ?? '';
  const veh = vehicle ? (() => { const l = legs[vehicle.leg], u = progress[vehicle.leg], s = sliceTo(l, u), a = proj(s.head), b = proj(s.ahead); return a && b ? { l, u, a, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD + 90, s } : null; })() : null;
  const screenOf = (ll: LL) => { const q = proj(ll); return q ? toScreen(q[0], q[1], W, H, tilt, cx, cy, persp) : null; };
  // 도시명: 축척에 따라 인구 기준을 바꾸고, 정차지와 겹치는 도시는 뺀다
  const minPop = R < 1400 ? Infinity : R < 4000 ? 3e6 : R < 10000 ? 9e5 : R < 30000 ? 2.5e5 : R < 90000 ? 5e4 : 0;
  const cities = cityLabels && geo ? geo.cities.filter((ct) => ct.pop >= minPop && !p.stops.some((s) => km([s.lon, s.lat], [ct.lon, ct.lat]) < Math.max(14, 90000 / R * 6))).map((ct) => ({ ct, q: proj([ct.lon, ct.lat]) })).filter((x) => x.q && x.q[0] > vx0 && x.q[0] < vx1 && x.q[1] > vy0 && x.q[1] < vy1).slice(0, 12) : [];
  const pxKm = R / 6371;

  return (
    <AbsoluteFill style={{ background: bg ?? c.ocean, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: persp, perspectiveOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: W / 2 - LW / 2, top: H / 2 - LH / 2, width: LW, height: LH, transform: `rotateX(${tilt}deg)`, transformOrigin: '50% 50%' }}>
          <svg width={LW} height={LH} style={{ position: 'absolute', left: 0, top: 0 }}>
            <path d={sphere} fill={c.ocean} />
            <path d={gp} fill="none" stroke="rgba(255,255,255,.075)" strokeWidth={1.4} />
            <path d={lp} fill={c.land} stroke="rgba(10,30,40,.35)" strokeWidth={1.2} strokeLinejoin="round" />
          </svg>
          {assets.tex.length > 0 && <TerrainCanvas tex={assets.tex} center={center} R={R} ptx={ptx} pty={pty} x0={vx0} y0={vy0} x1={vx1} y1={vy1} S={R > 250000 ? 3 : 5} />}
          <svg width={LW} height={LH} style={{ position: 'absolute', left: 0, top: 0 }}>
            <path d={gp} fill="none" stroke="rgba(15,42,53,.1)" strokeWidth={1.2} />
            {G && R > 6000 && <path d={D(G.urban)} fill="rgba(120,96,80,.2)" />}
            {G && R > 1500 && <path d={D(G.lakes)} fill={c.ocean} opacity={0.9} />}
            {G && R > 2200 && <path d={D(R > 9000 ? G.riversAll : G.riversBig)} fill="none" stroke="#5d93a6" strokeOpacity={0.75} strokeWidth={R > 9000 ? 2.4 : 1.6} strokeLinecap="round" strokeLinejoin="round" />}
            {G && R > 5000 && <path d={D(G.roads)} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={clamp(pxKm * 0.5, 1.4, 3.2)} strokeLinejoin="round" />}
            {G && R > 5000 && <path d={D(G.rails)} fill="none" stroke="rgba(15,42,53,.5)" strokeWidth={1.3} strokeDasharray="7 5" />}
            {G && R > 120000 && (() => { const k = clamp(pxKm / 110, 0.45, 2.2); return (<g strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d={D(G.st[4])} stroke="#4f8ea3" strokeWidth={9 * k} strokeOpacity={0.9} />
              <path d={D(G.st[2])} stroke="#fff" strokeWidth={2.2 * k} strokeOpacity={0.75} strokeDasharray={`${5 * k} ${5 * k}`} />
              <path d={D(G.st[1])} stroke="rgba(70,58,40,.28)" strokeWidth={6.5 * k} /><path d={D(G.st[1])} stroke="#fffdf7" strokeWidth={4.6 * k} />
              <path d={D(G.st[0])} stroke="rgba(70,58,40,.4)" strokeWidth={11.5 * k} /><path d={D(G.st[0])} stroke="#ffe7a8" strokeWidth={8.5 * k} />
              <path d={D(G.st[3])} stroke="rgba(15,42,53,.7)" strokeWidth={3 * k} strokeDasharray={`${10 * k} ${7 * k}`} /></g>); })()}
            {legs.map((l, i) => {
              const u = progress[i] ?? 0, col = MODE_COLOR[l.mode], full = linePath(proj, l.path), done = u > 0 ? sliceTo(l, u) : null;
              return (
                <g key={i}>
                  <path d={full} fill="none" stroke={col} strokeOpacity={0.3} strokeWidth={3} strokeDasharray="2 12" strokeLinecap="round" />
                  {done && l.mode !== 'walk' && <path d={linePath(proj, done.pts)} fill="none" stroke="rgba(15,42,53,.35)" strokeWidth={l.mode === 'plane' ? 9 : 13} strokeLinecap="round" strokeLinejoin="round" />}
                  {done && l.mode !== 'walk' && <path d={linePath(proj, done.pts)} fill="none" stroke={col} strokeWidth={l.mode === 'plane' ? 6 : 9} strokeLinecap="round" strokeLinejoin="round" />}
                  {done && l.mode === 'walk' && <Foot proj={proj} pts={done.pts} color={col} />}
                </g>
              );
            })}
            {cities.map(({ ct, q }, i) => (<g key={i} opacity={0.82}><circle cx={q![0]} cy={q![1]} r={5} fill="#fff" stroke={c.ink} strokeWidth={2.5} />
              <text x={q![0] + 12} y={q![1] + 8} fontFamily={FONT_UI} fontSize={24} fontWeight={700} fill={c.ink} stroke="rgba(255,255,255,.85)" strokeWidth={5} paintOrder="stroke" strokeLinejoin="round">{ct.n}</text></g>))}
            {p.stops.map((s, i) => { const q = pins[i] ? proj([s.lon, s.lat]) : null; return q ? <g key={i}><circle cx={q[0]} cy={q[1]} r={15} fill={c.ink} opacity={0.5} /><circle cx={q[0]} cy={q[1]} r={9} fill="#fff" stroke={c.accent} strokeWidth={4.5} /></g> : null; })}
            {veh && <Vehicle veh={veh} proj={proj} pxKm={pxKm} />}
          </svg>
        </div>
      </div>
      {fog && <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${c.ocean} 0%, ${c.ocean}e6 12%, ${c.ocean}00 40%)` }} />}
      {labels.map((lb, i) => { const s = screenOf(lb.pos); if (!s || s.x < -100 || s.x > W + 100 || s.y < -60 || s.y > H + 60) return null; const k = clamp(s.s, 0.75, 1.25) * (lb.big ? 1.25 : 1);
        return (<div key={i} style={{ position: 'absolute', left: s.x, top: s.y, transform: `translate(calc(-50% + ${lb.dx ?? 0}px), calc(-150% + ${lb.dy ?? 0}px)) scale(${k * (lb.small ? 0.82 : 1)})`, opacity: lb.o, fontFamily: FONT_UI, whiteSpace: 'nowrap', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#fff', color: c.ink, fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', padding: '6px 18px', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.35)' }}>{lb.text}</div>
          {lb.sub && <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 6, textShadow: '0 2px 10px rgba(0,0,0,.7)', ...TNUM }}>{lb.sub}</div>}
        </div>); })}
    </AbsoluteFill>
  );
};

type Veh = { l: Leg; u: number; a: [number, number]; ang: number; s: ReturnType<typeof sliceTo> };
/** 이동수단 연출: 비행기(고도·그림자·비행운), 기차(객차 여러 량), 배(항적), 자동차·자전거·도보 */
const Vehicle: React.FC<{ veh: Veh; proj: ReturnType<typeof makeProj>; pxKm: number }> = ({ veh, proj, pxKm }) => {
  const { l, u, a, ang } = veh, col = MODE_COLOR[l.mode], arc = Math.sin(Math.PI * clamp(u, 0, 1)), tot = l.cum[l.cum.length - 1];
  const at = (uu: number) => { const s = sliceTo(l, clamp(uu, 0, 1)), q = proj(s.head), b = proj(s.ahead); return q && b ? { q, ang: Math.atan2(b[1] - q[1], b[0] - q[0]) / RAD + 90 } : null; };
  const trail = (span: number, color: string, w0: number, w1: number, o0: number) => Array.from({ length: 7 }, (_, k) => { const u1 = u - (span * k) / 7, u0 = u - (span * (k + 1)) / 7; if (u1 <= 0) return null; const A = sliceTo(l, Math.max(0, u0)), B = sliceTo(l, u1), pts = [A.head, ...l.path.slice(A.i, B.i), B.head];
    return <path key={k} d={linePath(proj, pts)} fill="none" stroke={color} strokeOpacity={o0 * (1 - k / 7)} strokeWidth={w0 + ((w1 - w0) * k) / 7} strokeLinecap="round" />; });
  if (l.mode === 'plane') { const sc = 3.0 + 0.9 * arc, alt = 8 + 46 * arc;
    return (<g>{trail(0.2, '#fff', 5, 16, 0.6)}
      <g transform={`translate(${a[0] + alt * 0.45},${a[1] + alt * 0.9}) rotate(${ang}) scale(${sc * 0.86}) translate(-12,-12)`} opacity={0.3 - 0.12 * arc}><ModeIcon mode="plane" size={24} color="#000" /></g>
      <g transform={`translate(${a[0]},${a[1] - alt * 0.35}) rotate(${ang}) scale(${sc}) translate(-12,-12)`}><ModeIcon mode="plane" size={24} color={col} stroke="#fff" /></g></g>); }
  if (l.mode === 'train') { const sc = 2.2, gap = (24 * sc * 0.98) / Math.max(1e-6, pxKm) / Math.max(1e-6, tot);
    return (<g>{[3, 2, 1, 0].map((k) => { const v = at(u - gap * k); if (!v || u - gap * k < 0) return null; return (
      <g key={k}><g transform={`translate(${v.q[0] + 5},${v.q[1] + 7}) rotate(${v.ang}) scale(${sc}) translate(-12,-12)`} opacity={0.3}><rect x="7.5" y="0.5" width="9" height="23" rx={k ? 2 : 4.5} fill="#000" /></g>
        <g transform={`translate(${v.q[0]},${v.q[1]}) rotate(${v.ang}) scale(${sc}) translate(-12,-12)`}>{k === 0 ? <ModeIcon mode="train" size={24} color={col} stroke="#fff" /> : <g><rect x="7.5" y="0.5" width="9" height="23" rx="2" fill={col} stroke="#fff" strokeWidth="1.2" /><rect x="9.4" y="3" width="5.2" height="18" rx="1" fill="#fff" opacity=".45" /></g>}</g></g>); })}</g>); }
  const sc = l.mode === 'ship' ? 2.8 : l.mode === 'car' ? 2.4 : 2.0;
  return (<g>{l.mode === 'ship' && trail(0.1, '#fff', 4, 22, 0.5)}
    <g transform={`translate(${a[0] + 6},${a[1] + 8}) rotate(${ang}) scale(${sc}) translate(-12,-12)`} opacity={0.32}><ModeIcon mode={l.mode} size={24} color="#000" /></g>
    {l.mode === 'walk' && <circle cx={a[0]} cy={a[1]} r={22 + 10 * Math.sin(u * 60)} fill={col} opacity={0.22} />}
    <g transform={`translate(${a[0]},${a[1]}) rotate(${ang}) scale(${sc}) translate(-12,-12)`}><ModeIcon mode={l.mode} size={24} color={col} stroke="#fff" /></g></g>);
};

/** 도보 구간: 발자국(좌우 교대) */
const Foot: React.FC<{ proj: ReturnType<typeof makeProj>; pts: LL[]; color: string }> = ({ proj, pts, color }) => {
  const out: React.ReactNode[] = []; const step = 5;
  for (let i = step; i < pts.length; i += step) {
    const a = proj(pts[i - step]), b = proj(pts[i]); if (!a || !b) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), side = (i / step) % 2 ? 1 : -1, nx = -Math.sin(ang) * 8 * side, ny = Math.cos(ang) * 8 * side;
    out.push(<ellipse key={i} cx={b[0] + nx} cy={b[1] + ny} rx={5} ry={9} fill={color} stroke="rgba(15,42,53,.45)" strokeWidth={1.5} transform={`rotate(${ang / RAD + 90} ${b[0] + nx} ${b[1] + ny})`} />);
  }
  return <g>{out}</g>;
};
