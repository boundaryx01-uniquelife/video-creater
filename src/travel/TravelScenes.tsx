import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { geoDistance } from 'd3-geo';
import type { LL, Leg, TravelProps } from './types.ts';
import { MODE_COLOR, MODE_LABEL, pointAt, slerp, RAD } from './geo.ts';
import { ModeIcon, TravelMap, MapLabel, useTravelAssets } from './TravelMap';
type Assets = NonNullable<ReturnType<typeof useTravelAssets>>;
import { FONT_UI, TNUM, clamp, easeInOut, easeOut, fitFont, lerp, prog } from '../lib/common';
import { useLayout, wrapTitle } from '../lib/layout';

const fmtMin = (m: number) => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? `${h}시간 ${String(mm).padStart(2, '0')}분` : `${mm}분`; };
const fmtKm = (k: number) => (k >= 10 ? Math.round(k).toLocaleString() : k.toFixed(1));
const ll = (s: { lon: number; lat: number }): LL => [s.lon, s.lat];
export const totals = (legs: Leg[]) => ({ km: legs.reduce((a, l) => a + l.km, 0), min: legs.reduce((a, l) => a + l.min, 0) });
const Mask: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => (<div style={{ overflow: 'hidden', paddingBottom: '0.08em' }}><div style={{ transform: `translateY(${(1 - p) * 108}%)` }}>{children}</div></div>);

/** 인트로: 지구본이 회전하며 여정 전체 경로가 그려지고, 제목과 핵심 수치가 올라온다 */
export const TravelIntro: React.FC<{ p: TravelProps; legs: Leg[]; assets: Assets }> = ({ p, legs, assets }) => {
  const f = useCurrentFrame(); const { W, H, PAD, portrait } = useLayout();
  const c = p.colors, tot = totals(legs); const mid = slerp(ll(p.stops[0]), ll(p.stops[p.stops.length - 1]), 0.5);
  const a = (d: number, dur = 22) => prog(f, d, dur, easeOut);
  const spin = 1 - prog(f, 0, 110, easeInOut), center: LL = [mid[0] + spin * -70, lerp(mid[1], 24, spin * 0.6)];
  const progress = legs.map((_, i) => prog(f, 52 + i * 20, 30, easeInOut)), pins = p.stops.map((_, i) => f > 46 + i * 20);
  const modes = new Set(legs.map((l) => l.mode)).size;
  const chips = [{ k: '기간', v: p.info.range }, { k: '이동 거리', v: `${Math.round(tot.km).toLocaleString()} km` }, { k: '방문', v: `${p.stops.length - 1}곳` }, { k: '이동수단', v: `${modes}종` }];
  if (portrait) {
    const tl = wrapTitle(p.info.title.split('\n'), 6), tfs = Math.min(Math.round(H * 0.085), ...tl.map((l) => fitFont(l, 999, W - PAD * 2 + 8, 0.95)));
    return (
      <AbsoluteFill style={{ background: '#08161c', fontFamily: FONT_UI, color: '#f6f3ea', overflow: 'hidden' }}>
        <TravelMap p={p} legs={legs} assets={assets} center={center} R={W * (0.46 + 0.05 * (1 - spin))} tx={W * 0.5} ty={H * 0.56} progress={progress} pins={pins} bg="#08161c" cityLabels={false} />
        <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(8,22,28,.92) 0%, rgba(8,22,28,.6) 26%, rgba(8,22,28,0) 44%, rgba(8,22,28,0) 66%, rgba(8,22,28,.92) 100%)' }} />
        <div style={{ position: 'absolute', left: PAD, top: 64, display: 'flex', alignItems: 'center', gap: 18, fontSize: 28, fontWeight: 700, letterSpacing: '0.12em', opacity: a(2) }}><div style={{ width: lerp(0, 70, a(2)), height: 8, background: c.accent }} />{p.info.kicker}</div>
        <div style={{ position: 'absolute', left: PAD - 8, right: PAD, top: H * 0.09 }}>
          {tl.map((l, i) => <Mask key={i} p={a(8 + i * 6, 26)}><div style={{ fontSize: tfs, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, whiteSpace: 'nowrap' }}>{l}</div></Mask>)}
          <div style={{ fontSize: 42, fontWeight: 600, marginTop: 22, opacity: a(26) * 0.92, lineHeight: 1.3 }}>{p.info.sub}</div>
        </div>
        <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: H * 0.07, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px 40px' }}>
          {chips.map((x, i) => (<div key={i} style={{ borderTop: '2px solid rgba(255,255,255,.5)', paddingTop: 12, opacity: a(30 + i * 5), transform: `translateY(${(1 - a(30 + i * 5)) * 18}px)` }}><div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.65 }}>{x.k}</div><div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1.2, ...TNUM }}>{x.v}</div></div>))}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: '#08161c', fontFamily: FONT_UI, color: '#f6f3ea', overflow: 'hidden' }}>
      <TravelMap p={p} legs={legs} assets={assets} center={center} R={H * (0.4 + 0.05 * (1 - spin))} tx={W * 0.69} ty={H * 0.52} progress={progress} pins={pins} bg="#08161c" cityLabels={false} />
      <AbsoluteFill style={{ background: 'linear-gradient(to right, rgba(8,22,28,.92) 0%, rgba(8,22,28,.55) 42%, rgba(8,22,28,0) 62%)' }} />
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, display: 'flex', alignItems: 'center', gap: 18, fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', opacity: a(2) }}><div style={{ width: lerp(0, 70, a(2)), height: 8, background: c.accent }} />{p.info.kicker}</div>
      <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.24 }}>
        {p.info.title.split('\n').map((l, i) => <Mask key={i} p={a(8 + i * 6, 26)}><div style={{ fontSize: Math.round(H * 0.17), fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, whiteSpace: 'nowrap' }}>{l}</div></Mask>)}
        <div style={{ fontSize: 40, fontWeight: 600, marginTop: 22, opacity: a(26) * 0.92 }}>{p.info.sub}</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, bottom: H * 0.09, display: 'flex', gap: 40 }}>
        {chips.map((x, i) => (<div key={i} style={{ borderTop: '2px solid rgba(255,255,255,.5)', paddingTop: 12, minWidth: 180, opacity: a(30 + i * 5), transform: `translateY(${(1 - a(30 + i * 5)) * 18}px)` }}><div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.65 }}>{x.k}</div><div style={{ fontSize: 33, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, ...TNUM }}>{x.v}</div></div>))}
      </div>
    </AbsoluteFill>
  );
};

/** 이동 구간: 기울인 3D 지도에서 이동수단 아이콘이 경로를 따라 이동. 거리·시간·속도 HUD는 사진 GPS·촬영 시각에서 계산 */
export const TravelLeg: React.FC<{ p: TravelProps; legs: Leg[]; assets: Assets; i: number; dur: number }> = ({ p, legs, assets, i, dur }) => {
  const f = useCurrentFrame(); const { W, H, PAD, portrait } = useLayout();
  const l = legs[i], c = p.colors, A = ll(p.stops[l.a]), B = ll(p.stops[l.b]), col = MODE_COLOR[l.mode];
  const u = prog(f, 14, dur - 42, easeInOut), pos = pointAt(l, u).p;
  const th = Math.max(1e-5, geoDistance(A, B)), Rfit = clamp(((portrait ? 0.4 : 0.44) * W) / th, 500, (W * 6371) / (l.mode === 'walk' ? 28 : 9)), M = slerp(A, B, 0.5);
  const s = Math.sin(Math.PI * u), zf = 1 + (l.mode === 'plane' ? 1.1 : l.mode === 'walk' ? 0.6 : 1.6) * Math.pow(1 - s, 1.3), wgt = Math.pow(1 - s, 1.2);
  const center = slerp(M, pos, 0.25 + 0.75 * wgt), R = Rfit * zf, tilt = (l.mode === 'plane' || l.mode === 'ship' ? 30 : 36) * prog(f, 0, 26, easeOut);
  const progress = legs.map((x, k) => (k < i ? 1 : k === i ? u : 0)), pins = p.stops.map((_, k) => k <= l.a || (k === l.b && u > 0.97));
  const arrive = prog(f, dur - 34, 14, easeOut);
  const labels: MapLabel[] = [{ pos: A, text: p.stops[l.a].name, o: 1 - 0.65 * prog(f, 20, 30) }, { pos: B, text: p.stops[l.b].name, sub: p.stops[l.b].sub, o: arrive, big: true }];
  const lat = pos[1], lon = pos[0], hud = (d: number, dur2 = 18) => prog(f, d, dur2, easeOut);
  const wipe = prog(f, dur - 10, 10, easeInOut);
  const mins = l.min * u;
  const wallNow = l.t0 + (l.t1 - l.t0) * u, dn = new Date(wallNow * 60000), hr = dn.getUTCHours() + dn.getUTCMinutes() / 60, z2 = (n: number) => String(n).padStart(2, '0');
  const ss = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const night = 1 - ss(5, 7, hr) + ss(18.8, 20.6, hr), golden = Math.max(0, 1 - Math.abs(hr - 18.2) / 1.6, 1 - Math.abs(hr - 6.3) / 1.3);
  return (
    <AbsoluteFill style={{ fontFamily: FONT_UI, color: '#f6f3ea', overflow: 'hidden' }}>
      <TravelMap p={p} legs={legs} assets={assets} center={center} R={R} tilt={tilt} progress={progress} pins={pins} labels={labels} vehicle={{ leg: i }} fog />
      <AbsoluteFill style={{ background: `rgba(14,22,70,${0.5 * clamp(night, 0, 1)})`, mixBlendMode: 'multiply' }} />
      <AbsoluteFill style={{ background: `rgba(255,132,48,${0.17 * clamp(golden, 0, 1)})`, mixBlendMode: 'soft-light' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(6,18,24,.55) 0%, rgba(6,18,24,0) 22%, rgba(6,18,24,0) 62%, rgba(6,18,24,.62) 100%)' }} />
      {portrait ? (<>
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: 64, opacity: hud(4) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 70, height: 70, borderRadius: 35, background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ModeIcon mode={l.mode} size={38} color="#0f2a35" /></div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.04em' }}>{MODE_LABEL[l.mode]}</div>
            <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.7, marginLeft: 8 }}>{`구간 ${i + 1} / ${legs.length}`}</div>
          </div>
          <div style={{ fontSize: Math.min(76, fitFont(`${p.stops[l.a].name} → ${p.stops[l.b].name}`, 999, W - PAD * 2, 0.95)), fontWeight: 900, letterSpacing: '-0.045em', marginTop: 14, whiteSpace: 'nowrap' }}>{p.stops[l.a].name} <span style={{ color: col }}>→</span> {p.stops[l.b].name}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 14, opacity: hud(8), ...TNUM }}>
            <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{z2(dn.getUTCHours())}:{z2(dn.getUTCMinutes())}</span>
            <span style={{ fontSize: 26, fontWeight: 700, opacity: 0.8 }}>{dn.getUTCMonth() + 1}월 {dn.getUTCDate()}일 · 현지 시각</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, opacity: 0.6, marginTop: 6, ...TNUM }}>{Math.abs(lat).toFixed(3)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lon).toFixed(3)}°{lon >= 0 ? 'E' : 'W'}</div>
        </div>
        <div style={{ position: 'absolute', left: PAD, bottom: H * 0.075, opacity: hud(8) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}><span style={{ fontSize: Math.round(H * 0.07), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, ...TNUM }}>{fmtKm(l.km * u)}</span><span style={{ fontSize: 44, fontWeight: 800 }}>km</span></div>
          <div style={{ display: 'flex', gap: 32, marginTop: 10, fontSize: 32, fontWeight: 700, ...TNUM }}><span>{fmtMin(mins)}</span><span style={{ opacity: 0.7 }}>평균 {Math.round(l.speed)} km/h</span></div>
        </div>
        <div style={{ position: 'absolute', right: PAD, bottom: H * 0.082, width: W * 0.3, opacity: hud(12) }}>
          <div style={{ display: 'flex', gap: 8 }}>{legs.map((x, k) => (<div key={k} style={{ flex: 1 }}><div style={{ height: 10, background: 'rgba(255,255,255,.22)', overflow: 'hidden' }}><div style={{ width: `${(k < i ? 1 : k === i ? u : 0) * 100}%`, height: '100%', background: MODE_COLOR[x.mode] }} /></div><div style={{ marginTop: 10 }}><ModeIcon mode={x.mode} size={26} color={k === i ? MODE_COLOR[x.mode] : 'rgba(255,255,255,.55)'} /></div></div>))}</div>
        </div>
      </>) : (<>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.62, opacity: hud(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ModeIcon mode={l.mode} size={38} color="#0f2a35" /></div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.04em' }}>{MODE_LABEL[l.mode]}</div>
          <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.7, marginLeft: 8 }}>{`구간 ${i + 1} / ${legs.length}`}</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: '-0.045em', marginTop: 14, whiteSpace: 'nowrap' }}>{p.stops[l.a].name} <span style={{ color: col }}>→</span> {p.stops[l.b].name}</div>
      </div>
      <div style={{ position: 'absolute', right: PAD, top: PAD * 0.55, opacity: hud(8), textAlign: 'right', ...TNUM }}>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{z2(dn.getUTCHours())}:{z2(dn.getUTCMinutes())}</div>
        <div style={{ fontSize: 24, fontWeight: 700, opacity: 0.8, marginTop: 6 }}>{dn.getUTCMonth() + 1}월 {dn.getUTCDate()}일 · 현지 시각</div>
        <div style={{ fontSize: 19, fontWeight: 600, opacity: 0.6, marginTop: 6 }}>{Math.abs(lat).toFixed(3)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lon).toFixed(3)}°{lon >= 0 ? 'E' : 'W'}</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, bottom: H * 0.07, opacity: hud(8) }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}><span style={{ fontSize: Math.round(H * 0.15), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, ...TNUM }}>{fmtKm(l.km * u)}</span><span style={{ fontSize: 44, fontWeight: 800 }}>km</span></div>
        <div style={{ display: 'flex', gap: 48, marginTop: 8, fontSize: 32, fontWeight: 700, ...TNUM }}><span>{fmtMin(mins)}</span><span style={{ opacity: 0.7 }}>평균 {Math.round(l.speed)} km/h</span></div>
      </div>
      <div style={{ position: 'absolute', right: PAD, bottom: H * 0.085, width: W * 0.3, opacity: hud(12) }}>
        <div style={{ display: 'flex', gap: 8 }}>{legs.map((x, k) => (<div key={k} style={{ flex: 1 }}><div style={{ height: 10, background: 'rgba(255,255,255,.22)', overflow: 'hidden' }}><div style={{ width: `${(k < i ? 1 : k === i ? u : 0) * 100}%`, height: '100%', background: MODE_COLOR[x.mode] }} /></div><div style={{ marginTop: 10 }}><ModeIcon mode={x.mode} size={26} color={k === i ? MODE_COLOR[x.mode] : 'rgba(255,255,255,.55)'} /></div></div>))}</div>
      </div>
      </>)}
      <div style={{ position: 'absolute', inset: 0, background: c.light, transform: `translateX(${(wipe - 1) * 100}%)` }} />
    </AbsoluteFill>
  );
};

/** 아웃트로: 전체 경로를 이동수단별 색으로 보여주고 총 이동 거리·수단별 거리를 요약 */
export const TravelOutro: React.FC<{ p: TravelProps; legs: Leg[]; assets: Assets }> = ({ p, legs, assets }) => {
  const f = useCurrentFrame(); const { W, H, PAD, portrait } = useLayout();
  const c = p.colors, tot = totals(legs), a = (d: number, dur = 22) => prog(f, d, dur, easeOut);
  const pts = p.stops.map(ll), cen: LL = [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
  const th = Math.max(...pts.map((q) => geoDistance(cen, q))), R = ((portrait ? 0.3 * W : 0.4 * H)) / Math.max(th, 1e-4);
  const progress = legs.map((_, i) => prog(f, 6 + i * 14, 34, easeInOut)), pins = p.stops.map(() => true);
  const OFF = [{ dx: -10, dy: -6 }, { dx: 70, dy: -34 }, { dx: 110, dy: 96 }, { dx: -96, dy: 112 }, { dx: -60, dy: 36 }];
  const labels: MapLabel[] = p.stops.map((s, i) => ({ pos: ll(s), text: s.name, o: prog(f, 14 + i * 12, 14), small: true, ...(OFF[i] ?? {}) }));
  const byMode = (['plane', 'train', 'car', 'ship', 'bike', 'walk'] as const).map((m) => ({ m, km: legs.filter((l) => l.mode === m).reduce((x, l) => x + l.km, 0), min: legs.filter((l) => l.mode === m).reduce((x, l) => x + l.min, 0) })).filter((x) => x.km > 0);
  const count = tot.km * prog(f, 4, 46, easeOut), fin = prog(f, 150, 18, easeInOut);
  if (portrait) {
    const ttl = p.info.title.replace('\n', ' ');
    return (
      <AbsoluteFill style={{ background: '#08161c', fontFamily: FONT_UI, color: '#f6f3ea', overflow: 'hidden' }}>
        <TravelMap p={p} legs={legs} assets={assets} center={cen} R={R} tx={W * 0.5} ty={H * 0.3} progress={progress} pins={pins} labels={labels} bg="#08161c" cityLabels={false} />
        <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(8,22,28,.7) 0%, rgba(8,22,28,0) 14%, rgba(8,22,28,0) 40%, rgba(8,22,28,.96) 60%)' }} />
        <div style={{ position: 'absolute', left: PAD, top: 64, fontSize: 28, fontWeight: 700, letterSpacing: '0.12em', opacity: a(0), display: 'flex', alignItems: 'center', gap: 18 }}><div style={{ width: 70, height: 8, background: c.accent }} />TRIP SUMMARY</div>
        <div style={{ position: 'absolute', left: PAD - 6, right: PAD, top: H * 0.56 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}><span style={{ fontSize: Math.round(H * 0.12), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, ...TNUM }}>{Math.round(count).toLocaleString()}</span><span style={{ fontSize: 56, fontWeight: 800 }}>km</span></div>
          <div style={{ fontSize: 38, fontWeight: 600, opacity: 0.85 * a(30), marginTop: 12 }}>{p.stops.length - 1}곳 · {fmtMin(tot.min)} 이동</div>
        </div>
        <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: H * 0.075 }}>
          {byMode.map((x, i) => (<div key={x.m} style={{ display: 'flex', alignItems: 'center', gap: 18, borderTop: '2px solid rgba(255,255,255,.25)', padding: '16px 0', opacity: a(36 + i * 7), transform: `translateX(${(1 - a(36 + i * 7)) * -24}px)` }}>
            <ModeIcon mode={x.m} size={36} color={MODE_COLOR[x.m]} /><div style={{ flex: 1, fontSize: 34, fontWeight: 800 }}>{MODE_LABEL[x.m]}</div>
            <div style={{ fontSize: 34, fontWeight: 800, ...TNUM }}>{fmtKm(x.km)} km</div><div style={{ width: 200, textAlign: 'right', fontSize: 26, fontWeight: 600, opacity: 0.65, ...TNUM }}>{fmtMin(x.min)}</div>
          </div>))}
        </div>
        {assets.geo?.credits && <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: 30, fontSize: 17, fontWeight: 600, opacity: 0.55 * a(40) }}>지도 데이터: {assets.geo.credits.join(' · ')}</div>}
        <div style={{ position: 'absolute', inset: 0, background: '#08161c', opacity: fin }} />
        <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: H * 0.14, opacity: fin * prog(f, 156, 12), fontSize: Math.min(Math.round(H * 0.08), fitFont(ttl, 999, W - PAD * 2, 0.95)), fontWeight: 900, letterSpacing: '-0.05em', whiteSpace: 'nowrap' }}>{ttl}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: '#08161c', fontFamily: FONT_UI, color: '#f6f3ea', overflow: 'hidden' }}>
      <TravelMap p={p} legs={legs} assets={assets} center={cen} R={R} tx={W * 0.67} ty={H * 0.5} progress={progress} pins={pins} labels={labels} bg="#08161c" cityLabels={false} />
      <AbsoluteFill style={{ background: 'linear-gradient(to right, rgba(8,22,28,.95) 0%, rgba(8,22,28,.6) 40%, rgba(8,22,28,0) 60%)' }} />
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', opacity: a(0), display: 'flex', alignItems: 'center', gap: 18 }}><div style={{ width: 70, height: 8, background: c.accent }} />TRIP SUMMARY</div>
      <div style={{ position: 'absolute', left: PAD - 6, top: H * 0.16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}><span style={{ fontSize: Math.round(H * 0.2), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, ...TNUM }}>{Math.round(count).toLocaleString()}</span><span style={{ fontSize: 52, fontWeight: 800 }}>km</span></div>
        <div style={{ fontSize: 36, fontWeight: 600, opacity: 0.85 * a(30), marginTop: 12 }}>{p.stops.length - 1}곳 · {fmtMin(tot.min)} 이동</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, bottom: H * 0.1, width: W * 0.4 }}>
        {byMode.map((x, i) => (<div key={x.m} style={{ display: 'flex', alignItems: 'center', gap: 18, borderTop: '2px solid rgba(255,255,255,.25)', padding: '14px 0', opacity: a(36 + i * 7), transform: `translateX(${(1 - a(36 + i * 7)) * -24}px)` }}>
          <ModeIcon mode={x.m} size={34} color={MODE_COLOR[x.m]} /><div style={{ flex: 1, fontSize: 32, fontWeight: 800 }}>{MODE_LABEL[x.m]}</div>
          <div style={{ fontSize: 32, fontWeight: 800, ...TNUM }}>{fmtKm(x.km)} km</div><div style={{ width: 190, textAlign: 'right', fontSize: 24, fontWeight: 600, opacity: 0.65, ...TNUM }}>{fmtMin(x.min)}</div>
        </div>))}
      </div>
      {assets.geo?.credits && <div style={{ position: 'absolute', right: PAD, bottom: PAD * 0.45, fontSize: 17, fontWeight: 600, opacity: 0.55 * a(40), textAlign: 'right' }}>지도 데이터: {assets.geo.credits.join(' · ')}</div>}
      <div style={{ position: 'absolute', inset: 0, background: '#08161c', opacity: fin }} />
      <div style={{ position: 'absolute', left: PAD, bottom: H * 0.14, opacity: fin * prog(f, 156, 12), fontSize: Math.round(H * 0.12), fontWeight: 900, letterSpacing: '-0.05em' }}>{p.info.title.replace('\n', ' ')}</div>
    </AbsoluteFill>
  );
};
export { fmtMin, fmtKm };
