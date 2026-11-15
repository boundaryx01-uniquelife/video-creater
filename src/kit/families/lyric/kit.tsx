import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { Photo } from '../../../lib/common';
import { accentOf, useKit } from '../../context';
import { fit, life, pan, prog, useLayout } from '../../motion';
import type { KPhoto, SceneInfo } from '../../schema.ts';

/** 감성 슬라이드쇼 공용 도구: 길고 부드러운 이징, 흐릿한 배경 + 선명한 액자 사진(2.5D), 가장자리 빛 번짐 */
export const SE = Easing.bezier(0.33, 0, 0.15, 1);
export const sp = (f: number, s: number, d = 26) => prog(f, s, d, SE);
export const SERIF = 300;
export const NUM: React.CSSProperties = { fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum","tnum"' };
export const WORD: React.CSSProperties = { wordBreak: 'keep-all' };
export const SHADOW = '0 40px 90px -24px rgba(0,0,0,0.6), 0 10px 28px -6px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.14)';

export function useLy(scene: SceneInfo) {
  const { palette: p, fonts } = useKit(), f = useCurrentFrame(), L = useLayout();
  return { p, fonts, f, ac: accentOf(p, Math.max(0, scene.section)), ...L };
}
export type Ly = ReturnType<typeof useLy>;

export const tw = (s: string) => Array.from(s).reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 1 : 0.58), 0);
export const fitBox = (lines: string[], w: number, h: number, max: number, lh = 1.3, min = 18, k = 1.04) => {
  for (let s = max; s > min; s -= 2) {
    const n = lines.reduce((a, l) => a + Math.max(1, Math.ceil((tw(l) * k * s) / w)), 0);
    if (n * s * lh <= h) return s;
  }
  return min;
};
export const fitNW = (ls: string[], w: number, h: number, max: number, lh = 1.2) => Math.max(18, Math.min(max, w / (Math.max(...ls.map(tw)) * 1.02), h / (ls.length * lh)));
export const lines = (s: string) => s.split('\n');
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 살며시 떠오르며 나타나는 글 */
export const Rise: React.FC<{ d: number; dur?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ d, dur = 28, dy = 18, style, children }) => {
  const f = useCurrentFrame(), t = sp(f, d, dur);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * dy}px)`, ...style }}>{children}</div>;
};

/** 그려지는 가는 선 */
export const Hair: React.FC<{ d: number; dur?: number; color: string; w?: number | string; v?: boolean; style?: React.CSSProperties; op?: number }> = ({ d, dur = 40, color, w = '100%', v, style, op = 1 }) => {
  const f = useCurrentFrame(), t = sp(f, d, dur);
  return <div style={{ background: color, opacity: op, ...(v ? { width: 1, height: w, transform: `scaleY(${t})`, transformOrigin: 'top' } : { height: 1, width: w, transform: `scaleX(${t})`, transformOrigin: 'left' }), ...style }} />;
};

/** 자간 넓은 작은 글(라벨) */
export const Tiny: React.FC<{ size: number; color: string; fonts: { body: string }; children: React.ReactNode; style?: React.CSSProperties; track?: number }> = ({ size, color, fonts, children, style, track = 0.3 }) => {
  const { portrait } = useLayout(), s = Math.max(size, portrait ? 30 : 26);
  return <div style={{ fontFamily: fonts.body, fontWeight: 400, fontSize: s, letterSpacing: `${Math.min(track, 0.22)}em`, color, lineHeight: 1.4, whiteSpace: 'nowrap', ...style }}>{children}</div>;
};

/** 칩 → 점으로 이어진 작은 한 줄 */
export const Chips: React.FC<{ items?: string[]; d: number; size: number; color: string; fonts: { body: string }; style?: React.CSSProperties }> = ({ items, d, size, color, fonts, style }) => {
  if (!items?.length) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: `${size * 0.4}px ${size * 0.9}px`, ...style }}>{items.map((c, i) => (
    <Rise key={i} d={d + i * 5} dy={8} style={{ display: 'flex', alignItems: 'center', gap: size * 0.9 }}>
      {i > 0 && <span style={{ width: 4, height: 4, borderRadius: 4, background: color, opacity: 0.6, display: 'block' }} />}
      <Tiny size={size} color={color} fonts={fonts} track={0.16}>{c}</Tiny>
    </Rise>))}</div>;
};

/** 구석 기관 이름 */
export const Brand: React.FC<{ scene: SceneInfo; color: string; style?: React.CSSProperties }> = ({ scene, color, style }) => {
  const { fonts } = useKit(), f = useCurrentFrame();
  if (!scene.brand) return null;
  return <Tiny size={26} color={color} fonts={fonts} track={0.2} style={{ position: 'absolute', opacity: 0.7 * sp(f, 16, 30), zIndex: 5, ...style }}>{scene.brand}</Tiny>;
};

/** 천천히 다가가는 사진(1.00→1.08 안팎). 가장자리가 드러나지 않게 이동폭을 제한 */
export const KB: React.FC<{ ph: KPhoto; dur: number; from?: number; amt?: number; base?: number; dir?: 1 | -1; blur?: number }> = ({ ph, dur, from = 0, amt = 0.08, base = 1.0, dir = 1, blur = 0 }) => {
  const f = useCurrentFrame(), L = life(f, dur, from), z = base + amt * L, fx = ph.fx ?? 0.5, fy = ph.fy ?? 0.45;
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}><Photo src={ph.src} fx={fx} fy={fy} scale={z} tx={pan(dir * (0.5 - L) * 3.2 + (0.5 - fx) * 2 * L, z)} ty={pan((0.45 - fy) * 3 * L, z)} style={blur > 0 ? { filter: `blur(${blur}px)` } : undefined} /></div>;
};

/** 흐릿하고 어둡게 물들인 같은 사진: 뒤 배경층(앞 액자보다 느리게 반대로 움직임) */
export const Dusk: React.FC<{ ph: KPhoto; dur: number; dim?: number; dir?: 1 | -1; opacity?: number }> = ({ ph, dur, dim = 0.4, dir = 1, opacity = 1 }) => {
  const f = useCurrentFrame(), { palette: p } = useKit(), t = life(f, dur);
  return <AbsoluteFill style={{ background: p.ink, overflow: 'hidden', opacity }}>
    <div style={{ position: 'absolute', inset: '-14%', transform: `translateX(${dir * (t * 44 - 22)}px) scale(${1.03 + 0.06 * t})`, filter: 'blur(44px) saturate(1.12)' }}>
      <Photo src={ph.src} fx={ph.fx ?? 0.5} fy={ph.fy ?? 0.45} />
    </div>
    <AbsoluteFill style={{ background: p.ink, opacity: dim }} />
    <AbsoluteFill style={{ background: p.ink, opacity: 0.55, WebkitMaskImage: 'radial-gradient(ellipse at 50% 48%, transparent 38%, #000 100%)', maskImage: 'radial-gradient(ellipse at 50% 48%, transparent 38%, #000 100%)' }} />
  </AbsoluteFill>;
};

/** 선명한 액자 사진: 부드러운 그림자, 천천히 떠오르며 배경과 다른 속도로 흐른다 */
export const Frame: React.FC<{ ph: KPhoto; dur: number; x: number; y: number; w: number; h: number; d?: number; dx?: number; dy?: number; dir?: 1 | -1; amt?: number; radius?: number | string; style?: React.CSSProperties; z?: number }> = ({ ph, dur, x, y, w, h, d = 0, dx = -14, dy = 0, dir = 1, amt = 0.07, radius = 3, style, z }) => {
  const f = useCurrentFrame(), t = sp(f, d, 34), L = life(f, dur);
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: Math.min(1, t * 1.4), transform: `translate(${dx * L}px, ${dy * L + (1 - t) * 18}px) scale(${1.04 - 0.04 * t})`, boxShadow: SHADOW, borderRadius: radius, overflow: 'hidden', zIndex: z, ...style }}>
    <KB ph={ph} dur={dur} from={d} amt={amt} dir={dir} />
  </div>;
};

/** 가장자리에 아주 은은하게 번지는 빛(화면 전체 효과 아님) */
export const Leak: React.FC<{ at: 'tl' | 'tr' | 'bl' | 'br' | 'l' | 'r'; color: string; op?: number; size?: number; screen?: boolean }> = ({ at, color, op = 0.3, size = 0.75, screen }) => {
  const f = useCurrentFrame(), { W, H } = useLayout(), s = Math.max(W, H) * size, sw = Math.sin(f / 80) * 0.06 + 1;
  const left = at.endsWith('l') ? -s * 0.5 : at.endsWith('r') ? W - s * 0.5 : at === 'l' ? -s * 0.5 : W - s * 0.5;
  const top = at.startsWith('t') ? -s * 0.5 : at.startsWith('b') ? H - s * 0.5 : H * 0.5 - s * 0.5;
  return <div style={{ position: 'absolute', left, top, width: s, height: s, borderRadius: '50%', background: `radial-gradient(closest-side, ${color}, transparent)`, opacity: op * sp(f, 0, 40), transform: `scale(${sw})`, mixBlendMode: screen ? 'screen' : 'normal', pointerEvents: 'none', zIndex: 2 }} />;
};

/** 아래(또는 위)쪽을 살짝 어둡게 해 글을 받쳐 주는 가림막 */
export const Scrim: React.FC<{ from?: 'b' | 't'; op?: number; size?: number }> = ({ from = 'b', op = 0.6, size = 55 }) => {
  const { palette: p } = useKit(), g = `linear-gradient(to ${from === 'b' ? 'top' : 'bottom'}, #000 0%, transparent ${size}%)`;
  return <AbsoluteFill style={{ background: p.ink, opacity: op, WebkitMaskImage: g, maskImage: g }} />;
};

export const sized = fit;
