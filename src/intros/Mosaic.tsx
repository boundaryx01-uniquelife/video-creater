import React from 'react';
import { AbsoluteFill, Img, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_MONO, FONT_SANS, FONT_SERIF, Grain, IntroProps, Vignette, easeBack, easeInOut, easeOut, fitFont, prog, usePhotos } from '../lib/common';

const COLS = 8, ROWS = 5;

/** 포토 모자이크 — 사진 타일이 중심에서 물결치며 등장 후 카메라가 뒤로 빠지며 타이틀 패널로 수렴 */
export const Mosaic: React.FC<IntroProps> = ({ title, subtitle, dateRange, location, photos, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ph = usePhotos(photos, theme);
  const tw = width / COLS, th = height / ROWS;
  const cam = prog(frame, 56, 46, easeInOut);
  const scale = interpolate(cam, [0, 1], [1.0, 1.28]);
  const dim = cam * 0.62;
  const panel = prog(frame, 72, 28, easeInOut);
  const out = 1 - prog(frame, 138, 12);
  const fs = fitFont(title, 150, width * 0.7);

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: 'hidden', opacity: out }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) rotate(${cam * -2}deg)`, filter: `blur(${cam * 6}px) brightness(${1 - dim})` }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const c = i % COLS, r = Math.floor(i / COLS);
          const d = Math.hypot(c - (COLS - 1) / 2, (r - (ROWS - 1) / 2) * 1.4);
          const p = prog(frame, 4 + d * 4 + random(`m${i}`) * 4, 26, easeBack);
          const idx = (i * 5 + r * 2) % ph.length;
          return (
            <div key={i} style={{ position: 'absolute', left: c * tw, top: r * th, width: tw, height: th, padding: 3 }}>
              <div style={{ width: '100%', height: '100%', overflow: 'hidden', transform: `scale(${p}) rotate(${(1 - p) * (random(`r${i}`) - 0.5) * 50}deg)`, opacity: Math.min(1, p * 2), borderRadius: 4, boxShadow: '0 10px 30px rgba(0,0,0,.45)' }}>
                <Img src={ph[idx]} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.35 - Math.min(1, frame / 100) * 0.25})` }} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle, transparent 30%, ${theme.bg}cc)` }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: `${panel * 78}%`, height: 360, background: `${theme.bg}d9`, backdropFilter: 'blur(18px)', borderTop: `2px solid ${theme.accent}`, borderBottom: `2px solid ${theme.accent}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.fg }}>
          <div style={{ whiteSpace: 'nowrap', textAlign: 'center', opacity: prog(frame, 84, 20) }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 20, letterSpacing: '0.5em', color: theme.accent, marginBottom: 18, transform: `translateY(${(1 - prog(frame, 84, 24)) * 20}px)` }}>{location} · {dateRange}</div>
            <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: fs, lineHeight: 1.05, letterSpacing: `${0.12 - prog(frame, 84, 40) * 0.1}em`, transform: `translateY(${(1 - prog(frame, 84, 30, easeOut)) * 40}px)` }}>{title}</div>
            <div style={{ fontFamily: FONT_SANS, fontWeight: 300, fontSize: 28, letterSpacing: '0.45em', textTransform: 'uppercase', marginTop: 22, opacity: prog(frame, 100, 20) }}>{subtitle}</div>
          </div>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.55} />
      <Grain frame={frame} opacity={0.08} />
    </AbsoluteFill>
  );
};
