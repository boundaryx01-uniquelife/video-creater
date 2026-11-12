import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { MODES, ModeSpec, Rail } from './config';
import { FONT_UI, Photo, TNUM, clamp, easeInOut, easeOut, fitFont, lerp, prog } from '../lib/common';

export type Slots = { intro?: string; card?: string };
const img = (m: ModeSpec, k: 'L' | 'P', n: number) => `media/${m.id}_${k}${n}.jpg`;
const useGeo = () => { const { width: W, height: H } = useVideoConfig(); return { W, H, PAD: Math.round(W * 0.0625), PW: Math.round(H * 0.75) }; };
const Mask: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, children, style }) => (
  <div style={{ overflow: 'hidden', paddingBottom: '0.08em', ...style }}><div style={{ transform: `translateY(${(1 - p) * 108}%)` }}>{children}</div></div>
);

/* ---------- 인트로 ---------- */
export const ModeIntro: React.FC<{ mode: string; spec?: ModeSpec; photos?: Slots }> = ({ mode, spec, photos }) => {
  const m = spec ?? MODES[mode], it = m.intro, f = useCurrentFrame(); const { W, H, PAD } = useGeo();
  const a = (d: number, dur = 22) => prog(f, d, dur, easeOut);
  const lines = it.title.split('\n'), longest = lines.reduce((x, y) => (x.length > y.length ? x : y));
  const chips = (white: boolean, col: string) => (
    <div style={{ display: 'flex', gap: 56 }}>{it.chips.map((c, i) => (
      <div key={i} style={{ opacity: a(30 + i * 5), transform: `translateY(${(1 - a(30 + i * 5)) * 18}px)`, borderTop: `2px solid ${white ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.35)'}`, paddingTop: 14, minWidth: 220, color: col }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.7 }}>{c.k}</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, ...TNUM }}>{c.v}</div>
      </div>))}</div>
  );
  if (it.layout === 'photo') {
    const fs = Math.min(Math.round(H * 0.2), fitFont(longest, 999, W * 0.8, 0.95));
    return (
      <AbsoluteFill style={{ background: m.ink, fontFamily: FONT_UI, color: '#fff', overflow: 'hidden' }}>
        <Photo src={photos?.intro ?? img(m, 'L', 1)} scale={interpolate(f, [0, 90], [1.14, 1.04])} style={{ filter: 'brightness(.8)' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.3) 45%, rgba(0,0,0,.25) 100%)' }} />
        <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, display: 'flex', alignItems: 'center', gap: 18, opacity: a(2), fontSize: 26, fontWeight: 700, letterSpacing: '0.12em' }}>
          <div style={{ width: lerp(0, 70, a(2)), height: 8, background: m.accent }} />{it.kicker}
        </div>
        <div style={{ position: 'absolute', left: PAD - 8, bottom: H * 0.3 }}>
          {lines.map((l, i) => <Mask key={i} p={a(8 + i * 6, 26)}><div style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.02, whiteSpace: 'nowrap' }}>{l}</div></Mask>)}
          <div style={{ fontSize: 40, fontWeight: 600, marginTop: 22, opacity: a(24) * 0.9 }}>{it.sub}</div>
        </div>
        <div style={{ position: 'absolute', left: PAD, bottom: H * 0.085 }}>{chips(true, '#fff')}</div>
      </AbsoluteFill>
    );
  }
  if (it.layout === 'split') {
    const LW = Math.round(W * 0.5), isA = it.panel === 'accent', bg = isA ? m.accent : m.light, fg = isA ? m.onAccent : m.ink;
    const fs = Math.min(Math.round(H * 0.15), fitFont(longest, 999, LW - PAD * 1.6, 0.95));
    return (
      <AbsoluteFill style={{ background: bg, fontFamily: FONT_UI, color: fg, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: LW, top: 0, right: 0, bottom: 0, clipPath: `inset(${(1 - a(0, 30)) * 100}% 0 0 0)` }}><Photo src={photos?.intro ?? img(m, 'P', 1)} scale={interpolate(f, [0, 90], [1.16, 1.04])} /></div>
        <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', opacity: a(2) }}>{it.kicker}</div>
        <div style={{ position: 'absolute', left: PAD - 6, top: H * 0.24 }}>
          {lines.map((l, i) => <Mask key={i} p={a(8 + i * 6, 26)}><div style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04 }}>{l}</div></Mask>)}
          <div style={{ fontSize: 38, fontWeight: 700, marginTop: 24, opacity: a(24) }}>{it.sub}</div>
        </div>
        <div style={{ position: 'absolute', left: PAD, bottom: H * 0.1, display: 'flex', flexDirection: 'column', gap: 18, width: LW - PAD * 1.5 }}>
          {it.chips.map((c, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `2px solid ${isA ? 'rgba(0,0,0,.4)' : 'rgba(0,0,0,.25)'}`, paddingTop: 12, opacity: a(30 + i * 5) }}>
            <span style={{ fontSize: 22, fontWeight: 700, opacity: 0.7 }}>{c.k}</span><span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', ...TNUM }}>{c.v}</span></div>))}
        </div>
      </AbsoluteFill>
    );
  }
  const fs = Math.min(Math.round(H * 0.3), fitFont(longest, 999, W - PAD * 2, 0.9));
  return (
    <AbsoluteFill style={{ background: m.light, fontFamily: FONT_UI, color: m.ink, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, display: 'flex', alignItems: 'center', gap: 18, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', opacity: a(2) }}><div style={{ width: lerp(0, 70, a(2)), height: 8, background: m.accent }} />{it.kicker}</div>
      <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.13 }}>
        {lines.map((l, i) => <Mask key={i} p={a(6 + i * 6, 28)}><div style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, whiteSpace: 'nowrap' }}>{l}</div></Mask>)}
      </div>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.13 + fs * 1.08, fontSize: 40, fontWeight: 700, opacity: a(22) }}>{it.sub}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.4, clipPath: `inset(${(1 - a(10, 30)) * 100}% 0 0 0)`, overflow: 'hidden' }}>
        <Photo src={photos?.intro ?? img(m, 'L', 2)} fy={0.55} scale={interpolate(f, [0, 90], [1.14, 1.04])} />
        <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,0) 70%)' }} />
        <div style={{ position: 'absolute', left: PAD, bottom: H * 0.05 }}>{chips(true, '#fff')}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 레일(모드별 데이터 시각화) ---------- */
const RailView: React.FC<{ r: Rail; m: ModeSpec; x0: number; x1: number; y: number; f: number }> = ({ r, m, x0, x1, y, f }) => {
  const w = x1 - x0, ink = m.ink, a = prog(f, 16, 24, easeOut);
  const T = (props: React.SVGProps<SVGTextElement>) => <text fontSize={21} fontWeight={600} fill={ink} fontFamily={FONT_UI} style={TNUM} {...props} />;
  if (r.type === 'time') {
    const sx = (h: number) => x0 + ((h - r.from) / (r.to - r.from)) * w;
    return (<g>
      <line x1={x0} x2={x1} y1={y + 40} y2={y + 40} stroke={ink} opacity={0.3} strokeWidth={2} />
      {Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i).map((h) => (<g key={h}><line x1={sx(h)} x2={sx(h)} y1={y + 40} y2={y + 50} stroke={ink} opacity={0.4} strokeWidth={2} /><T x={sx(h)} y={y + 78} textAnchor="middle" opacity={0.55}>{h}</T></g>))}
      {r.blocks.map(([s, e], i) => { const on = i === r.active; return <rect key={i} x={sx(s)} y={y} width={(sx(e) - sx(s)) * a} height={34} fill={on ? m.accent : ink} opacity={on ? 1 : 0.2} />; })}
      <text x={sx(r.blocks[r.active][0])} y={y - 16} fontSize={26} fontWeight={800} fill={ink} fontFamily={FONT_UI} style={TNUM} opacity={a}>{r.label}</text>
    </g>);
  }
  if (r.type === 'progress') {
    return (<g>
      <rect x={x0} y={y} width={w} height={22} rx={11} fill={ink} opacity={0.14} />
      <rect x={x0} y={y} width={Math.max(22, w * r.value * a)} height={22} rx={11} fill={m.accent} />
      <text x={x0 + w * r.value * a + 16} y={y - 14} fontSize={30} fontWeight={800} fill={ink} fontFamily={FONT_UI} style={TNUM} textAnchor="middle" opacity={a}>{Math.round(r.value * 100 * a)}%</text>
      {r.marks.map((l, i) => { const x = x0 + (i / (r.marks.length - 1)) * w; const on = i === r.active; return <g key={i}><circle cx={x} cy={y + 11} r={on ? 7 : 4} fill={on ? ink : '#fff'} stroke={ink} strokeWidth={2} opacity={0.85} /><T x={x} y={y + 62} textAnchor="middle" fontWeight={on ? 800 : 600} opacity={on ? 1 : 0.5}>{l}</T></g>; })}
    </g>);
  }
  const labels = r.type === 'segments' ? r.labels : r.stops; const n = labels.length;
  if (r.type === 'segments') {
    const gap = 10, sw = (w - gap * (n - 1)) / n;
    return (<g>{labels.map((l, i) => { const on = i === r.active; const p = prog(f, 14 + i * 3, 16, easeOut); return (<g key={i} opacity={p}><rect x={x0 + i * (sw + gap)} y={y} width={sw} height={14} fill={on ? m.accent : ink} opacity={on ? 1 : i < r.active ? 0.8 : 0.16} /><T x={x0 + i * (sw + gap)} y={y + 48} fontWeight={on ? 800 : 600} opacity={on ? 1 : 0.5}>{l}</T></g>); })}</g>);
  }
  const pts = labels.map((_, i) => ({ x: x0 + 20 + (i / (n - 1)) * (w - 40), y: y + 20 + Math.sin(i * 1.7) * 18 }));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  return (<g>
    <path d={path} fill="none" stroke={ink} strokeWidth={3} opacity={0.2} strokeDasharray="6 8" />
    <path d={pts.slice(0, r.active + 1).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')} fill="none" stroke={m.accent} strokeWidth={5} strokeDasharray={600} strokeDashoffset={600 * (1 - a)} />
    {pts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={i === r.active ? 11 : 6} fill={i === r.active ? m.accent : '#fff'} stroke={ink} strokeWidth={2} opacity={i <= r.active ? 1 : 0.5} /><T x={p.x} y={p.y + 46} textAnchor="middle" fontWeight={i === r.active ? 800 : 600} opacity={i === r.active ? 1 : 0.55}>{labels[i]}</T></g>)}
  </g>);
};

/* ---------- 챕터 카드 ---------- */
export const ModeCard: React.FC<{ mode: string; spec?: ModeSpec; photos?: Slots; matchCut?: boolean; dur?: number }> = ({ mode, spec, photos, matchCut = false, dur = 84 }) => {
  const m = spec ?? MODES[mode], c = m.card, f = useCurrentFrame(); const { W, H, PAD, PW } = useGeo(); const LW = W - PW;
  const reveal = prog(f, 2, 22, easeInOut), expand = matchCut ? prog(f, dur - 22, 20, easeInOut) : 0, textOut = matchCut ? prog(f, dur - 24, 14, easeInOut) : 0;
  const bigFs = Math.min(Math.round(H * 0.28), fitFont(c.big, 999, LW - PAD * 1.4, 0.9));
  return (
    <AbsoluteFill style={{ background: m.light, fontFamily: FONT_UI, color: m.ink, overflow: 'hidden' }}>
      <div style={{ opacity: 1 - textOut }}>
        <div style={{ position: 'absolute', left: PAD, top: PAD * 0.62, fontSize: 28, fontWeight: 700, opacity: prog(f, 0, 10), ...TNUM }}>{c.index}</div>
        <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.2 }}><Mask p={prog(f, 8, 24, easeOut)}><div style={{ fontSize: bigFs, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1, whiteSpace: 'nowrap', ...TNUM }}>{c.big}</div></Mask></div>
        <div style={{ position: 'absolute', left: PAD, top: H * 0.2 + bigFs * 1.06, display: 'flex', alignItems: 'center', gap: 24, opacity: prog(f, 20, 14) }}>
          <div style={{ width: lerp(0, 150, prog(f, 18, 18, easeOut)), height: 10, background: m.accent }} /><div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' }}>{c.small}</div>
        </div>
        <div style={{ position: 'absolute', left: PAD, top: H * 0.2 + bigFs * 1.06 + 100, display: 'flex', gap: 64 }}>
          {c.meta.map((x, i) => { const a = prog(f, 24 + i * 5, 16, easeOut); return (<div key={i} style={{ opacity: a, transform: `translateY(${(1 - a) * 22}px)` }}><div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, ...TNUM }}>{x.v}</div><div style={{ fontSize: 24, fontWeight: 600, opacity: 0.55, marginTop: 6 }}>{x.l}</div></div>); })}
        </div>
        <svg width={LW} height={H} style={{ position: 'absolute', left: 0, top: 0 }}><RailView r={c.rail} m={m} x0={PAD} x1={LW - PAD} y={H - 250} f={f} /></svg>
      </div>
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${(1 - reveal) * 100}% 0 0 ${lerp(LW, 0, expand)}px)`, overflow: 'hidden', background: '#000' }}>
        <div style={{ position: 'absolute', left: lerp(LW, 0, expand), top: 0, right: 0, bottom: 0 }}><Photo src={photos?.card ?? img(m, 'P', 2)} scale={interpolate(f, [0, dur], [1.16, 1.04])} /></div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 사진 컷(데이터 오버레이) ---------- */
export const ModeBeat: React.FC<{ mode: string; spec?: ModeSpec; photos?: string[]; dur?: number }> = ({ mode, spec, photos, dur = 104 }) => {
  const m = spec ?? MODES[mode], b = m.beat, im = (k: 'L' | 'P', n: number, slot = 0) => photos?.[slot] ?? img(m, k, n), f = useCurrentFrame(); const { W, H, PAD, PW } = useGeo();
  const a = (d: number, dur = 18) => prog(f, d, dur, easeOut), kb = interpolate(f, [0, 90], [1.0, 1.08]);
  const chip = (t: string, bg: string, fg: string, size = 34) => <div style={{ display: 'inline-block', background: bg, color: fg, fontSize: size, fontWeight: 800, padding: '8px 22px', letterSpacing: '-0.01em', ...TNUM }}>{t}</div>;
  if (b.kind === 'lower') return (
    <AbsoluteFill style={{ background: '#000', fontFamily: FONT_UI, color: '#fff' }}>
      <Photo src={im('L', 2)} scale={kb} /><AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,0) 40%)' }} />
      <div style={{ position: 'absolute', left: PAD, bottom: H * 0.14, opacity: a(6), transform: `translateX(${(1 - a(6)) * -40}px)` }}>
        {chip(b.chip, m.accent, m.onAccent)}<div style={{ fontSize: 78, fontWeight: 900, letterSpacing: '-0.04em', marginTop: 16 }}>{b.title}</div><div style={{ fontSize: 34, fontWeight: 600, opacity: 0.85, marginTop: 6 }}>{b.sub}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: W, background: 'rgba(255,255,255,.25)' }}><div style={{ width: `${a(10, 60) * 62}%`, height: '100%', background: m.accent }} /></div>
    </AbsoluteFill>);
  if (b.kind === 'beforeafter') { const s = lerp(0.18, 0.56, prog(f, 8, 40, easeInOut)) * W; return (
    <AbsoluteFill style={{ background: '#000', fontFamily: FONT_UI, color: '#fff' }}>
      <Photo src={im('L', 2, 0)} scale={1.04} /><div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${s}px)` }}><Photo src={im('L', 3, 1)} scale={1.04} /></div>
      <div style={{ position: 'absolute', left: s - 2, top: 0, bottom: 0, width: 4, background: '#fff' }} />
      <div style={{ position: 'absolute', left: s - 36, top: H / 2 - 36, width: 72, height: 72, borderRadius: 36, background: '#fff', color: '#111', fontSize: 30, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀▶</div>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7 }}>{chip(b.before, 'rgba(0,0,0,.65)', '#fff', 28)}</div><div style={{ position: 'absolute', right: PAD, top: PAD * 0.7 }}>{chip(b.after, m.accent, m.onAccent, 28)}</div>
      <div style={{ position: 'absolute', left: PAD, bottom: PAD * 0.7, opacity: a(20) }}>{chip(b.chip, '#fff', '#111', 38)}</div>
    </AbsoluteFill>); }
  if (b.kind === 'spec') return (
    <AbsoluteFill style={{ background: m.light, fontFamily: FONT_UI, color: m.ink }}>
      <div style={{ position: 'absolute', right: 0, top: 0, width: PW, height: H, clipPath: `inset(${(1 - a(0, 26)) * 100}% 0 0 0)` }}><Photo src={im('P', 3)} scale={interpolate(f, [0, 90], [1.12, 1.02])} /></div>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', color: m.accent }}>{b.en.toUpperCase()}</div>
      <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.16 }}><Mask p={a(4, 24)}><div style={{ fontSize: Math.round(H * 0.2), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1 }}>{b.title}</div></Mask></div>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.5, width: W - PW - PAD * 2 }}>{b.rows.map((r, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '2px solid rgba(0,0,0,.2)', padding: '16px 0', opacity: a(14 + i * 5) }}><span style={{ fontSize: 26, fontWeight: 600, opacity: 0.55 }}>{r.k}</span><span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', ...TNUM }}>{r.v}</span></div>))}</div>
    </AbsoluteFill>);
  if (b.kind === 'callout') return (
    <AbsoluteFill style={{ background: m.light, fontFamily: FONT_UI, color: m.ink }}>
      <Photo src={im('L', 1)} scale={1.0} />
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em' }}>{b.name}</div>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>{b.points.map((p, i) => { const k = prog(f, 14 + i * 8, 18, easeOut), px = p.x * W, py = p.y * H, right = p.x > 0.5, lx = right ? W * 0.76 : W * 0.1, ly = py - 30 + i * 6;
        return (<g key={i}><circle cx={px} cy={py} r={9 + Math.sin(f / 5 + i) * 2} fill="none" stroke={m.accent} strokeWidth={3} opacity={k} /><circle cx={px} cy={py} r={5} fill={m.accent} opacity={k} />
          <polyline points={`${px},${py} ${lx + (right ? -16 : 330)},${ly + 18} ${lx + (right ? 0 : 340)},${ly + 18}`} fill="none" stroke={m.ink} strokeWidth={2} opacity={0.6 * k} strokeDasharray={500} strokeDashoffset={500 * (1 - k)} />
          <text x={lx} y={ly} fontSize={38} fontWeight={800} fill={m.ink} fontFamily={FONT_UI} opacity={k}>{p.t}</text><text x={lx} y={ly + 40} fontSize={26} fontWeight={600} fill={m.ink} opacity={0.6 * k} fontFamily={FONT_UI}>{p.s}</text></g>); })}</svg>
      <div style={{ position: 'absolute', left: PAD, bottom: PAD * 0.8, display: 'flex', gap: 28, opacity: a(34) }}>{b.swatches.map((s, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 24, fontWeight: 700 }}><div style={{ width: 40, height: 40, borderRadius: 20, background: s.c, border: '2px solid rgba(0,0,0,.2)' }} />{s.n}</div>))}</div>
    </AbsoluteFill>);
  if (b.kind === 'route') { const mw = 480, mh = 320, n = b.stops.length; const pts = b.stops.map((_, i) => ({ x: 40 + (i / (n - 1)) * (mw - 80), y: mh / 2 + Math.sin(i * 1.7 + 0.6) * 70 }));
    return (<AbsoluteFill style={{ background: '#000', fontFamily: FONT_UI, color: '#fff' }}>
      <Photo src={im('L', 1)} scale={kb} /><AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 45%), linear-gradient(to bottom, rgba(0,0,0,.4) 0%, rgba(0,0,0,0) 30%)' }} />
      <div style={{ position: 'absolute', left: PAD, bottom: H * 0.13, opacity: a(4) }}><div style={{ fontSize: 110, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>{b.place}</div><div style={{ fontSize: 38, fontWeight: 600, marginTop: 14, ...TNUM }}>{b.sub} · {b.km}</div></div>
      <div style={{ position: 'absolute', right: PAD, top: PAD * 0.7, width: mw, height: mh, borderRadius: 28, background: 'rgba(12,30,40,.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.25)', opacity: a(8) }}>
        <svg width={mw} height={mh}><path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')} fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={3} strokeDasharray="6 8" />
          <path d={pts.slice(0, b.active + 1).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')} fill="none" stroke={m.accent} strokeWidth={6} />
          {pts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={i === b.active ? 12 + Math.sin(f / 4) * 2 : 6} fill={i === b.active ? m.accent : '#fff'} /><text x={p.x} y={p.y + 36} textAnchor="middle" fontSize={20} fontWeight={700} fill="#fff" fontFamily={FONT_UI}>{b.stops[i]}</text></g>)}</svg></div>
    </AbsoluteFill>); }
  if (b.kind === 'caption') return (
    <AbsoluteFill style={{ background: m.light, fontFamily: FONT_UI, color: m.ink }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W * 0.58, height: H, overflow: 'hidden', clipPath: `inset(0 ${(1 - a(0, 24)) * 100}% 0 0)` }}><Photo src={im('L', 1)} scale={kb} /></div>
      <div style={{ position: 'absolute', left: W * 0.58 + PAD * 0.8, top: H * 0.1, right: PAD }}>
        <div style={{ fontSize: Math.round(H * 0.2), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, color: m.accent, ...TNUM }}>{b.step}</div>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', marginTop: 8, opacity: a(8) }}>{b.title}</div>
        <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.45, marginTop: 26, paddingLeft: 22, borderLeft: `6px solid ${m.accent}`, opacity: a(14) }}>{b.quote}</div>
        <div style={{ marginTop: 40 }}>{b.points.map((p, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, fontWeight: 700, marginTop: 14, opacity: a(20 + i * 5) }}><div style={{ width: 16, height: 16, background: m.accent }} />{p}</div>)}</div>
      </div>
    </AbsoluteFill>);
  if (b.kind === 'stats') { const pw = Math.round(H * 0.6), gw = W - pw - PAD * 2.2; return (
    <AbsoluteFill style={{ background: m.accent, color: m.onAccent, fontFamily: FONT_UI }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 30, fontWeight: 800, letterSpacing: '0.04em', opacity: a(0, 10) }}>{b.kicker}</div>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.2, width: gw, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${H * 0.07}px ${PAD * 0.6}px` }}>
        {b.items.map((it, i) => { const v = it.n * prog(f, 10 + i * 8, 44, easeOut); return (
          <div key={i} style={{ borderTop: `4px solid ${m.onAccent}`, paddingTop: 16, opacity: a(8 + i * 8, 20) }}>
            <div style={{ fontSize: Math.round(H * 0.17), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, ...TNUM }}>{it.dec ? v.toFixed(it.dec) : Math.round(v).toLocaleString()}<span style={{ fontSize: '0.36em', fontWeight: 800, letterSpacing: '-0.02em', marginLeft: 8 }}>{it.unit}</span></div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8 }}>{it.l}</div>
          </div>); })}
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, width: pw, height: H, clipPath: `inset(${(1 - prog(f, 0, 22, easeInOut)) * 100}% 0 0 0)` }}><Photo src={im('P', 1)} scale={interpolate(f, [0, dur], [1.14, 1.02])} /></div>
    </AbsoluteFill>); }
  if (b.kind === 'quote') { const pw = Math.round(H * 0.62), lines = b.text.split('\n'), fs = Math.min(88, fitFont(lines.reduce((x, y) => (x.length > y.length ? x : y), ''), 999, W - pw - PAD * 1.6, 0.92)); return (
    <AbsoluteFill style={{ background: m.ink, color: '#fff', fontFamily: FONT_UI }}>
      <div style={{ position: 'absolute', right: 0, top: 0, width: pw, height: H, clipPath: `inset(0 0 ${(1 - prog(f, 0, 24, easeInOut)) * 100}% 0)` }}><Photo src={im('P', 2)} scale={interpolate(f, [0, dur], [1.12, 1.02])} /></div>
      <div style={{ position: 'absolute', left: PAD - 6, top: H * 0.08, fontSize: 340, fontWeight: 900, lineHeight: 1, color: m.accent, opacity: a(4, 16) }}>“</div>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.36 }}>
        {lines.map((l, i) => <Mask key={i} p={a(10 + i * 8, 26)}><div style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.28, whiteSpace: 'nowrap' }}>{l}</div></Mask>)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 40, opacity: a(36, 16) }}><div style={{ width: lerp(0, 90, a(34)), height: 8, background: m.accent }} /><div><div style={{ fontSize: 44, fontWeight: 800 }}>{b.name}</div><div style={{ fontSize: 28, fontWeight: 600, opacity: 0.7 }}>{b.role}</div></div></div>
      </div>
    </AbsoluteFill>); }
  if (b.kind === 'schedule') { const n = b.rows.length, top = Math.round(H * 0.14), rowH = Math.min(150, (H - top * 2) / n), x0 = Math.round(W * 0.44); let hi = 0; return (
    <AbsoluteFill style={{ background: m.light, color: m.ink, fontFamily: FONT_UI }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', color: m.accent, opacity: a(0, 10) }}>{b.kicker}</div>
      <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.2 }}>{b.title.split('\n').map((l, i) => <Mask key={i} p={a(4 + i * 6, 24)}><div style={{ fontSize: Math.round(H * 0.19), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1.04 }}>{l}</div></Mask>)}
        <div style={{ width: lerp(0, 150, a(18)), height: 10, background: m.accent, marginTop: 28 }} /></div>
      {b.rows.map((r, i) => { const ap = a(8 + i * 6), on = !!r.hi, lit = on ? prog(f, 44 + hi++ * 7, 14, easeOut) : 0; return (
        <div key={i} style={{ position: 'absolute', left: x0, right: PAD, top: (H - rowH * n) / 2 + i * rowH, height: rowH, display: 'flex', alignItems: 'center', borderTop: '2px solid rgba(0,0,0,.16)', opacity: ap, transform: `translateX(${(1 - ap) * 60}px)` }}>
          <div style={{ position: 'absolute', left: -26, top: 0, width: 8, height: rowH * lit, background: m.accent }} />
          <div style={{ width: 330, fontSize: 52, fontWeight: 800, letterSpacing: '-0.03em', color: lit > 0.5 ? m.accent : m.ink, whiteSpace: 'nowrap', ...TNUM }}>{r.d}</div>
          <div><div style={{ fontSize: on ? 48 : 40, fontWeight: on ? 900 : 700, letterSpacing: '-0.03em' }}>{r.t}</div>{r.s && <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.55, marginTop: 2 }}>{r.s}</div>}</div>
        </div>); })}
    </AbsoluteFill>); }
  if (b.kind === 'names') { const cols = 4, per = Math.ceil(b.names.length / cols), lh = 66, x0 = Math.round(W * 0.34), travel = Math.max(0, per * lh - H * 0.56), y = H * 0.22 - travel * prog(f, 24, dur - 56, (t) => t); return (
    <AbsoluteFill style={{ background: m.ink, color: '#fff', fontFamily: FONT_UI }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', color: m.accent, opacity: a(0, 10) }}>{b.kicker}</div>
      <div style={{ position: 'absolute', left: PAD - 6, top: H * 0.2 }}><Mask p={a(4, 24)}><div style={{ fontSize: Math.round(H * 0.15), fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1.04 }}>{b.title}</div></Mask>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 20, opacity: a(16) }}><div style={{ width: lerp(0, 90, a(14)), height: 8, background: m.accent }} /><div style={{ fontSize: 32, fontWeight: 700, opacity: 0.85 }}>{b.sub}</div></div></div>
      <div style={{ position: 'absolute', left: x0, right: PAD, top: 0, bottom: 0, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to bottom, transparent 4%, #000 20%, #000 80%, transparent 96%)', maskImage: 'linear-gradient(to bottom, transparent 4%, #000 20%, #000 80%, transparent 96%)', opacity: a(10, 20) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gridTemplateRows: `repeat(${per}, ${lh}px)` }}>
          {b.names.map((nm, i) => <div key={i} style={{ fontSize: 40, fontWeight: 700, letterSpacing: '0.02em' }}>{nm}</div>)}
        </div>
      </div>
    </AbsoluteFill>); }
  if (b.kind === 'timeline') { const n = b.counts.length, x0 = PAD, x1 = W - PAD, bw = (x1 - x0) / n, base = Math.round(H * 0.74), mh = Math.round(H * 0.34), mx = Math.max(...b.counts, 1), total = b.counts.reduce((x, y) => x + y, 0), sweep = prog(f, 10, 54, easeInOut); return (
    <AbsoluteFill style={{ background: m.light, color: m.ink, fontFamily: FONT_UI }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', color: m.accent, opacity: a(0, 10) }}>{b.kicker}</div>
      <div style={{ position: 'absolute', left: PAD - 6, top: H * 0.13 }}><Mask p={a(4, 24)}><div style={{ fontSize: Math.round(H * 0.15), fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1.04 }}>{b.title}</div></Mask></div>
      <div style={{ position: 'absolute', right: PAD, top: H * 0.15, textAlign: 'right', opacity: a(8) }}><div style={{ fontSize: Math.round(H * 0.12), fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, ...TNUM }}>{Math.round(total * sweep).toLocaleString()}<span style={{ fontSize: '0.4em', marginLeft: 8 }}>{b.unit}</span></div></div>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {b.counts.map((c, i) => { const g = clamp(sweep * n - i, 0, 1), h = (c / mx) * mh * g, mark = b.marks.some((k) => k.i === i); return <rect key={i} x={x0 + i * bw + bw * 0.16} y={base - h} width={bw * 0.68} height={h} fill={mark ? m.accent : m.ink} opacity={mark ? 1 : 0.86} />; })}
        <line x1={x0} x2={x1} y1={base} y2={base} stroke={m.ink} strokeOpacity={0.35} strokeWidth={2} />
        {b.marks.map((k, j) => { const x = x0 + k.i * bw + bw / 2, hh = (b.counts[k.i] / mx) * mh, o = clamp(sweep * n - k.i - 0.5, 0, 1), up = j % 2 ? 58 : 22, anchor = k.i < 2 ? 'start' : k.i > n - 3 ? 'end' : 'middle'; return (<g key={j} opacity={o}><line x1={x} x2={x} y1={base - hh - 8} y2={base - hh - up + 6} stroke={m.ink} strokeWidth={2} /><text x={x} y={base - hh - up - 6} textAnchor={anchor} fontSize={28} fontWeight={800} fill={m.ink} fontFamily={FONT_UI}>{k.label}</text></g>); })}
        {b.bands.map((bd, j) => { const xa = x0 + bd.from * bw + 6, xb = x0 + (bd.to + 1) * bw - 6, o = a(20 + j * 8); return (<g key={j} opacity={o}><rect x={xa} y={base + 26} width={(xb - xa) * a(20 + j * 8, 26)} height={8} fill={m.accent} /><text x={xa} y={base + 82} fontSize={34} fontWeight={800} fill={m.ink} fontFamily={FONT_UI}>{bd.label}</text></g>); })}
      </svg>
    </AbsoluteFill>); }
  return null;
};

/* ---------- 아웃트로 ---------- */
const QR: React.FC<{ s: number; fg: string; bg: string }> = ({ s, fg, bg }) => { const n = 21, c = s / n; return (<svg width={s} height={s}><rect width={s} height={s} fill={bg} />{Array.from({ length: n * n }, (_, i) => { const x = i % n, y = Math.floor(i / n); const fin = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13); const on = fin ? (x % 6 === 0 || y % 6 === 0 || x % 6 === 6 || (x > 1 && x < 5 && y > 1 && y < 5) || (x > 15 && x < 19 && y > 1 && y < 5) || (x > 1 && x < 5 && y > 15 && y < 19)) : random(`q${i}`) > 0.52; return on ? <rect key={i} x={x * c} y={y * c} width={c} height={c} fill={fg} /> : null; })}</svg>); };

export const ModeOutro: React.FC<{ mode: string; spec?: ModeSpec }> = ({ mode, spec }) => {
  const m = spec ?? MODES[mode], o = m.outro, f = useCurrentFrame(); const { W, H, PAD } = useGeo();
  const a = (d: number, dur = 20) => prog(f, d, dur, easeOut);
  const fs = Math.min(Math.round(H * 0.17), fitFont(o.title, 999, W * 0.5, 0.95));
  return (
    <AbsoluteFill style={{ background: m.ink, fontFamily: FONT_UI, color: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD - 6, top: H * 0.16 }}><Mask p={a(4, 26)}><div style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1.04, whiteSpace: 'nowrap' }}>{o.title}</div></Mask>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 14, opacity: a(16) }}><div style={{ width: lerp(0, 120, a(14)), height: 10, background: m.accent }} /><div style={{ fontSize: 38, fontWeight: 700, opacity: 0.9 }}>{o.sub}</div></div></div>
      {o.stats && <div style={{ position: 'absolute', left: PAD, top: H * 0.52, display: 'flex', gap: 70 }}>{o.stats.map((s, i) => (<div key={i} style={{ opacity: a(22 + i * 6) }}><div style={{ fontSize: 96, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, ...TNUM }}>{s.n}</div><div style={{ fontSize: 26, fontWeight: 600, opacity: 0.65, marginTop: 6 }}>{s.l}</div></div>))}</div>}
      <div style={{ position: 'absolute', left: W * 0.58, top: H * 0.16, width: W * 0.34 }}>{o.rows.map((r, i) => (<div key={i} style={{ borderTop: '2px solid rgba(255,255,255,.3)', padding: '16px 0 22px', opacity: a(14 + i * 6), transform: `translateY(${(1 - a(14 + i * 6)) * 16}px)` }}><div style={{ fontSize: 24, fontWeight: 600, opacity: 0.6 }}>{r.k}</div><div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, ...TNUM }}>{r.v}</div></div>))}</div>
      {o.cta && <div style={{ position: 'absolute', left: PAD, bottom: H * 0.12, background: m.accent, color: m.onAccent, fontSize: 40, fontWeight: 800, padding: '20px 40px', opacity: a(40) }}>{o.cta}</div>}
      {o.extra === 'qr' && <div style={{ position: 'absolute', right: PAD, bottom: H * 0.1, opacity: a(34), textAlign: 'center' }}><QR s={200} fg="#111" bg="#fff" /><div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, opacity: 0.8 }}>SCAN</div></div>}
      {o.extra === 'sponsors' && <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: H * 0.09 }}><div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.6, marginBottom: 14 }}>SPONSORS</div><div style={{ display: 'flex', gap: 24 }}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ flex: 1, height: 84, border: '2px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, opacity: a(40 + i * 3) * 0.8 }}>LOGO</div>)}</div></div>}
      {o.extra === 'progress' && <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: H * 0.12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, marginBottom: 14, ...TNUM }}><span>현재 공정률</span><span style={{ color: m.accent }}>42%</span></div>
        <div style={{ height: 22, borderRadius: 11, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><div style={{ width: `${a(20, 40) * 42}%`, height: '100%', background: m.accent }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 600, opacity: 0.65, marginTop: 14 }}>{['터파기', '기초', '골조', '설비', '마감'].map((x) => <span key={x}>{x}</span>)}</div></div>}
      {o.extra === 'route' && <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>{(() => { const pts = [[0.12, 0.8], [0.3, 0.72], [0.48, 0.82], [0.66, 0.7], [0.86, 0.78]].map(([x, y]) => ({ x: x * W, y: y * H })); const k = a(18, 50); return (<g><path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')} fill="none" stroke={m.accent} strokeWidth={7} strokeDasharray={1800} strokeDashoffset={1800 * (1 - k)} />{pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={11} fill="#fff" opacity={prog(f, 18 + i * 9, 8)} />)}</g>); })()}</svg>}
      {o.extra === 'rating' && <div style={{ position: 'absolute', left: PAD, bottom: H * 0.13, fontSize: 70, letterSpacing: 8, color: m.accent, opacity: a(40) }}>★★★★<span style={{ opacity: 0.4 }}>★</span></div>}
    </AbsoluteFill>
  );
};
