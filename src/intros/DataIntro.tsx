import React, { useMemo } from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import type { DataIntroProps } from '../analysis/introData.ts';
import { easeBack, easeInOut, easeOut, lerp, prog, resolveSrc } from '../lib/common';
import { useLayout, wrapTitle } from '../lib/layout';

const F = `'Pretendard','Noto Sans KR','Inter',sans-serif`;
const TNUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mixc = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;

/** 데이터 인트로 "Chrono" — 사진 한 장 = 점 하나(x: 날짜, y: 시각, 색: 사진 고유색). 점에서 사진이 펼쳐지고 점들은 하단 바코드 띠가 된다 */
export const DataIntro: React.FC<DataIntroProps> = (p) => {
  const frame = useCurrentFrame();
  const { W, H, PAD, portrait } = useLayout();
  const dark = p.mode === 'dark';
  const paper = dark ? '#0e0e0d' : '#ecebe5', ink = dark ? [242, 241, 236] : [17, 17, 17];
  const HMIN = 5, HMAX = 24;
  const plotT = Math.round(H * 0.17), plotB = Math.round(H * 0.84), stripT = H - Math.round(H * 0.175), stripB = H - Math.round(H * 0.075);
  const px = (d: number) => PAD + (d / p.spanDays) * (W - 2 * PAD);
  const py = (h: number, a: number, b: number) => a + ((clamp(h, HMIN, HMAX) - HMIN) / (HMAX - HMIN)) * (b - a);

  // 점 등장 시점: 시간순, 뒤로 갈수록 빨라지는 셔터 리듬
  const N = p.points.length;
  const appear = useMemo(() => p.points.map((_, i) => 3 + 40 * Math.pow(i / Math.max(1, N - 1), 1.45)), [p.points, N]);
  const shown = appear.filter((a) => frame >= a).length;
  const collapse = prog(frame, 64, 30, easeInOut);
  const emerge = prog(frame, 56, 28, easeInOut);
  const plotUI = 1 - prog(frame, 60, 14);            // 축·밴드 사라짐
  const counterOut = 1 - prog(frame, 56, 12);
  const bandsIn = prog(frame, 42, 12) * (1 - prog(frame, 60, 10));

  // 사진이 점에서 펼쳐지는 클립
  const busyX = px(p.busiest.day), bx = px(p.hero.day), by = py(p.hero.h, plotT, plotB), r0 = 9;
  const clip = `inset(${lerp(by - r0, 0, emerge)}px ${lerp(W - bx - r0, 0, emerge)}px ${lerp(H - by - r0, 0, emerge)}px ${lerp(bx - r0, 0, emerge)}px round ${lerp(r0, 0, emerge)}px)`;
  const push = interpolate(frame, [54, 150], [1.12, 1.03], { extrapolateLeft: 'clamp' });

  // 타이틀
  const tLines = portrait ? wrapTitle([p.title], 8) : [p.title], tMax = Math.max(...tLines.map((l) => Array.from(l).length));
  const fs = portrait ? Math.min(Math.round(H * 0.095), Math.round((W - PAD * 2) / (tMax * 0.92))) : Math.min(Math.round(H * 0.215), Math.round((W * 0.66) / (Array.from(p.title).length * 0.92)));
  const tp = prog(frame, 82, 22, easeOut), tp2 = prog(frame, 92, 22, easeOut);
  const wipe = prog(frame, 140, 10, easeInOut);

  const white = [255, 255, 255];
  const labelCol = mixc(ink, white, collapse);

  return (
    <AbsoluteFill style={{ background: paper, fontFamily: F, overflow: 'hidden' }}>
      {/* 축: 시각 가이드 */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: plotUI * prog(frame, 0, 10) }}>
        {[6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line x1={PAD} x2={W - PAD} y1={py(h, plotT, plotB)} y2={py(h, plotT, plotB)} stroke={`rgba(${ink.join(',')},.12)`} strokeWidth={1.5} />
            <text x={PAD - 22} y={py(h, plotT, plotB) + 6} textAnchor="end" fontSize={20} fontWeight={600} fill={`rgba(${ink.join(',')},.5)`} style={TNUM}>{String(h === 24 ? 0 : h).padStart(2, '0')}</text>
          </g>
        ))}
        {p.chapters.filter((c) => c.suggested).map((c, i) => {
          const a = bandsIn * prog(frame, 42 + i * 2, 8);
          return <rect key={i} x={px(c.from) - 6} y={plotT - 24} width={Math.max(12, px(c.to) - px(c.from) + 12)} height={plotB - plotT + 48} fill={c.accent} opacity={0.16 * a} />;
        })}
      </svg>

      {/* 날짜선 + 점 (하나의 SVG: 이후 사진 위에서도 이어짐) — 사진 레이어 아래쪽 일부(날짜선)와 위쪽(점)을 분리 */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {useMemo(() => {
          const byDay = new Map<number, { lo: number; hi: number; a: number }>();
          p.points.forEach((pt, i) => { const d = byDay.get(pt.day); if (!d) byDay.set(pt.day, { lo: pt.h, hi: pt.h, a: appear[i] }); else { d.lo = Math.min(d.lo, pt.h); d.hi = Math.max(d.hi, pt.h); d.a = Math.max(d.a, appear[i]); } });
          return [...byDay.entries()].filter(([, d]) => d.hi - d.lo > 0.4).map(([day, d]) => ({ day, ...d }));
        }, [p.points, appear]).map((d) => {
          const g = prog(frame, d.a - 2, 8) * plotUI; if (g <= 0) return null;
          const x = px(d.day), y1 = py(d.lo, plotT, plotB), y2 = lerp(y1, y1, 1), yy = lerp(py(d.hi, plotT, plotB) , y1, 1 - g);
          return <line key={d.day} x1={x} x2={x} y1={y1} y2={yy} stroke={`rgba(${ink.join(',')},.28)`} strokeWidth={1.5} />;
        })}
      </svg>

      {/* 사진: 점에서 펼쳐짐 */}
      <AbsoluteFill style={{ clipPath: clip, opacity: emerge > 0 ? 1 : 0 }}>
        <Img src={resolveSrc(p.hero.src)} style={{ width: W, height: H, objectFit: 'cover', objectPosition: `${p.hero.fx * 100}% ${p.hero.fy * 100}%`, transform: `scale(${push})`, filter: 'brightness(.94) contrast(1.03)' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(8,8,8,.84) 0%, rgba(8,8,8,.5) 32%, rgba(8,8,8,0) 60%), linear-gradient(to bottom, rgba(8,8,8,.55) 0%, rgba(8,8,8,0) 22%)', opacity: prog(frame, 70, 20) }} />
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 0, right: 0, top: stripT - 34, height: stripB - stripT + 110, background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(14px)', opacity: prog(frame, 74, 18) }} />
      {/* 점들 */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {p.points.map((pt, i) => {
          const a = prog(frame, appear[i], 6, easeBack); if (a <= 0) return null;
          const x = px(pt.day), y = lerp(py(pt.h, plotT, plotB), py(pt.h, stripT, stripB), collapse);
          const r = lerp(5.5 + 5 * pt.s, 2.4 + 1.6 * pt.s, collapse) * a;
          return <circle key={i} cx={x} cy={y} r={r} fill={pt.hex} />;
        })}
        {(() => { const a = prog(frame, 3, 6) * (1 - prog(frame, 40, 8)); if (a <= 0 || shown < 1) return null; const x = px(p.points[shown - 1].day); return <line x1={x} x2={x} y1={plotT - 30} y2={plotB + 8} stroke={`rgba(${ink.join(',')},.55)`} strokeWidth={2} opacity={a} />; })()}
        {(() => { const a = prog(frame, 44, 8) * (1 - prog(frame, 60, 6)); if (a <= 0) return null; const rr = lerp(30, 13, prog(frame, 44, 10)); const right = bx < W * 0.7; return <g opacity={a}><circle cx={bx} cy={by} r={rr} fill="none" stroke={`rgb(${ink.join(',')})`} strokeWidth={2.5} /><text x={bx + (right ? 26 : -26)} textAnchor={right ? 'start' : 'end'} y={by + 7} fontSize={22} fontWeight={700} fill={`rgb(${ink.join(',')})`} style={TNUM}>{p.hero.label}</text></g>; })()}
        {/* 가장 몰린 날 강조 */}
        {(() => { const a = prog(frame, 44, 10) * (1 - prog(frame, 58, 8)); if (a <= 0) return null; const x = px(p.busiest.day); return <g opacity={a}><line x1={x} x2={x} y1={plotT - 70} y2={plotT - 28} stroke={`rgb(${ink.join(',')})`} strokeWidth={2} /><text x={x + (x < W * 0.62 ? 14 : -14)} textAnchor={x < W * 0.62 ? 'start' : 'end'} y={plotT - 44} fontSize={30} fontWeight={800} fill={`rgb(${ink.join(',')})`} style={TNUM}>{p.busiest.label} · {p.busiest.count}장</text></g>; })()}
      </svg>

      {/* 카운터 */}
      <div style={{ position: 'absolute', [busyX < W / 2 ? 'right' : 'left']: PAD, top: PAD * 0.55, display: 'flex', alignItems: 'baseline', gap: 18, color: `rgb(${ink.join(',')})`, opacity: counterOut * prog(frame, 0, 8) }}>
        <span style={{ fontSize: Math.round(H * (portrait ? 0.06 : 0.11)), fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, ...TNUM }}>{shown}</span>
        <span style={{ fontSize: 26, fontWeight: 600, opacity: 0.6 }}>장의 사진 · 날짜와 시각</span>
      </div>

      {/* 월 눈금 */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {p.startMonth.map((m, i) => {
          const a = prog(frame, 10 + i * 1.4, 10); const y = lerp(plotB + 44, stripB + 40, collapse);
          return (
            <g key={i} opacity={a}>
              <text x={px(m.day)} y={y} fontSize={20} fontWeight={600} fill={labelCol} opacity={0.72} style={TNUM}>{m.m === 1 || i === 0 ? `${m.y}.${m.m}` : `${m.m}`}</text>
              <line x1={px(m.day)} x2={px(m.day)} y1={y - 28} y2={y - 20} stroke={labelCol} strokeWidth={1.5} opacity={0.5} />
            </g>
          );
        })}
      </svg>

      {/* 타이틀 */}
      {portrait ? (<>
        <div style={{ position: 'absolute', left: PAD, top: 64, color: '#fff', fontSize: 30, fontWeight: 600, letterSpacing: '0.02em', opacity: prog(frame, 86, 14), ...TNUM }}>{p.range}</div>
        <div style={{ position: 'absolute', left: PAD - 6, right: PAD, bottom: H - stripT + Math.round(H * 0.04), color: '#fff', display: 'flex', flexDirection: 'column', gap: 30 }}>
          <div style={{ display: 'flex', gap: 48, opacity: tp2, transform: `translateY(${(1 - tp2) * 18}px)` }}>
            {p.stats.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: Math.round(H * 0.045), fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, ...TNUM }}>{s.n}</div>
                <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.75, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ overflow: 'hidden', paddingTop: '0.06em' }}>
            {tLines.map((l, i) => <div key={i} style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.04, transform: `translateY(${(1 - tp) * 108}%)`, whiteSpace: 'nowrap' }}>{l}</div>)}
          </div>
        </div>
      </>) : (<>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, color: '#fff', fontSize: 28, fontWeight: 600, letterSpacing: '0.02em', opacity: prog(frame, 86, 14), ...TNUM }}>{p.range}</div>
      <div style={{ position: 'absolute', left: PAD - 6, bottom: H - stripT + Math.round(H * 0.045), color: '#fff', overflow: 'hidden', paddingTop: '0.06em' }}>
        <div style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.02, transform: `translateY(${(1 - tp) * 108}%)`, whiteSpace: 'nowrap' }}>{p.title}</div>
      </div>
      <div style={{ position: 'absolute', right: PAD, bottom: H - stripT + Math.round(H * 0.058), display: 'flex', gap: 56, color: '#fff', opacity: tp2, transform: `translateY(${(1 - tp2) * 18}px)` }}>
        {p.stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'right' }}>
            <div style={{ fontSize: Math.round(H * 0.064), fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, ...TNUM }}>{s.n}</div>
            <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.75, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      </>)}

      {/* 퇴장 와이프 → 다음 장면(종이색) */}
      <div style={{ position: 'absolute', inset: 0, background: paper, transform: `translateX(${(wipe - 1) * 100}%)` }} />
    </AbsoluteFill>
  );
};
