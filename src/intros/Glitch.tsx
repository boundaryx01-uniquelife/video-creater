import React from 'react';
import { AbsoluteFill, Img, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_DISPLAY, FONT_MONO, FONT_SANS, Grain, IntroProps, prog, usePhotos, fitFont } from '../lib/common';

/** 글리치 키네틱 — RGB 채널 분리, 슬라이스 변위, 스캔라인, REC 타임코드 HUD */
export const Glitch: React.FC<IntroProps> = ({ title, subtitle, dateRange, location, photos, theme }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const ph = usePhotos(photos, theme);
  const text = title.toUpperCase();
  const fs = fitFont(text, 260, width * 0.88, 0.5);

  const burst = (f: number) => (f > 12 && f < 96 ? random(`g${Math.floor(f / 2)}`) > 0.6 : f >= 96 && f < 102 && random(`e${f}`) > 0.4);
  const g = burst(frame);
  const amt = g ? 10 + random(`amt${frame}`) * 34 : frame < 100 ? 3 : 1.2;
  const settle = prog(frame, 92, 10);
  const appear = frame < 10 ? 0 : frame < 20 ? (random(`f${frame}`) > 0.4 ? 1 : 0) : 1;
  const photoIdx = frame < 60 ? Math.floor(frame / 8) % ph.length : 2;
  const out = 1 - prog(frame, 140, 10);

  const titleLayer = (color: string, dx: number, blend?: React.CSSProperties['mixBlendMode'], extra?: React.CSSProperties) => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateX(${dx}px)`, mixBlendMode: blend, color, fontFamily: FONT_DISPLAY, fontSize: fs, letterSpacing: '0.02em', lineHeight: 1, whiteSpace: 'nowrap', ...extra }}>{text}</div>
  );

  const slices = g ? [0, 1, 2, 3, 4].map((i) => ({ top: random(`t${frame}${i}`) * 90, h: 4 + random(`h${frame}${i}`) * 14, dx: (random(`d${frame}${i}`) - 0.5) * 140 })) : [];
  const sec = Math.floor(frame / fps), ff = frame % fps;
  const tc = `00:00:0${sec}:${String(ff).padStart(2, '0')}`;

  return (
    <AbsoluteFill style={{ background: '#050507', opacity: out, overflow: 'hidden' }}>
      <AbsoluteFill style={{ opacity: 0.55 * (1 - settle * 0.5) }}>
        <Img src={ph[photoIdx]} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `grayscale(.6) contrast(1.4) brightness(.7) hue-rotate(${g ? 40 : 0}deg)`, transform: `scale(${1.05 + frame * 0.0006}) translateX(${g ? (random(`px${frame}`) - 0.5) * 30 : 0}px)` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${theme.accent}33, transparent 50%, ${theme.accent2}33)`, mixBlendMode: 'color' }} />

      <AbsoluteFill style={{ opacity: appear }}>
        {titleLayer('#ff2d55', -amt, 'screen')}
        {titleLayer('#00e5ff', amt, 'screen')}
        {titleLayer(theme.fg, 0, undefined, { textShadow: `0 0 ${30 * settle}px ${theme.accent}` })}
        {slices.map((s, i) => (
          <div key={i} style={{ position: 'absolute', inset: 0, clipPath: `inset(${s.top}% 0 ${100 - s.top - s.h}% 0)`, transform: `translateX(${s.dx}px)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: fs, color: i % 2 ? '#00e5ff' : '#ff2d55', whiteSpace: 'nowrap' }}>{text}</div>
        ))}
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: theme.fg }}>
        <div style={{ marginTop: fs * 1.05, textAlign: 'center', fontFamily: FONT_SANS, fontWeight: 500, fontSize: 28, letterSpacing: '0.55em', textTransform: 'uppercase', opacity: prog(frame, 88, 12), clipPath: `inset(0 ${(1 - prog(frame, 88, 20)) * 100}% 0 0)` }}>{subtitle}</div>
      </AbsoluteFill>

      {/* HUD */}
      <div style={{ position: 'absolute', inset: 50, fontFamily: FONT_MONO, fontSize: 20, color: theme.fg, letterSpacing: '0.15em' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: '#ff2d55', opacity: Math.floor(frame / 15) % 2 ? 0.25 : 1 }} /> REC
        </div>
        <div style={{ position: 'absolute', right: 0, top: 0 }}>{tc}</div>
        <div style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.8 }}>{location}</div>
        <div style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.8 }}>{dateRange}</div>
        {[['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']].map(([h, v]) => (
          <div key={h + v} style={{ position: 'absolute', [h]: -14, [v]: -14, width: 30, height: 30, borderTop: v === 'top' ? `2px solid ${theme.fg}` : 'none', borderBottom: v === 'bottom' ? `2px solid ${theme.fg}` : 'none', borderLeft: h === 'left' ? `2px solid ${theme.fg}` : 'none', borderRight: h === 'right' ? `2px solid ${theme.fg}` : 'none', opacity: 0.6 }} />
        ))}
      </div>
      <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, transparent 2px 4px)', opacity: 0.6 }} />
      <AbsoluteFill style={{ background: '#fff', opacity: g && random(`fl${frame}`) > 0.85 ? 0.18 : 0 }} />
      <Grain frame={frame} opacity={0.16} />
    </AbsoluteFill>
  );
};
