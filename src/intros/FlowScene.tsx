import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Beat, ChapterSpec, PhotoSpec } from '../analysis/videoData.ts';
import { OV, planFlow } from '../analysis/videoData.ts';
import { FONT_UI, INK, PAPER, Photo, TNUM, easeInOut, easeOut, lerp, prog } from '../lib/common';

const Caption: React.FC<{ p: PhotoSpec; pad: number; size?: number; delay?: number; dark?: boolean; accent?: string; on?: string }> = ({ p, pad, size = 1, delay = 6, dark = false, accent = '#fff', on = '#fff' }) => {
  const f = useCurrentFrame(); const a = prog(f, delay, 12);
  if (p.cap) return (
    <div style={{ position: 'absolute', left: pad, bottom: pad * 0.9, color: '#fff', opacity: a, transform: `translateX(${(1 - a) * -30}px)`, fontFamily: FONT_UI, ...TNUM }}>
      {p.cap.chip && <div style={{ display: 'inline-block', background: accent, color: on, fontSize: 30 * size, fontWeight: 800, padding: '6px 18px' }}>{p.cap.chip}</div>}
      {p.cap.title && <div style={{ fontSize: 66 * size, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, marginTop: 14 * size, textShadow: '0 2px 20px rgba(0,0,0,.5)' }}>{p.cap.title}</div>}
      {p.cap.sub && <div style={{ fontSize: 30 * size, fontWeight: 600, opacity: 0.88, marginTop: 6 * size, textShadow: '0 2px 14px rgba(0,0,0,.5)' }}>{p.cap.sub}</div>}
    </div>);
  return (
    <div style={{ position: 'absolute', left: pad, bottom: pad * 0.55, color: dark ? INK : '#fff', opacity: a, transform: `translateY(${(1 - a) * 12}px)`, fontFamily: FONT_UI, ...TNUM }}>
      <div style={{ fontSize: 40 * size, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, textShadow: dark ? 'none' : '0 2px 18px rgba(0,0,0,.45)' }}>{p.time}</div>
      <div style={{ fontSize: 21 * size, fontWeight: 600, opacity: 0.85, marginTop: 4, textShadow: dark ? 'none' : '0 2px 14px rgba(0,0,0,.5)' }}>{p.exif}</div>
    </div>
  );
};

const enterStyle = (enter: Beat['enter'], p: number): React.CSSProperties => {
  switch (enter) {
    case 'wipeUp': return { clipPath: `inset(${(1 - p) * 100}% 0 0 0)` };
    case 'wipeLeft': return { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` };
    case 'push': return { transform: `translateX(${(1 - p) * 100}%)` };
    case 'zoom': return { clipPath: `inset(${(1 - p) * 14}% ${(1 - p) * 14}% ${(1 - p) * 14}% ${(1 - p) * 14}% round ${(1 - p) * 40}px)`, opacity: Math.min(1, p * 3), transform: `scale(${1.12 - p * 0.12})` };
    default: return {};
  }
};

const BeatView: React.FC<{ b: Beat; ch: ChapterSpec; first: boolean }> = ({ b, ch, first }) => {
  const f = useCurrentFrame(); const { width: W, height: H } = useVideoConfig();
  const PAD = Math.round(W * 0.0625);
  const lf = first ? f : Math.max(0, f - OV);           // 전환 이후 기준 프레임
  const p = first ? 1 : prog(f, 0, OV, easeInOut);
  const dirx = (b.seed % 2 ? 1 : -1), kb = (s0: number, s1: number) => interpolate(lf, [0, b.dur], [s0, s1], { extrapolateRight: 'clamp' });
  let body: React.ReactNode;

  if (b.kind === 'full') {
    const ph = b.photos[0];
    body = (<AbsoluteFill style={{ background: '#000' }}>
      <Photo src={ph.src} fy={ph.fy} scale={first ? kb(1.04, 1.1) : kb(1.0, 1.08)} tx={dirx * interpolate(lf, [0, b.dur], [0, 1.6], { extrapolateRight: 'clamp' })} />
      <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 28%)' }} />
      <Caption p={ph} pad={PAD} accent={ch.accent} on={ch.onAccent} />
    </AbsoluteFill>);
  } else if (b.kind === 'editorial') {
    const ph = b.photos[0], PW = Math.round(H * 0.75);
    const [hh, mm] = ph.time.split(':'); const a = (d: number) => prog(lf, d, 18, easeOut);
    body = (<AbsoluteFill style={{ background: ch.light, color: INK, fontFamily: FONT_UI }}>
      <div style={{ position: 'absolute', right: 0, top: 0, width: PW, height: H, overflow: 'hidden' }}>
        <Photo src={ph.src} fy={ph.fy} fx={ph.fx} scale={first ? kb(1.04, 1.1) : kb(1.1, 1.0)} />
      </div>
      <div style={{ position: 'absolute', left: PAD - 10, top: H * 0.17, overflow: 'hidden', paddingBottom: '0.05em' }}>
        <div style={{ fontSize: Math.min(Math.round(H * 0.34), Math.round((W - PW - PAD * 1.5) / 3.05)), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, transform: `translateY(${(1 - a(first ? 4 : 2)) * 105}%)`, ...TNUM }}>{hh}<span style={{ color: ch.accent }}>:</span>{mm}</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, bottom: H * 0.17, ...TNUM, opacity: a(10), transform: `translateY(${(1 - a(10)) * 20}px)` }}>
        <div style={{ width: 120, height: 10, background: ch.accent, marginBottom: 26 }} />
        <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em' }}>{ph.cap ? ph.cap.title || ph.cap.chip : `${ph.date} (${ph.wd})`}</div>
        <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.6, marginTop: 10 }}>{ph.cap ? ph.cap.sub : ph.model}</div>
        {!ph.cap && <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.6, marginTop: 4 }}>{ph.exif}</div>}
      </div>
    </AbsoluteFill>);
  } else if (b.kind === 'pair') {
    const [l, r] = b.photos; const hw = W / 2;
    body = (<AbsoluteFill>
      {[l, r].map((ph, i) => { const a = prog(f, i * 4, 14, easeOut); return (
        <div key={i} style={{ position: 'absolute', left: i ? hw + 4 : 0, top: 0, width: hw - 4, height: H, overflow: 'hidden', clipPath: `inset(${i ? (1 - a) * 100 : 0}% 0 ${i ? 0 : (1 - a) * 100}% 0)` }}>
          <Photo src={ph.src} fy={ph.fy} scale={kb(1.0, 1.06)} ty={(i ? -1 : 1) * interpolate(lf, [0, b.dur], [0, 1.2], { extrapolateRight: 'clamp' })} />
          <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 24%)' }} />
          <Caption p={ph} pad={Math.round(PAD * 0.7)} size={0.8} delay={10 + i * 4} accent={ch.accent} on={ch.onAccent} />
        </div>); })}
    </AbsoluteFill>);
  } else {
    body = (<AbsoluteFill>
      {b.photos.slice(0, 4).map((ph, i) => { const a = prog(f, i * 4, 12, easeOut); const cx = i % 2, cy = Math.floor(i / 2);
        return (
          <div key={i} style={{ position: 'absolute', left: cx * (W / 2) + (cx ? 4 : 0), top: cy * (H / 2) + (cy ? 4 : 0), width: W / 2 - 4, height: H / 2 - 4, overflow: 'hidden', clipPath: `inset(${(1 - a) * 100}% 0 0 0)` }}>
            <Photo src={ph.src} fy={ph.fy} scale={lerp(1.2, 1.04, a)} />
            <div style={{ position: 'absolute', left: 24, bottom: 18, color: '#fff', fontSize: 28, fontWeight: 800, fontFamily: FONT_UI, textShadow: '0 2px 12px rgba(0,0,0,.6)', ...TNUM }}>{ph.time}</div>
          </div>); })}
    </AbsoluteFill>);
  }
  return <AbsoluteFill style={enterStyle(first || b.kind === 'pair' || b.kind === 'grid' ? 'none' : b.enter, p)}>{body}</AbsoluteFill>;
};

export const FlowScene: React.FC<{ ch: ChapterSpec; wipe?: string; bug?: string }> = ({ ch, wipe: wipeColor = PAPER, bug }) => {
  const frame = useCurrentFrame(); const { width: W } = useVideoConfig();
  const plan = React.useMemo(() => planFlow(ch), [ch]);
  const wipe = prog(frame, plan.total - 11, 10, easeInOut);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {plan.beats.map((b, i) => (<Sequence key={i} from={b.from} durationInFrames={b.len}><BeatView b={b} ch={ch} first={i === 0} /></Sequence>))}
      <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: `${(frame / plan.total) * 100}%`, background: ch.accent }} />
      {bug && <div style={{ position: 'absolute', right: 56, top: 30, display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontFamily: FONT_UI, fontWeight: 800, fontSize: 24, letterSpacing: '0.08em', textShadow: '0 2px 10px rgba(0,0,0,.5)' }}><div style={{ width: 14, height: 14, background: ch.accent }} />{bug}</div>}
      <div style={{ position: 'absolute', inset: 0, background: wipeColor, transform: `translateX(${(wipe - 1) * 100}%)` }} />
    </AbsoluteFill>
  );
};
