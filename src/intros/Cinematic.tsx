import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_MONO, FONT_SANS, FONT_SERIF, Grain, IntroProps, SplitReveal, Vignette, easeInOut, fitFont, prog, usePhotos } from '../lib/common';

/** 시네마틱 타이틀 — 영화 오프닝 풍: 시네마스코프 레터박스, 켄번즈, 글자 마스크 리빌, 라이트 스윕 */
export const Cinematic: React.FC<IntroProps> = ({ title, subtitle, dateRange, location, photos, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ph = usePhotos(photos, theme);

  const zoom = interpolate(frame, [0, 150], [1.2, 1.04]);
  const driftX = interpolate(frame, [0, 150], [30, -30]);
  const focus = 1 - prog(frame, 0, 42);
  const bar = prog(frame, 0, 26, easeInOut) * 128;
  const lineW = prog(frame, 52, 30) * 260;
  const sweep = interpolate(frame, [58, 100], [-40, 140], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subP = prog(frame, 70, 34);
  const out = 1 - prog(frame, 136, 14, easeInOut);
  const fs = fitFont(title, 168, width * 0.84);

  return (
    <AbsoluteFill style={{ background: theme.bg, opacity: 1, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) translateX(${driftX}px)`, filter: `blur(${focus * 22}px) brightness(${0.42 + (1 - focus) * 0.2}) saturate(1.15)` }}>
        <Img src={ph[1]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${theme.bg}cc 0%, transparent 35%, transparent 60%, ${theme.bg}dd 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 40%, ${theme.accent}22, transparent 60%)`, mixBlendMode: 'screen' }} />
      <Vignette strength={0.75} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: theme.fg, opacity: out }}>
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <SplitReveal text={title} frame={frame} start={26} style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: fs, letterSpacing: '0.02em', lineHeight: 1.05, textShadow: '0 8px 50px rgba(0,0,0,.55)' }} />
          {/* 라이트 스윕 */}
          <div style={{ position: 'absolute', inset: '-10% -5%', overflow: 'hidden', pointerEvents: 'none', mixBlendMode: 'overlay' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sweep}%`, width: '14%', transform: 'skewX(-20deg)', background: `linear-gradient(90deg, transparent, ${theme.fg}, transparent)`, filter: 'blur(8px)' }} />
          </div>
        </div>
        <div style={{ width: lineW, height: 2, background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`, margin: '34px 0 26px' }} />
        <div style={{ fontFamily: FONT_SANS, fontWeight: 300, fontSize: 30, textTransform: 'uppercase', letterSpacing: `${0.9 - subP * 0.52}em`, opacity: subP, transform: `translateY(${(1 - subP) * 14}px)`, color: theme.fg, paddingLeft: `${0.9 - subP * 0.52}em` }}>
          {subtitle}
        </div>
      </AbsoluteFill>

      {/* 레터박스 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 80px', fontFamily: FONT_MONO, fontSize: 20, letterSpacing: '0.25em', color: theme.fg, opacity: prog(frame, 40, 24) * out * 0.85 }}>
        <span>{dateRange}</span><span style={{ color: theme.accent }}>{location}</span>
      </div>
      <Grain frame={frame} opacity={0.1} />
      <AbsoluteFill style={{ background: '#000', opacity: 1 - prog(frame, 0, 10) }} />
    </AbsoluteFill>
  );
};
