import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { EventProps } from './types.ts';
import { FONT_UI, Photo, TNUM, easeInOut, easeOut, fitFont, lerp, prog } from '../lib/common';
import { useLayout } from '../lib/layout';
import { PortraitQuote, PortraitStats } from '../modes/ModeScenes';

const Mask: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, children, style }) => (
  <div style={{ overflow: 'hidden', paddingBottom: '0.08em', ...style }}><div style={{ transform: `translateY(${(1 - p) * 108}%)` }}>{children}</div></div>
);

/** 일정 개요: 하루 전체 시간표를 보여주고 하이라이트 세션만 강조 */
export const AgendaScene: React.FC<{ p: EventProps }> = ({ p }) => {
  const f = useCurrentFrame(); const { W, H, PAD, portrait } = useLayout();
  const { colors: c, info, agenda } = p; const n = agenda.length, top = Math.round(H * 0.11), rowH = (H - top * 2) / n, x0 = Math.round(W * 0.44);
  let hi = 0;
  if (portrait) {
    const t0 = Math.round(H * 0.33), rh = Math.min(150, (H * 0.9 - t0) / n), ax0 = PAD + 28;
    return (
      <AbsoluteFill style={{ background: c.light, color: c.ink, fontFamily: FONT_UI, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: PAD, top: 64, fontSize: 28, fontWeight: 800, letterSpacing: '0.12em', color: c.accent, opacity: prog(f, 0, 10) }}>AGENDA</div>
        <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.085 }}>
          {['오늘의 일정'].map((l, i) => <Mask key={i} p={prog(f, 4 + i * 6, 24, easeOut)}><div style={{ fontSize: Math.round(H * 0.085), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1.04, whiteSpace: 'nowrap' }}>{l}</div></Mask>)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 24, opacity: prog(f, 20, 14) }}><div style={{ width: lerp(0, 120, prog(f, 18, 18, easeOut)), height: 10, background: c.accent }} /><div style={{ fontSize: 42, fontWeight: 800, ...TNUM }}>{info.dateLabel}</div></div>
          <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.6 * prog(f, 26, 14), marginTop: 12 }}>{info.venue}</div>
        </div>
        <div style={{ position: 'absolute', left: PAD, bottom: 64, display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, fontWeight: 700, opacity: prog(f, 60, 14) }}><div style={{ width: 16, height: 16, background: c.accent }} />하이라이트 {p.sessions.length}개</div>
        {agenda.map((a, i) => {
          const y = t0 + i * rh, ap = prog(f, 8 + i * 5, 18, easeOut), on = !!a.highlight, lit = on ? prog(f, 52 + hi * 7, 14, easeOut) : 0, num = on ? ++hi : 0;
          return (
            <div key={i} style={{ position: 'absolute', left: ax0, right: PAD, top: y, height: rh, display: 'flex', alignItems: 'center', borderTop: '2px solid rgba(20,22,63,.16)', opacity: ap * (on ? 1 : lerp(1, 0.5, prog(f, 50, 14))), transform: `translateX(${(1 - ap) * 60}px)` }}>
              <div style={{ position: 'absolute', left: -28, top: 0, width: 8, height: rh * lit, background: c.accent }} />
              <div style={{ width: 168, flex: 'none', fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', color: on && lit > 0.5 ? c.accent : c.ink, ...TNUM }}>{a.start}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: on ? 40 : 34, fontWeight: on ? 900 : 700, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{a.title}</div>{(a.speaker || a.room) && <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.55, marginTop: 2 }}>{[a.speaker, a.room].filter(Boolean).join('  ·  ')}</div>}</div>
              {on && <div style={{ width: 52, height: 52, borderRadius: 26, background: c.accent, color: '#fff', fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginLeft: 12, opacity: lit, transform: `scale(${lerp(0.4, 1, lit)})`, ...TNUM }}>{num}</div>}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: c.light, color: c.ink, fontFamily: FONT_UI, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', color: c.accent, opacity: prog(f, 0, 10) }}>AGENDA</div>
      <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.18 }}>
        {['오늘의', '일정'].map((l, i) => <Mask key={i} p={prog(f, 4 + i * 6, 24, easeOut)}><div style={{ fontSize: Math.round(H * 0.19), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1.02 }}>{l}</div></Mask>)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 26, opacity: prog(f, 20, 14) }}><div style={{ width: lerp(0, 120, prog(f, 18, 18, easeOut)), height: 10, background: c.accent }} /><div style={{ fontSize: 40, fontWeight: 800, ...TNUM }}>{info.dateLabel}</div></div>
        <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.6 * prog(f, 26, 14), marginTop: 12 }}>{info.venue}</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, bottom: PAD * 0.8, display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, fontWeight: 700, opacity: prog(f, 60, 14) }}><div style={{ width: 16, height: 16, background: c.accent }} />하이라이트 {p.sessions.length}개</div>
      {agenda.map((a, i) => {
        const y = top + i * rowH, ap = prog(f, 8 + i * 5, 18, easeOut), on = !!a.highlight, lit = on ? prog(f, 52 + hi * 7, 14, easeOut) : 0, num = on ? ++hi : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: x0, right: PAD, top: y, height: rowH, display: 'flex', alignItems: 'center', borderTop: '2px solid rgba(20,22,63,.16)', opacity: ap * (on ? 1 : lerp(1, 0.5, prog(f, 50, 14))), transform: `translateX(${(1 - ap) * 60}px)` }}>
            <div style={{ position: 'absolute', left: -x0 * 0 - 0, top: 0, width: 8, height: rowH * lit, background: c.accent, marginLeft: -26 }} />
            <div style={{ width: 190, fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', color: on && lit > 0.5 ? c.accent : c.ink, ...TNUM }}>{a.start}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: on ? 44 : 36, fontWeight: on ? 900 : 700, letterSpacing: '-0.03em' }}>{a.title}</div>{(a.speaker || a.room) && <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.55, marginTop: 2 }}>{[a.speaker, a.room].filter(Boolean).join('  ·  ')}</div>}</div>
            {on && <div style={{ width: 52, height: 52, borderRadius: 26, background: c.accent, color: '#fff', fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: lit, transform: `scale(${lerp(0.4, 1, lit)})`, ...TNUM }}>{num}</div>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 연사 인용문: 어두운 배경 + 큰 따옴표 + 연사 사진 */
export const QuoteScene: React.FC<{ p: EventProps }> = ({ p }) => {
  const f = useCurrentFrame(); const { W, H, PAD, portrait } = useLayout(); const PW = Math.round(H * 0.62);
  const { colors: c, quote: q } = p;
  if (portrait) { const out = prog(f, 95, 10, easeInOut); return (<AbsoluteFill><PortraitQuote bg={c.ink} accent={c.accent} photo={q.photo} text={q.text} name={q.speaker} role={q.role} dur={105} kicker="QUOTE" /><div style={{ position: 'absolute', inset: 0, background: c.accent, transform: `translateX(${(out - 1) * 100}%)` }} /></AbsoluteFill>); }
  const lines = q.text.split('\n'); const fs = Math.min(84, fitFont(lines.reduce((a, b) => (a.length > b.length ? a : b), ''), 999, W - PW - PAD * 1.6, 0.92));
  const reveal = prog(f, 0, 24, easeInOut), out = prog(f, 95, 10, easeInOut);
  return (
    <AbsoluteFill style={{ background: c.ink, color: '#fff', fontFamily: FONT_UI, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: 0, top: 0, width: PW, height: H, clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)` }}><Photo src={q.photo} scale={interpolate(f, [0, 105], [1.12, 1.02])} /></div>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', color: c.accent, opacity: prog(f, 0, 10) }}>QUOTE</div>
      <div style={{ position: 'absolute', left: PAD - 6, top: H * 0.1, fontSize: 340, fontWeight: 900, lineHeight: 1, color: c.accent, opacity: prog(f, 4, 16), transform: `translateY(${(1 - prog(f, 4, 16, easeOut)) * 30}px)` }}>“</div>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.36 }}>
        {lines.map((l, i) => <Mask key={i} p={prog(f, 10 + i * 8, 26, easeOut)}><div style={{ fontSize: fs, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.28, whiteSpace: 'nowrap' }}>{l.replace(/^"|"$/g, '')}</div></Mask>)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 40, opacity: prog(f, 36, 16) }}><div style={{ width: lerp(0, 90, prog(f, 34, 18, easeOut)), height: 8, background: c.accent }} /><div><div style={{ fontSize: 44, fontWeight: 800 }}>{q.speaker}</div><div style={{ fontSize: 28, fontWeight: 600, opacity: 0.7 }}>{q.role}</div></div></div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: c.accent, transform: `translateX(${(out - 1) * 100}%)` }} />
    </AbsoluteFill>
  );
};

/** 숫자 요약: 포인트 컬러 배경 + 카운트업 */
export const StatsScene: React.FC<{ p: EventProps }> = ({ p }) => {
  const f = useCurrentFrame(); const { W, H, PAD, portrait } = useLayout(); const PW = Math.round(H * 0.6);
  const { colors: c, stats } = p; const reveal = prog(f, 0, 22, easeInOut), out = prog(f, 110, 10, easeInOut);
  if (portrait) return (<AbsoluteFill><PortraitStats bg={c.accent} fg={c.ink} kicker="BY THE NUMBERS" items={stats} photo={p.statsPhoto} dur={120} /><div style={{ position: 'absolute', inset: 0, background: c.ink, transform: `translateX(${(out - 1) * 100}%)` }} /></AbsoluteFill>);
  const gw = W - PW - PAD * 2.2;
  return (
    <AbsoluteFill style={{ background: c.accent, color: c.ink, fontFamily: FONT_UI, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, fontSize: 26, fontWeight: 800, letterSpacing: '0.12em', opacity: prog(f, 0, 10) }}>BY THE NUMBERS</div>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.2, width: gw, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${H * 0.07}px ${PAD * 0.6}px` }}>
        {stats.map((s, i) => { const a = prog(f, 8 + i * 8, 20, easeOut), v = Math.round(s.n * prog(f, 10 + i * 8, 44, easeOut)); return (
          <div key={i} style={{ borderTop: `4px solid ${c.ink}`, paddingTop: 16, opacity: a }}>
            <div style={{ fontSize: Math.round(H * 0.17), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, ...TNUM }}>{v.toLocaleString()}</div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8 }}>{s.l}</div>
          </div>); })}
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, width: PW, height: H, clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)` }}><Photo src={p.statsPhoto} scale={interpolate(f, [0, 120], [1.14, 1.02])} /></div>
      <div style={{ position: 'absolute', inset: 0, background: c.ink, transform: `translateX(${(out - 1) * 100}%)` }} />
    </AbsoluteFill>
  );
};
