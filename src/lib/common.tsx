import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile } from 'remotion';
import type { Theme } from './themes';
import { samplePhotos } from './samplePhotos';

export type IntroProps = {
  title: string;
  subtitle: string;
  dateRange: string;
  location: string;
  photos: string[];
  theme: Theme;
};

export const FONT_SERIF = `'Playfair Display','Noto Serif KR',serif`;
export const FONT_SANS = `'Inter','Noto Sans KR',sans-serif`;
export const FONT_MONO = `'JetBrains Mono',ui-monospace,monospace`;
export const FONT_DISPLAY = `'Anton','Noto Sans KR',sans-serif`;

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.76, 0, 0.24, 1);
export const easeBack = Easing.bezier(0.34, 1.56, 0.64, 1);

/** start부터 dur 프레임 동안 0→1 (clamp) */
export const prog = (frame: number, start: number, dur: number, easing: (t: number) => number = easeOut) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 사진이 비어있으면 테마 샘플 사진으로 대체 */
export function usePhotos(photos: string[], theme: Theme): string[] {
  return useMemo(() => (photos.length ? photos : samplePhotos(theme)), [photos, theme]);
}

/** 제목 길이에 맞춘 글자 크기 */
export const fitFont = (text: string, max: number, widthBudget: number, em = 0.62) =>
  Math.min(max, widthBudget / Math.max(text.length * em, 1));

// 노이즈 타일 (그레인) — 1회 생성 후 프레임마다 오프셋만 변경
let noiseUrl: string | null = null;
function getNoise() {
  if (noiseUrl) return noiseUrl;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!; const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(random(`n${i}`) * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); noiseUrl = c.toDataURL('image/png'); return noiseUrl;
}

export const Grain: React.FC<{ frame: number; opacity?: number; blend?: React.CSSProperties['mixBlendMode'] }> = ({ frame, opacity = 0.09, blend = 'overlay' }) => {
  const x = Math.floor(random(`gx${frame}`) * 256), y = Math.floor(random(`gy${frame}`) * 256);
  return (
    <AbsoluteFill style={{ backgroundImage: `url(${getNoise()})`, backgroundPosition: `${x}px ${y}px`, opacity, mixBlendMode: blend, pointerEvents: 'none' }} />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.7 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none' }} />
);

/** 글자 단위 마스크 리빌 */
export const SplitReveal: React.FC<{
  text: string; frame: number; start: number; stagger?: number; dur?: number;
  style?: React.CSSProperties; blur?: number; fromY?: number;
}> = ({ text, frame, start, stagger = 2.2, dur = 26, style, blur = 14, fromY = 115 }) => (
  <div style={{ display: 'flex', justifyContent: 'center', whiteSpace: 'pre', ...style }}>
    {Array.from(text).map((ch, i) => {
      const p = prog(frame, start + i * stagger, dur);
      return (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.18em', marginBottom: '-0.18em', paddingTop: '0.1em', marginTop: '-0.1em' }}>
          <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * fromY}%)`, filter: `blur(${(1 - p) * blur}px)`, opacity: Math.min(1, p * 2.5) }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        </span>
      );
    })}
  </div>
);

/** 사진 경로 해석: data/blob/http는 그대로, 그 외는 public 폴더 기준 */
export const resolveSrc = (u: string) => (/^(data:|blob:|https?:|\/)/.test(u) ? u : staticFile(u));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const TNUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' };
export const FONT_UI = `'Pretendard','Noto Sans KR','Inter',sans-serif`;
export const PAPER = '#ecebe5';
export const INK = '#111111';
export const Photo: React.FC<{ src: string; fy?: number; fx?: number; scale?: number; tx?: number; ty?: number; style?: React.CSSProperties }> = ({ src, fy = 0.4, fx = 0.5, scale = 1, tx = 0, ty = 0, style }) => (
  <Img src={resolveSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`, transform: `translate(${tx}%, ${ty}%) scale(${scale})`, ...style }} />
);
