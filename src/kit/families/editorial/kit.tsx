import React from 'react';
import { Easing, useCurrentFrame } from 'remotion';
import { accentOf, useKit } from '../../context';
import { LivePhoto, prog, useLayout } from '../../motion';
import { Photo } from '../../../lib/common';
import type { KPhoto, SceneInfo } from '../../schema.ts';

/** 에디토리얼 공용 도구: 강한 ease-out, 마스크 등장, 헤어라인, 사진 와이프 */
export const E = Easing.bezier(0.16, 1, 0.3, 1);
export const ep = (f: number, s: number, d = 22) => prog(f, s, d, E);
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const NUM: React.CSSProperties = { fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum","tnum"' };

export function useEd(scene: SceneInfo) {
  const { palette: p, fonts } = useKit(), f = useCurrentFrame(), L = useLayout();
  return { p, fonts, f, ac: accentOf(p, Math.max(0, scene.section)), ...L };
}

/** 글자 폭 추정(em): 한글 1, 그 외 0.58 */
export const tw = (s: string) => Array.from(s).reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 1 : 0.58), 0);
/** 상자(w×h) 안에 줄바꿈 포함해 들어가는 글자 크기 */
export const fitBox = (lines: string[], w: number, h: number, max: number, lh = 1.2, min = 18, k = 1.04) => {
  for (let s = max; s > min; s -= 2) {
    const n = lines.reduce((a, l) => a + Math.max(1, Math.ceil((tw(l) * k * s) / w)), 0);
    if (n * s * lh <= h) return s;
  }
  return min;
};

/** 줄바꿈 없이 한 줄씩 놓는 제목의 글자 크기 */
export const fitNW = (ls: string[], w: number, h: number, max: number, lh = 1.1) => Math.max(18, Math.min(max, w / (Math.max(...ls.map(tw)) * 1.02), h / (ls.length * lh)));

/** 마스크 안에서 올라오는 글자 */
export const Rise: React.FC<{ d: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ d, dur = 20, style, children }) => {
  const f = useCurrentFrame(), t = ep(f, d, dur);
  return <div style={{ overflow: 'hidden', paddingTop: '0.08em', paddingBottom: '0.14em', marginBottom: '-0.14em', marginTop: '-0.08em', ...style }}><div style={{ transform: `translateY(${(1 - t) * 110}%)` }}>{children}</div></div>;
};

/** 그려지는 헤어라인 */
export const Rule: React.FC<{ d: number; dur?: number; color: string; v?: boolean; th?: number; style?: React.CSSProperties }> = ({ d, dur = 30, color, v, th = 2, style }) => {
  const f = useCurrentFrame(), t = ep(f, d, dur);
  return <div style={{ background: color, ...(v ? { width: th, height: '100%', transform: `scaleY(${t})`, transformOrigin: 'top' } : { height: th, width: '100%', transform: `scaleX(${t})`, transformOrigin: 'left' }), ...style }} />;
};

/** 와이프로 열리며 천천히 다가가는 사진 상자 */
export const Pic: React.FC<{ ph: KPhoto; dur: number; x: number; y: number; w: number; h: number; d?: number; from?: 'l' | 'r' | 't' | 'b'; dir?: 1 | -1; strength?: number; style?: React.CSSProperties }> = ({ ph, dur, x, y, w, h, d = 0, from = 'b', dir = 1, strength = 1, style }) => {
  const f = useCurrentFrame(), t = ep(f, d, 26), r = (1 - t) * 100;
  const clip = from === 'b' ? `inset(${r}% 0 0 0)` : from === 't' ? `inset(0 0 ${r}% 0)` : from === 'l' ? `inset(0 ${r}% 0 0)` : `inset(0 0 0 ${r}%)`;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, clipPath: clip, ...style }}><div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + (1 - t) * 0.14})` }}><LivePhoto ph={ph} dur={dur} dir={dir} strength={strength} /></div></div>;
};

const small = (p: ReturnType<typeof useEd>, size: number): React.CSSProperties => ({ fontFamily: p.fonts.body, fontSize: size, fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.3 });

/** 구석 기관 이름 */
export const Brand: React.FC<{ scene: SceneInfo; color?: string; style?: React.CSSProperties }> = ({ scene, color, style }) => {
  const e = useEd(scene), t = ep(e.f, 14, 20);
  if (!scene.brand) return null;
  return <div style={{ position: 'absolute', ...small(e, e.portrait ? 24 : 22), color: color ?? e.p.muted, opacity: t, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', zIndex: 5, ...style }}><span style={{ width: 9, height: 9, background: e.ac, display: 'inline-block' }} />{scene.brand}</div>;
};

/** 구간 쪽 표시 "02 / 04" */
export const Folio: React.FC<{ scene: SceneInfo; color?: string; style?: React.CSSProperties }> = ({ scene, color, style }) => {
  const e = useEd(scene), t = ep(e.f, 16, 20);
  if (scene.section < 0) return null;
  return <div style={{ position: 'absolute', ...small(e, e.portrait ? 24 : 22), ...NUM, color: color ?? e.p.muted, opacity: t, whiteSpace: 'nowrap', zIndex: 5, ...style }}>{pad2(scene.section + 1)} / {pad2(Math.max(scene.sections, scene.section + 1))}</div>;
};

/** 사진이 없을 때 쓰는 강조색 면 */
export const Kicker: React.FC<{ d: number; color: string; size: number; fonts: { body: string }; children: React.ReactNode; rule?: string }> = ({ d, color, size, fonts, children, rule }) => {
  const f = useCurrentFrame(), t = ep(f, d, 22);
  return <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.6, opacity: t, fontFamily: fonts.body, fontSize: size, fontWeight: 700, color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}><span style={{ display: 'block', width: size * 2.2 * t, height: 3, background: rule ?? color }} />{children}</div>;
};

export const lines = (s: string) => s.split('\n');
/** 긴 장면에서도 멈춘 느낌이 없도록 천천히 흐르는 값(px) */
export const drift = (f: number, dur: number, px: number) => -px * (f / Math.max(1, dur));
export const sty = small;

/** 인쇄 재단선(크롭 마크): 사각형 네 모서리 바깥에 그려지는 짧은 선 */
export const Crop: React.FC<{ x: number; y: number; w: number; h: number; color: string; len?: number; gap?: number; d?: number; th?: number }> = ({ x, y, w, h, color, len = 30, gap = 12, d = 6, th = 2 }) => {
  const f = useCurrentFrame(), t = ep(f, d, 24);
  const L = (lx: number, ly: number, lw: number, lh: number, k: number) => <div key={k} style={{ position: 'absolute', left: lx, top: ly, width: lw, height: lh, background: color, opacity: t }} />;
  return <>{[
    L(x - gap - len, y, len, th, 0), L(x, y - gap - len, th, len, 1),
    L(x + w + gap, y, len, th, 2), L(x + w - th, y - gap - len, th, len, 3),
    L(x - gap - len, y + h - th, len, th, 4), L(x, y + h + gap, th, len, 5),
    L(x + w + gap, y + h - th, len, th, 6), L(x + w - th, y + h + gap, th, len, 7),
  ]}</>;
};

/** 같은 사진의 한 부분을 크게 잘라 보여 주는 디테일 컷(확대 기준점 ox, oy: 0–1) */
export const Detail: React.FC<{ ph: KPhoto; dur: number; x: number; y: number; w: number; h: number; d?: number; ox?: number; oy?: number; zoom?: number; border?: string; bw?: number }> = ({ ph, dur, x, y, w, h, d = 0, ox, oy, zoom = 2.3, border, bw = 10 }) => {
  const f = useCurrentFrame(), t = ep(f, d, 24), L = Math.min(1, f / Math.max(1, dur)), fx = ph.fx ?? 0.5, fy = ph.fy ?? 0.45;
  const px = (ox ?? (fx < 0.5 ? fx + 0.22 : fx - 0.22)) * 100, py = (oy ?? Math.min(0.75, fy + 0.05)) * 100;
  return <div style={{ position: 'absolute', left: x - (border ? bw : 0), top: y - (border ? bw : 0), width: w + (border ? 2 * bw : 0), height: h + (border ? 2 * bw : 0), background: border, padding: border ? bw : 0, boxSizing: 'border-box', clipPath: `inset(0 ${(1 - t) * 100}% 0 0)` }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom + 0.3 * L})`, transformOrigin: `${px}% ${py}%` }}><Photo src={ph.src} fx={fx} fy={fy} /></div>
    </div>
  </div>;
};
