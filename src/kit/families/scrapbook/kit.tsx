import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { accentOf, useKit } from '../../context';
import { LivePhoto, clamp, life, pop, useLayout, wob } from '../../motion';
import type { KPhoto, SceneInfo } from '../../schema.ts';
import { wrapTitle } from '../../../lib/layout';

/** 스크랩북 공용 도구: 종이 바탕, 알약 글자, 별 스티커, 폴라로이드, 구석 브랜드 */
export const useS = (scene?: SceneInfo) => {
  const { palette: P, fonts } = useKit(), f = useCurrentFrame(), L = useLayout();
  return { P, f, ...L, KID: fonts.display, BODY: fonts.body, acc: scene ? accentOf(P, scene.section) : P.accents[0], accOf: (i: number) => accentOf(P, i) };
};
export const tint = (c: string, base: string, pct = 15) => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
export const alpha = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
export const INK_SHADOW = '0 26px 50px rgba(42,36,64,.22), 0 3px 9px rgba(42,36,64,.14)';
export const lines = (s: string, portrait = false, maxChars = 11) => { const l = s.split('\n'); return portrait ? wrapTitle(l, maxChars) : l; };
/** 줄 목록이 폭 안에 들어가는 글자 크기 */
export const fitLines = (ls: string[], max: number, budget: number, em = 0.95) => Math.min(max, ...ls.map((t) => budget / Math.max([...t].length * em, 1)));

/** 점무늬가 흐르는 종이 바탕 */
export const Paper: React.FC<{ color?: string; dot?: string; children?: React.ReactNode }> = ({ color, dot, children }) => {
  const { P, f } = useS();
  return <AbsoluteFill style={{ backgroundColor: color ?? P.bg, backgroundImage: `radial-gradient(${dot ?? alpha(P.ink, 10)} 2.4px, transparent 2.8px)`, backgroundSize: '40px 40px', backgroundPosition: `${f * 0.7}px ${f * 0.35}px`, overflow: 'hidden' }}>{children}</AbsoluteFill>;
};

export const Pill: React.FC<{ text: string; bg: string; color: string; size?: number; style?: React.CSSProperties }> = ({ text, bg, color, size = 34, style }) => {
  const { KID } = useS();
  return <div style={{ display: 'inline-flex', alignItems: 'center', padding: `${size * 0.28}px ${size * 0.62}px`, borderRadius: 999, background: bg, color, fontFamily: KID, fontSize: size, lineHeight: 1.1, whiteSpace: 'nowrap', ...style }}>{text}</div>;
};

export const Star: React.FC<{ size: number; color: string; rot?: number; style?: React.CSSProperties }> = ({ size, color, rot = 0, style }) => {
  const { P } = useS();
  return <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', transform: `rotate(${rot}deg)`, ...style }}><path d="M50 4 L61 37 L96 38 L68 59 L78 93 L50 73 L22 93 L32 59 L4 38 L39 37 Z" fill={color} stroke={P.ink} strokeWidth={4} strokeLinejoin="round" /></svg>;
};

/** 튀어나오는 별 스티커(제자리에서 천천히 돈다) */
export const Sticker: React.FC<{ size: number; color: string; x: number; y: number; delay?: number; spin?: number; seed?: number }> = ({ size, color, x, y, delay = 20, spin = 0.8, seed = 0 }) => {
  const { f } = useS(), s = pop(f, delay, 9);
  return <Star size={size} color={color} style={{ left: x - size / 2, top: y - size / 2, transform: `translateY(${wob(f, seed, 6)}px) rotate(${f * spin + seed * 30}deg) scale(${s})` }} />;
};

/** 화면 구석 브랜드 표시 */
export const Brand: React.FC<{ scene: SceneInfo; onPhoto?: boolean; pos?: 'br' | 'bl' | 'tr' }> = ({ scene, onPhoto, pos = 'br' }) => {
  const { P, KID, PAD, portrait } = useS();
  if (!scene.brand) return null;
  const st: React.CSSProperties = pos === 'bl' ? { left: PAD, bottom: PAD * 0.5 } : pos === 'tr' ? { right: PAD, top: PAD * 0.5 } : { right: PAD, bottom: PAD * 0.5 };
  return <div style={{ position: 'absolute', ...st, fontFamily: KID, fontSize: portrait ? 30 : 28, color: onPhoto ? '#fff' : P.ink, opacity: onPhoto ? 0.85 : 0.5, textShadow: onPhoto ? '0 2px 8px rgba(0,0,0,.45)' : undefined, zIndex: 5, whiteSpace: 'nowrap' }}>{scene.brand}</div>;
};

/** 폴라로이드 치수: 안쪽 사진(iw×ih)에 테두리와 자막 칸을 더한 바깥 크기 */
export const pdims = (iw: number, ih: number, cap: boolean) => { const p = Math.max(10, iw * 0.04), bottom = cap ? Math.max(p * 2.2, ih * 0.2) : p; return { p, bottom, ow: iw + p * 2, oh: ih + p + bottom }; };
/** 바깥 크기가 maxW×maxH 안에 들도록 사진 비율에 맞춘 폴라로이드 크기 */
export const pfit = (aspect: number, maxW: number, maxH: number, cap = false) => {
  const a = clamp(aspect || 1.5, 0.6, 2.2); let iw = Math.min(maxW / 1.08, (maxH / 1.1) * a);
  for (let i = 0; i < 3; i++) { const ih = iw / a, d = pdims(iw, ih, cap), k = Math.min(1, maxW / d.ow, maxH / d.oh); iw *= k; }
  iw = Math.round(iw); const ih = Math.round(iw / a); return { iw, ih, ...pdims(iw, ih, cap) };
};

export const Polaroid: React.FC<{ ph: KPhoto; iw: number; ih: number; rot: number; dur: number; delay?: number; cap?: string; tape?: string; style?: React.CSSProperties; drift?: number; seed?: number; enter?: boolean }> = ({ ph, iw, ih, rot, dur, delay = 0, cap, tape, style, drift = 1, seed = 0, enter = true }) => {
  const { P, f, KID } = useS(), d = pdims(iw, ih, !!cap), s = enter ? pop(f, delay) : 1, fl = s > 0.98 ? 1 : s;
  const bob = wob(f, seed, 7 * drift) * fl, tilt = wob(f + 13, seed, 0.9 * drift) * fl;
  return (
    <div style={{ position: 'absolute', width: d.ow, height: d.oh, boxSizing: 'border-box', padding: `${d.p}px ${d.p}px ${d.bottom}px`, background: P.surface, borderRadius: 8, boxShadow: INK_SHADOW, opacity: clamp(s * 1.8, 0, 1), transform: `translateY(${(1 - s) * 260 + bob}px) rotate(${rot + tilt + (1 - s) * -9}deg) scale(${0.86 + 0.14 * s})`, ...style }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 3, background: alpha(P.ink, 15) }}><LivePhoto ph={ph} dur={dur} from={delay} strength={drift} dir={seed % 2 ? 1 : -1} /></div>
      {cap && <div style={{ position: 'absolute', left: d.p, right: d.p, bottom: 0, height: d.bottom, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: Math.min(d.bottom * 0.46, 54), color: P.ink, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cap}</div>}
      <div style={{ position: 'absolute', top: -iw * 0.035, left: '50%', width: iw * 0.26, height: iw * 0.075, marginLeft: -iw * 0.13, background: tape ?? alpha(P.accents[0], 80), transform: 'rotate(-4deg)', borderRadius: 3 }} />
    </div>
  );
};

/** 장면 끝에서 살짝 밀려 나가는 값(0→1, 끝 12프레임) */
export const exitT = (f: number, dur: number) => { const t = clamp((f - (dur - 12)) / 12, 0, 1); return t * t * t; };
export { life };
