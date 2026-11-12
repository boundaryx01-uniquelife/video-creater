import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_MONO, FONT_SANS, FONT_SERIF, Grain, IntroProps, easeInOut, fitFont, prog, usePhotos } from '../lib/common';

const Line: React.FC<{ p: number; vertical?: boolean; color: string; style?: React.CSSProperties }> = ({ p, vertical, color, style }) => (
  <div style={{ position: 'absolute', background: color, ...(vertical ? { width: 1.5, height: `${p * 100}%` } : { height: 1.5, width: `${p * 100}%` }), ...style }} />
);

/** 에디토리얼 미니멀 — 매거진 레이아웃: 괘선 드로잉, 마스크 타이포, 사진 윈도우 리빌, 회전 배지 */
export const Editorial: React.FC<IntroProps> = ({ title, subtitle, dateRange, location, photos, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ph = usePhotos(photos, theme);
  const ink = '#14110f';
  const words = title.split(' ');
  const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [title];
  const fs = fitFont(lines.reduce((a, b) => (a.length > b.length ? a : b)), 190, width * 0.52, 0.56);

  const rule = prog(frame, 2, 30, easeInOut);
  const photoP = prog(frame, 20, 40, easeInOut);
  const imgScale = interpolate(photoP, [0, 1], [1.5, 1.05]) + frame * 0.0006;
  const meta = prog(frame, 40, 24);
  const wipe = interpolate(frame, [128, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut });
  const idx = Math.min(12, Math.floor(prog(frame, 20, 90, (t) => t) * 12) + 1);

  return (
    <AbsoluteFill style={{ background: theme.paper, color: ink, overflow: 'hidden' }}>
      <Grain frame={frame} opacity={0.18} blend="multiply" />
      {/* 괘선 */}
      <Line p={rule} color={ink} style={{ left: 80, top: 110, width: width - 160 }} />
      <Line p={rule} color={ink} style={{ left: 80, bottom: 110, width: width - 160 }} />
      <Line p={rule} vertical color={ink} style={{ left: width * 0.58, top: 110, height: height - 220 }} />

      {/* 상단/하단 메타 */}
      <div style={{ position: 'absolute', left: 80, top: 60, right: 80, display: 'flex', justifyContent: 'space-between', fontFamily: FONT_MONO, fontSize: 18, letterSpacing: '0.3em', opacity: meta }}>
        <span>PHOTO REEL — ARCHIVE No.{String(idx).padStart(2, '0')}</span><span>{location}</span><span>{dateRange}</span>
      </div>
      <div style={{ position: 'absolute', left: 80, bottom: 58, right: 80, display: 'flex', justifyContent: 'space-between', fontFamily: FONT_MONO, fontSize: 18, letterSpacing: '0.3em', opacity: meta }}>
        <span>{subtitle}</span><span>{String(idx).padStart(2, '0')} / 12</span>
      </div>

      {/* 타이틀 */}
      <div style={{ position: 'absolute', left: 80, top: 150, bottom: 150, width: width * 0.58 - 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {lines.map((l, i) => {
          const p = prog(frame, 26 + i * 8, 34);
          return (
            <div key={i} style={{ overflow: 'hidden', paddingBottom: '0.12em' }}>
              <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: fs, lineHeight: 1.0, letterSpacing: '-0.01em', fontStyle: i % 2 ? 'italic' : 'normal', color: i % 2 ? theme.accent2 : ink, transform: `translateY(${(1 - p) * 105}%)` }}>{l}</div>
            </div>
          );
        })}
        <div style={{ marginTop: 34, fontFamily: FONT_SANS, fontWeight: 300, fontSize: 26, lineHeight: 1.5, maxWidth: 640, opacity: prog(frame, 70, 30), transform: `translateY(${(1 - prog(frame, 70, 30)) * 16}px)` }}>
          <span style={{ display: 'inline-block', width: 60, height: 2, background: theme.accent, verticalAlign: 'middle', marginRight: 18 }} />{subtitle}
        </div>
      </div>

      {/* 사진 윈도우 */}
      <div style={{ position: 'absolute', left: width * 0.58 + 40, top: 150, right: 80, bottom: 150, overflow: 'hidden', clipPath: `inset(${(1 - photoP) * 100}% 0 0 0)` }}>
        <Img src={ph[3 % ph.length]} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${imgScale})` }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 60%, ${theme.accent2}55)`, mixBlendMode: 'multiply' }} />
      </div>

      {/* 회전 배지 */}
      <svg width={190} height={190} viewBox="0 0 200 200" style={{ position: 'absolute', right: 120, bottom: 90, transform: `rotate(${frame * 1.6}deg)`, opacity: meta }}>
        <defs><path id="circ" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" /></defs>
        <circle cx={100} cy={100} r={96} fill={theme.accent} />
        <text fontFamily={FONT_MONO} fontSize={16} letterSpacing={5} fill={ink}><textPath href="#circ">MEMORIES · COLLECTED · MOMENTS · </textPath></text>
      </svg>

      {/* 퇴장 와이프 */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%', background: ink, transform: `translateX(${(1 - wipe) * -100}%)` }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%', background: theme.accent, transform: `translateX(${(1 - Math.max(0, wipe - 0.12) / 0.88) * -100}%)`, opacity: wipe > 0 ? 1 : 0 }} />
    </AbsoluteFill>
  );
};
