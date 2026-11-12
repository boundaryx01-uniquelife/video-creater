import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_MONO, FONT_SANS, FONT_SERIF, Grain, IntroProps, Vignette, easeOut, fitFont, prog } from '../lib/common';

type Pt = { x: number; y: number };

/** 파티클 리빌 — 흩어진 입자가 소용돌이치며 제목 형태로 모임 (프레임의 순수 함수 → 결정적 렌더) */
export const Particles: React.FC<IntroProps> = ({ title, subtitle, dateRange, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [pts, setPts] = useState<Pt[] | null>(null);
  const [handle] = useState(() => delayRender('particle-font'));
  const fs = fitFont(title, 190, width * 0.82, 0.6);
  const font = `700 ${fs}px "Playfair Display","Noto Serif KR",serif`;

  useEffect(() => {
    document.fonts.load(font, title).then(() => {
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      const g = c.getContext('2d')!;
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
      g.fillText(title, width / 2, height / 2 - 20);
      const d = g.getImageData(0, 0, width, height).data;
      let stride = 4, out: Pt[] = [];
      for (;;) {
        out = [];
        for (let y = 0; y < height; y += stride) for (let x = 0; x < width; x += stride) if (d[(y * width + x) * 4 + 3] > 128) out.push({ x, y });
        if (out.length <= 6500) break; stride++;
      }
      setPts(out); continueRender(handle);
    }).catch((e) => cancelRender(e));
  }, [font, title, width, height, handle]);

  useEffect(() => {
    const cv = ref.current; if (!cv || !pts) return;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, width, height);
    g.globalCompositeOperation = 'lighter';
    const cx = width / 2, cy = height / 2;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const r1 = random(`a${i}`), r2 = random(`b${i}`), r3 = random(`c${i}`);
      const ang0 = r1 * Math.PI * 2, rad0 = 500 + r2 * 900;
      const sx = cx + Math.cos(ang0) * rad0, sy = cy + Math.sin(ang0) * rad0 * 0.62;
      const delay = 8 + (p.x / width) * 22 + r3 * 14;
      const col = i % 5 === 0 ? theme.accent : i % 7 === 0 ? theme.accent2 : theme.fg;
      g.fillStyle = col;
      for (let tr = 0; tr < 3; tr++) {
        const t = easeOut(Math.min(1, Math.max(0, (frame - tr * 1.2 - delay) / 58)));
        const swirl = (1 - t) * (1 - t) * 1.6 * (r1 > 0.5 ? 1 : -1);
        const dx = sx - cx, dy = sy - cy;
        const cos = Math.cos(swirl), sin = Math.sin(swirl);
        const bx = cx + dx * cos - dy * sin, by = cy + dx * sin + dy * cos;
        const x = bx + (p.x - bx) * t, y = by + (p.y - by) * t;
        const shimmer = frame > 84 ? Math.sin(frame * 0.2 + i) * 0.8 : 0;
        g.globalAlpha = (tr === 0 ? 0.95 : 0.22 / (tr)) * Math.min(1, t * 4 + 0.15);
        const s = tr === 0 ? 2.2 + r2 * 1.2 : 2;
        g.fillRect(x + shimmer, y + shimmer, s, s);
      }
    }
    // 완성 후 선명한 텍스트 페이드인
    const solid = prog(frame, 80, 24);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = solid; g.fillStyle = theme.fg;
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = theme.accent; g.shadowBlur = 40 * (1 - solid * 0.6);
    g.fillText(title, cx, cy - 20);
    g.shadowBlur = 0; g.globalAlpha = 1;
  }, [frame, pts, width, height, theme, title, font]);

  const subP = prog(frame, 96, 28);
  const out = 1 - prog(frame, 138, 12);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, ${theme.bg2}, ${theme.bg} 70%)`, opacity: out }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${30 + prog(frame, 0, 150, (t) => t) * 40}% 60%, ${theme.accent}26, transparent 45%)`, mixBlendMode: 'screen' }} />
      <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', inset: 0 }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: theme.fg }}>
        <div style={{ marginTop: fs * 1.15, textAlign: 'center' }}>
          <div style={{ fontFamily: FONT_SANS, fontWeight: 300, fontSize: 30, letterSpacing: `${0.7 - subP * 0.35}em`, textTransform: 'uppercase', opacity: subP, paddingLeft: `${0.7 - subP * 0.35}em` }}>{subtitle}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 18, letterSpacing: '0.45em', color: theme.accent, opacity: subP * 0.9, marginTop: 20 }}>{dateRange}</div>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.6} />
      <Grain frame={frame} opacity={0.07} />
    </AbsoluteFill>
  );
};
