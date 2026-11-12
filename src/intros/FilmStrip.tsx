import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_MONO, FONT_SANS, FONT_SERIF, Grain, IntroProps, Vignette, easeInOut, fitFont, prog, usePhotos } from '../lib/common';

const FW = 420, FH = 280, GAP = 36, ROW_H = FH + 120, N = 12;

/** 필름 스트립 — 기울어진 3D 필름 롤이 흘러가다 셔터 플래시와 함께 타이틀로 수렴 */
export const FilmStrip: React.FC<IntroProps> = ({ title, subtitle, dateRange, location, photos, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ph = usePhotos(photos, theme);

  const rows = [0, 1, 2, 3, 4];
  const cam = interpolate(frame, [0, 150], [1.12, 1.4]);
  const settle = prog(frame, 66, 26, easeInOut);
  const flash = interpolate(frame, [64, 68, 82], [0, 0.95, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleP = prog(frame, 72, 30);
  const out = 1 - prog(frame, 138, 12, easeInOut);
  const fs = fitFont(title, 150, width * 0.7);
  const strip = N * (FW + GAP);

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${theme.bg2}, ${theme.bg})` }} />
      <AbsoluteFill style={{ perspective: 1900, filter: `blur(${settle * 14}px) brightness(${1 - settle * 0.62})` }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: strip, height: rows.length * ROW_H, transform: `translate(-50%,-50%) rotateX(22deg) rotateZ(-11deg) scale(${cam})`, transformStyle: 'preserve-3d' }}>
          {rows.map((r) => {
            const dir = r % 2 ? 1 : -1;
            const x = dir * (frame * (10 + r * 2.2)) - (dir > 0 ? strip / 2 : 0) - 300;
            return (
              <div key={r} style={{ position: 'absolute', top: r * ROW_H, left: 0, height: ROW_H - 24, width: strip * 2, transform: `translateX(${x}px)`, background: '#0a0a0a', boxShadow: '0 20px 60px rgba(0,0,0,.6)', borderTop: '2px solid #222', borderBottom: '2px solid #222' }}>
                <Sprockets top />
                <Sprockets />
                <div style={{ position: 'absolute', top: 60, left: 0, display: 'flex', gap: GAP, paddingLeft: GAP }}>
                  {Array.from({ length: N * 2 }, (_, i) => (
                    <div key={i} style={{ width: FW, height: FH, flex: 'none', position: 'relative', borderRadius: 4, overflow: 'hidden', boxShadow: '0 0 0 3px #111' }}>
                      <Img src={ph[(i + r * 3) % ph.length]} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.08) saturate(1.1)' }} />
                      <span style={{ position: 'absolute', left: 8, bottom: 6, fontFamily: FONT_MONO, fontSize: 14, color: '#ffb84d', opacity: 0.85 }}>{String((i % N) + 1).padStart(2, '0')}A ▸</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Vignette strength={0.85} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: theme.fg, opacity: out }}>
        <div style={{ position: 'relative', padding: '56px 110px', transform: `scale(${0.92 + titleP * 0.08})`, opacity: titleP }}>
          <div style={{ position: 'absolute', inset: 0, background: `${theme.bg}99`, backdropFilter: 'blur(14px)', border: `1px solid ${theme.accent}66`, clipPath: `inset(0 ${(1 - titleP) * 50}% 0 ${(1 - titleP) * 50}%)` }} />
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 20, letterSpacing: '0.5em', color: theme.accent, marginBottom: 22 }}>{dateRange}</div>
            <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: fs, lineHeight: 1.05, letterSpacing: '0.01em' }}>{title}</div>
            <div style={{ fontFamily: FONT_SANS, fontWeight: 300, fontSize: 28, letterSpacing: '0.4em', textTransform: 'uppercase', marginTop: 24 }}>{subtitle}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 18, letterSpacing: '0.3em', opacity: 0.6, marginTop: 20 }}>{location}</div>
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#fff', opacity: flash, mixBlendMode: 'screen' }} />
      <Grain frame={frame} opacity={0.12} />
      <AbsoluteFill style={{ background: '#000', opacity: 1 - prog(frame, 0, 8) }} />
    </AbsoluteFill>
  );
};

const Sprockets: React.FC<{ top?: boolean }> = ({ top }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, [top ? 'top' : 'bottom']: 14, height: 26, backgroundImage: 'repeating-linear-gradient(90deg, #d8d2c4 0 22px, transparent 22px 48px)', backgroundSize: '48px 26px', maskImage: 'linear-gradient(#000,#000)', borderRadius: 4, opacity: 0.92, WebkitMask: 'repeating-linear-gradient(90deg, #000 0 22px, transparent 22px 48px)' }} />
);
