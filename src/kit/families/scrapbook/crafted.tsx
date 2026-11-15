import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Photo } from '../../../lib/common';
import { LivePhoto, clamp, easeInOut, life, pan, pop, prog, wob } from '../../motion';
import type { PartProps, SceneInfo } from '../../schema.ts';
import { Brand, Paper, Pill, Polaroid, Star, Sticker, alpha, exitT, pfit, tint, useS } from './kit';
import { fitBox } from './text';

/* ===== 공작 도구: 찢은 종이, 테이프, 낙서, 마커 ===== */
const hash = (n: number) => { const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
/** 가장자리가 찢긴 종이 모양(clip-path). 변마다 켜고 끈다 */
const torn = (seed: number, e: { t?: boolean; b?: boolean; l?: boolean; r?: boolean }, n = 24, amp = 2.4) => {
  const p: string[] = [], j = (i: number) => (hash(seed * 31 + i) * amp).toFixed(2);
  for (let i = 0; i <= n; i++) p.push(`${((i / n) * 100).toFixed(2)}% ${e.t ? j(i) : 0}%`);
  for (let i = 1; i < n / 2; i++) p.push(`${e.r ? 100 - Number(j(100 + i)) : 100}% ${((i / (n / 2)) * 100).toFixed(2)}%`);
  for (let i = n; i >= 0; i--) p.push(`${((i / n) * 100).toFixed(2)}% ${e.b ? 100 - Number(j(200 + i)) : 100}%`);
  for (let i = n / 2 - 1; i >= 1; i--) p.push(`${e.l ? Number(j(300 + i)) : 0}% ${((i / (n / 2)) * 100).toFixed(2)}%`);
  return `polygon(${p.join(',')})`;
};
const SHADOW = 'drop-shadow(0 14px 16px rgba(42,36,64,.22)) drop-shadow(0 2px 3px rgba(42,36,64,.16))';
const Sheet: React.FC<{ seed: number; e: Parameters<typeof torn>[1]; bg: string; style?: React.CSSProperties; inner?: React.CSSProperties; children?: React.ReactNode }> = ({ seed, e, bg, style, inner, children }) => (
  <div style={{ position: 'absolute', filter: SHADOW, ...style }}><div style={{ position: 'relative', width: '100%', height: '100%', background: bg, clipPath: torn(seed, e), ...inner }}>{children}</div></div>
);
const Tape: React.FC<{ w: number; rot: number; color: string; style?: React.CSSProperties }> = ({ w, rot, color, style }) => (
  <div style={{ position: 'absolute', width: w, height: w * 0.3, background: alpha(color, 80), transform: `rotate(${rot}deg)`, clipPath: 'polygon(0 0,100% 0,97% 25%,100% 50%,97% 75%,100% 100%,0 100%,3% 75%,0 50%,3% 25%)', zIndex: 6, ...style }} />
);
const ruled = (c: string, lh: number) => `repeating-linear-gradient(transparent 0, transparent ${lh - 3}px, ${c} ${lh - 3}px, ${c} ${lh}px)`;
const mark = (c: string, t: number) => ({ backgroundImage: `linear-gradient(transparent 56%, ${alpha(c, 88)} 56%, ${alpha(c, 88)} 92%, transparent 92%)`, backgroundRepeat: 'no-repeat', backgroundSize: `${t * 100}% 100%` } as React.CSSProperties);

type DK = 'heart' | 'arrow' | 'squig' | 'ring' | 'spark';
const Doodle: React.FC<{ k: DK; x: number; y: number; size: number; color: string; rot?: number; delay?: number; seed?: number }> = ({ k, x, y, size, color, rot = 0, delay = 20, seed = 0 }) => {
  const { P, f } = useS(), s = pop(f, delay, 10), d = prog(f, delay, 22);
  const sw = Math.max(5, size * 0.055), common = { fill: 'none', stroke: P.ink, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - d } as const;
  const body = k === 'heart' ? <path d="M50 88 C10 55 4 28 26 16 C40 8 50 18 50 28 C50 18 60 8 74 16 C96 28 90 55 50 88Z" {...common} fill={alpha(color, 90)} strokeDasharray="none" strokeDashoffset={0} />
    : k === 'arrow' ? <><path d="M8 78 Q 20 14 86 26" {...common} /><path d="M66 10 L88 27 L64 44" {...common} /></>
    : k === 'squig' ? <path d="M4 50 Q 16 22 28 50 T 52 50 T 76 50 T 98 50" {...common} stroke={color} strokeWidth={sw * 1.3} />
    : k === 'ring' ? <ellipse cx="50" cy="50" rx="42" ry="38" {...common} stroke={color} strokeWidth={sw * 1.2} />
    : <><path d="M50 6 L50 94 M6 50 L94 50 M20 20 L80 80 M80 20 L20 80" {...common} stroke={color} /></>;
  return <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, overflow: 'visible', transform: `translateY(${wob(f, seed, 4)}px) rotate(${rot + wob(f, seed + 2, 3)}deg) scale(${s})`, zIndex: 7 }}>{body}</svg>;
};

/** 공작 장면 공용 틀: 구간색 종이 + 천천히 다가가는 카메라 + 끝에서 밀려 나감 */
const Stage: React.FC<{ scene: SceneInfo; dur: number; color?: string; children: React.ReactNode }> = ({ scene, dur, color, children }) => {
  const { P, f, acc } = useS(scene), L = life(f, dur), out = exitT(f, dur);
  return (
    <Paper color={color ?? tint(acc, P.bg, 20)}>
      <AbsoluteFill style={{ transform: `scale(${1 + 0.03 * L}) translateX(${-70 * out}px)`, opacity: 1 - 0.15 * out }}>{children}</AbsoluteFill>
      <Brand scene={scene} pos="bl" />
    </Paper>
  );
};
/** 찢어 붙인 색종이 띠(배경 층) */
const Band: React.FC<{ seed: number; color: string; x: number; y: number; w: number; h: number; rot: number; delay: number }> = ({ seed, color, x, y, w, h, rot, delay }) => {
  const { f } = useS(), s = prog(f, delay, 20, easeInOut);
  return <Sheet seed={seed} e={{ t: true, b: true, l: true, r: true }} bg={color} style={{ left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg) translateX(${(1 - s) * -w * 0.25}px)`, opacity: s, filter: 'none' }} />;
};

/* ---------- photo.pair: 크게 겹쳐 붙인 두 장 ---------- */
export const PhotoPair: React.FC<PartProps<'photo.pair'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, W, H, PAD, portrait, acc, accOf } = useS(scene), [x, y] = photos, ca = !!x.caption, cb = !!y.caption, c1 = accOf(scene.section + 1), c2 = accOf(scene.section + 2);
  const mk = (k: number) => portrait ? [pfit(x.aspect, W * 0.9 * k, H * 0.45 * k, ca), pfit(y.aspect, W * 0.78 * k, H * 0.38 * k, cb)] : [pfit(x.aspect, 1180 * k, 900 * k, ca), pfit(y.aspect, 960 * k, 760 * k, cb)];
  let [A, B] = mk(1); const ovL = A.ow * 0.16;
  if (!portrait) { const k = Math.min(1, (W * 0.95) / (A.ow + B.ow - ovL)); if (k < 1) [A, B] = mk(k); }
  let aS: React.CSSProperties, bS: React.CSSProperties, region: [number, number];
  if (portrait) {
    const ov = A.oh * 0.1, top = Math.max(data.label ? 110 : PAD * 0.6, (H - (A.oh + B.oh - ov)) / 2);
    aS = { left: PAD * 0.6, top }; bS = { left: W - PAD * 0.6 - B.ow, top: top + A.oh - ov }; region = [0, W];
  } else {
    const ov = A.ow * 0.16, total = A.ow + B.ow - ov, x0 = Math.max(PAD * 0.3, W / 2 - total / 2 + (data.label ? W * 0.04 : 0)), ta = clamp((H - A.oh) / 2 + (data.label ? 30 : -24), data.label ? 120 : 30, H);
    aS = { left: x0, top: ta }; bS = { left: x0 + A.ow - ov, top: Math.min(H - B.oh - 40, ta + A.oh * 0.3) }; region = [x0, x0 + total];
  }
  const aL = aS.left as number, aT = aS.top as number, bL = bS.left as number, bT = bS.top as number, lab = data.label, lfs = lab ? Math.min(portrait ? 92 : 104, 360 / (Math.max([...lab].length, 2) * 0.95)) : 0;
  const lw = lab ? [...lab].length * lfs * 0.95 + 80 : 0, ls = pop(f, 26, 10);
  return (
    <Stage scene={scene} dur={dur}>
      <Band seed={1} color={alpha(c1, 55)} x={-W * 0.05} y={portrait ? H * 0.12 : H * 0.14} w={W * 1.1} h={portrait ? H * 0.34 : H * 0.62} rot={portrait ? -4 : -5} delay={0} />
      <Band seed={2} color={alpha(c2, 45)} x={-W * 0.05} y={portrait ? H * 0.52 : H * 0.3} w={W * 1.1} h={portrait ? H * 0.34 : H * 0.5} rot={portrait ? 3 : 4} delay={6} />
      <Polaroid ph={x} {...A} rot={-3.6} dur={dur} delay={4} seed={1} cap={x.caption} tape={alpha(c1, 88)} style={aS} />
      <Polaroid ph={y} {...B} rot={4} dur={dur} delay={14} seed={2} cap={y.caption} tape={alpha(c2, 90)} style={bS} />
      <Tape w={B.ow * 0.3} rot={-34} color={acc} style={{ left: bL - 26, top: bT + B.oh * 0.08, opacity: pop(f, 24) }} />
      {lab && <div style={{ position: 'absolute', left: aL - 26, top: aT - lfs * 0.7, width: lw, height: lfs * 1.5, transform: `rotate(-7deg) scale(${ls})`, transformOrigin: 'left bottom', zIndex: 8 }}>
        <Sheet seed={5} e={{ l: true, r: true, b: true }} bg={P.surface} style={{ inset: 0 }}><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: lfs, color: P.ink, whiteSpace: 'nowrap', ...mark(accOf(scene.section + 3), prog(f, 34, 14)), backgroundPosition: '0 8px' }}>{lab}</div></Sheet>
      </div>}
      {!portrait && region[0] > 220 && <>
        <Doodle k="heart" x={region[0] * 0.45} y={H * 0.78} size={110} color={c2} rot={-12} delay={30} />
        <Doodle k="squig" x={region[0] * 0.5} y={H * 0.3} size={150} color={c1} rot={-8} delay={34} seed={2} />
      </>}
      {!portrait && W - region[1] > 220 && <>
        <Doodle k="spark" x={(region[1] + W) / 2} y={H * 0.2} size={90} color={c1} delay={36} seed={3} />
        <Doodle k="ring" x={(region[1] + W) / 2 + 20} y={H * 0.5} size={150} color={c2} delay={40} seed={4} />
        <Sticker size={96} color={acc} x={(region[1] + W) / 2} y={H * 0.82} delay={32} />
      </>}
      {portrait && <>
        <Sticker size={110} color={acc} x={W - PAD * 1.2} y={bT - 40 > aT + 40 ? aT + 30 : H * 0.06} delay={30} />
        <Doodle k="heart" x={PAD * 1.1} y={H - PAD * 1.1} size={100} color={c2} rot={-10} delay={34} />
        <Doodle k="spark" x={W * 0.22} y={bT + B.oh * 0.3 > H ? H * 0.8 : aT + A.oh + (bT - aT - A.oh) * 0.5 + B.oh * 0.5} size={90} color={c1} delay={40} seed={5} />
        <Sticker size={90} color={c2} x={W * 0.2} y={H * 0.9} delay={42} spin={-0.7} seed={3} />
        <Doodle k="arrow" x={W - PAD * 1.4} y={aT + A.oh * 0.5} size={120} color={c1} rot={95} delay={38} seed={2} />
      </>}
    </Stage>
  );
};

/* ---------- photo.side: 찢은 종이 이름표가 붙은 한 장 ---------- */
export const PhotoSide: React.FC<PartProps<'photo.side'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), x = photos[0], L = life(f, dur), c1 = accOf(scene.section + 1), c2 = accOf(scene.section + 2);
  const hasText = !!(data.caption || data.sub), cap = data.caption ?? '';
  const b = portrait ? pfit(x.aspect, W * 0.88, H * 0.5) : pfit(x.aspect, x.aspect >= 1 ? (hasText ? 880 : 1100) : 640, 820);
  const pL = portrait ? (W - b.ow) / 2 : PAD * 1.1, pT = portrait ? Math.max(PAD * 0.6, (H - (b.oh + 640)) / 2) : (H - b.oh) / 2 - 10;
  const tx0 = pL + b.ow + 80, lw = portrait ? W - PAD * 1.6 : W - tx0 - PAD * 0.9, lp = portrait ? 52 : 64;
  const fs = fitBox(cap, portrait ? 112 : 128, lw - lp * 2, portrait ? 360 : 420, 0.95, 1.2), nl = cap ? Math.max(1, Math.ceil(([...cap].length * fs * 0.95) / (lw - lp * 2))) : 0, lh = nl * fs * 1.2 + lp * 1.1;
  const lL = portrait ? (W - lw) / 2 : tx0, lT = portrait ? pT + b.oh - 40 : Math.max(60, H * 0.5 - lh / 2 - (data.sub ? 70 : 0) - 10), ls = pop(f, 14, 11), hl = prog(f, 28, 20);
  const md = Math.min(b.iw, b.ih) * 0.46, mz = 2.3 + 0.2 * L;
  return (
    <Stage scene={scene} dur={dur}>
      <Band seed={3} color={alpha(c1, 60)} x={portrait ? -W * 0.05 : pL - 70} y={portrait ? pT - 40 : -H * 0.05} w={portrait ? W * 1.1 : b.ow + 150} h={portrait ? b.oh + 120 : H * 1.1} rot={portrait ? -3 : 4} delay={0} />
      <Band seed={4} color={alpha(c2, 50)} x={portrait ? W * 0.1 : tx0 - 40} y={portrait ? pT + b.oh * 0.8 : H * 0.12} w={portrait ? W * 0.9 : W - tx0 + 80} h={portrait ? 560 : H * 0.76} rot={portrait ? 3 : -2.5} delay={6} />
      <Polaroid ph={x} iw={b.iw} ih={b.ih} rot={-2.6} dur={dur} delay={4} seed={scene.index} tape={alpha(acc, 88)} style={{ left: pL, top: pT }} />
      {/* 확대경: 같은 사진의 한 부분을 크게 */}
      <div style={{ position: 'absolute', left: pL + b.ow - md * 0.55, top: pT + b.oh - md * (portrait ? 1.05 : 0.7), width: md, height: md, borderRadius: '50%', overflow: 'hidden', border: `${md * 0.07}px solid ${P.surface}`, boxSizing: 'border-box', boxShadow: `0 0 0 5px ${P.ink}, 0 18px 30px rgba(42,36,64,.3)`, transform: `scale(${pop(f, 30, 10)}) translateY(${wob(f, 4, 6)}px)`, zIndex: 8, background: P.surface }}>
        <Photo src={x.src} fx={x.fx ?? 0.5} fy={x.fy ?? 0.45} scale={mz} tx={pan((0.5 - (x.fx ?? 0.5)) * 14 * mz * 0.3, mz)} ty={pan((0.45 - (x.fy ?? 0.45)) * 14 * mz * 0.3, mz)} />
      </div>
      {hasText && <>
        {cap && <div style={{ position: 'absolute', left: lL, top: lT, width: lw, height: lh, transform: `rotate(${-2 + (1 - ls) * -5 + wob(f, 3, 0.6)}deg) scale(${ls})`, transformOrigin: 'left center', zIndex: 5 }}>
          <Sheet seed={7} e={{ t: true, b: true, l: true }} bg={P.surface} style={{ inset: 0 }} inner={{ backgroundImage: ruled(alpha(c1, 30), fs * 1.2) }}>
            <div style={{ position: 'absolute', inset: 0, padding: `${lp * 0.55}px ${lp}px`, display: 'flex', alignItems: 'center' }}>
              <div style={{ fontFamily: KID, fontSize: fs, lineHeight: 1.2, color: P.ink, wordBreak: 'keep-all', textWrap: 'balance', ...mark(acc, hl), padding: '0 6px' }}>{cap}</div>
            </div>
          </Sheet>
          <Tape w={170} rot={-6} color={c2} style={{ left: 30, top: -26 }} />
        </div>}
        {data.sub && <div style={{ position: 'absolute', left: portrait ? lL + lw * 0.28 : lL + lw * 0.1, top: lT + lh + (portrait ? 26 : 22), width: portrait ? lw * 0.72 : lw * 0.74, transform: `rotate(${2.6 + wob(f, 5, 0.8)}deg) scale(${pop(f, 24, 11)})`, background: alpha(c2, 85), padding: '22px 34px 26px', fontFamily: BODY, fontWeight: 800, fontSize: portrait ? 42 : 38, lineHeight: 1.35, color: P.onAccent, boxShadow: '8px 12px 18px rgba(42,36,64,.2)', wordBreak: 'keep-all', zIndex: 6 }}>{data.sub}
          <Tape w={110} rot={-3} color={P.surface} style={{ left: '50%', top: -18, marginLeft: -55 }} />
        </div>}
        {data.chip && <div style={{ position: 'absolute', left: portrait ? PAD : lL + lw - 250, top: portrait ? lT + lh + 30 : lT - 100, width: 220, height: 220, transform: `rotate(${-14 + (1 - pop(f, 36, 8)) * 30}deg) scale(${1 + (1 - pop(f, 36, 8)) * 1.6})`, opacity: clamp(pop(f, 36, 8) * 2, 0, 1), zIndex: 9 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `8px double ${c1}`, background: alpha(P.surface, 70), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: Math.min(54, 150 / (Math.max(2, [...data.chip].length) * 0.62)), color: c1, textAlign: 'center', filter: 'saturate(1.3) brightness(.8)' }}>{data.chip}</div>
        </div>}
      </>}
      <Sticker size={portrait ? 92 : 84} color={acc} x={portrait ? PAD * 1.1 : tx0 - 50} y={portrait ? pT + 30 : pT + 10} delay={22} />
      <Doodle k="squig" x={portrait ? W * 0.5 : tx0 + lw * 0.45} y={portrait ? H - PAD * 1.2 : H - PAD * 1.1} size={190} color={c1} delay={40} seed={3} rot={-3} />
    </Stage>
  );
};

/* ---------- text.quote: 줄 공책 쪽지 + 스티커 사진 ---------- */
export const TextQuote: React.FC<PartProps<'text.quote'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), ph = photos[0], c1 = accOf(scene.section + 1), c2 = accOf(scene.section + 2), L = life(f, dur);
  const d = ph ? (portrait ? W * 0.6 : H * 0.62) : 0, nw = ph ? (portrait ? W - PAD * 1.4 : W - PAD * 2.2 - d + 70) : portrait ? W - PAD * 1.4 : Math.min(1380, W - PAD * 3);
  const px = portrait ? 64 : 96, py = portrait ? 70 : 84, nh0 = ph && portrait ? H * 0.34 : portrait ? H * 0.46 : H * 0.62;
  const fs = fitBox(data.text, portrait ? 96 : 110, nw - px * 2 - 30, nh0 - py * 2, 0.95, 1.4), lines = data.text.split('\n'), nl = lines.reduce((a, t) => a + Math.max(1, Math.ceil(([...t].length * fs * 0.95) / (nw - px * 2 - 30))), 0), nh = nl * fs * 1.4 + py * 2;
  const stack = d + nh - 30, bT = portrait ? Math.max(PAD * 0.6, (H - stack) / 2 - 20) : (H - d) / 2 - 10;
  const nL = ph ? (portrait ? (W - nw) / 2 : PAD * 1.1 + d - 70) : (W - nw) / 2, nT = ph ? (portrait ? bT + d - 10 : (H - nh) / 2 + 20) : (H - nh) / 2 - (portrait ? 30 : 10);
  const s = pop(f, 10, 12), who = [data.who, data.role].filter(Boolean).join(' · ');
  const all = lines.flatMap((t, li) => t.split(' ').filter(Boolean).map((w) => ({ w, li })));
  const step = Math.min(4, 38 / Math.max(all.length, 1));
  let wi = 0;
  return (
    <Stage scene={scene} dur={dur} color={tint(acc, P.bg, 12)}>
      <Band seed={8} color={alpha(c1, 50)} x={-W * 0.05} y={portrait ? H * 0.3 : H * 0.1} w={W * 1.1} h={portrait ? H * 0.5 : H * 0.8} rot={portrait ? 5 : -3} delay={0} />
      {/* 뒤에 겹친 쪽지 */}
      <div style={{ position: 'absolute', left: nL + 22, top: nT + 26, width: nw, height: nh, background: alpha(c2, 85), transform: `rotate(${3.2 * s}deg) scale(${s})`, boxShadow: '0 14px 26px rgba(42,36,64,.2)' }} />
      <div style={{ position: 'absolute', left: nL, top: nT, width: nw, height: nh, transform: `scale(${s}) rotate(${(1 - s) * -5 - 1.2 + wob(f, 4, 0.6)}deg) translateX(${-8 * L}px)`, zIndex: 3 }}>
        <Sheet seed={11} e={{ t: true }} bg={P.surface} style={{ inset: 0 }} inner={{ backgroundImage: ruled(alpha(c1, 42), fs * 1.4), backgroundPosition: `0 ${py - 4}px` }}>
          <div style={{ position: 'absolute', left: px * 0.68, top: 0, bottom: 0, width: 5, background: alpha(accOf(scene.section + 3), 55) }} />
          <div style={{ position: 'absolute', inset: 0, padding: `${py}px ${px}px ${py}px ${px + 16}px`, fontFamily: KID, fontSize: fs, lineHeight: 1.4, color: P.ink, wordBreak: 'keep-all' }}>
            {lines.map((t, li) => <div key={li}>{t.split(' ').filter(Boolean).map((w, k) => {
              const i = wi++, p = pop(f, 12 + i * step, 12), last = li === lines.length - 1 && lines.length > 1 || (lines.length === 1 && i >= all.length - 2);
              return <span key={k} style={{ display: 'inline-block', marginRight: '0.28em', transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`, opacity: clamp(p * 2, 0, 1), ...(last ? mark(acc, prog(f, 12 + all.length * step + 4, 18)) : {}) }}>{w}</span>;
            })}</div>)}
          </div>
        </Sheet>
        <Tape w={220} rot={-4} color={c1} style={{ left: nw * 0.12, top: -30 }} />
        <Tape w={170} rot={5} color={acc} style={{ right: nw * 0.1, top: -22 }} />
      </div>
      <svg width={150} height={100} viewBox="0 0 100 66" style={{ position: 'absolute', left: nL + nw - 190, top: nT - 80, overflow: 'visible', transform: `scale(${pop(f, 18, 8)}) rotate(-6deg)`, zIndex: 6 }}>{[0, 52].map((o) => <path key={o} transform={`translate(${o} 0)`} d="M40 4 C18 4 4 20 4 40 L4 62 L34 62 L34 38 L22 38 C22 28 28 22 40 20 Z" fill={acc} stroke={P.ink} strokeWidth={5} strokeLinejoin="round" />)}</svg>
      {who && <div style={{ position: 'absolute', right: ph && !portrait ? PAD * 0.9 : (W - nw) / 2 + 20, top: nT + nh - 24, transform: `rotate(${-3 + wob(f, 6, 1)}deg) scale(${pop(f, 26, 10)})`, background: acc, color: P.onAccent, fontFamily: KID, fontSize: portrait ? 44 : 42, padding: '18px 40px 22px', boxShadow: '8px 12px 18px rgba(42,36,64,.22)', whiteSpace: 'nowrap', zIndex: 7 }}>{who}<Tape w={110} rot={4} color={P.surface} style={{ left: '50%', top: -16, marginLeft: -55 }} /></div>}
      {ph && <div style={{ position: 'absolute', left: portrait ? (W - d) / 2 - W * 0.1 : PAD * 1.1, top: bT, width: d, height: d, transform: `scale(${pop(f, 4, 9)}) rotate(${-5 + wob(f, 2, 1.2)}deg) translateY(${wob(f, 3, 6)}px)`, zIndex: 4 }}>
        <div style={{ position: 'absolute', inset: -16, borderRadius: '41% 59% 52% 48% / 52% 44% 56% 48%', background: P.surface, boxShadow: '0 22px 36px rgba(42,36,64,.28), 0 0 0 5px ' + alpha(P.ink, 90) }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '41% 59% 52% 48% / 52% 44% 56% 48%', overflow: 'hidden' }}><LivePhoto ph={ph} dur={dur} strength={1.1} /></div>
        <Tape w={d * 0.3} rot={-38} color={c2} style={{ left: -d * 0.06, top: d * 0.06 }} />
      </div>}
      <Sticker size={portrait ? 100 : 100} color={c1} x={ph ? (portrait ? W - PAD * 1.2 : W - PAD * 1.1) : W - PAD * 1.1} y={portrait ? H * (ph ? 0.1 : 0.15) : H * 0.14} delay={26} />
      <Doodle k="heart" x={ph && !portrait ? W * 0.9 : PAD * 1.3} y={portrait ? H - PAD * 1.4 : H * 0.88} size={96} color={c2} rot={-10} delay={34} seed={2} />
      <div style={{ display: 'none' }}>{BODY}</div>
    </Stage>
  );
};

/* ---------- outro.thanks: 물러나는 사진 벽 + 편지 + 소인 ---------- */
export const OutroThanks: React.FC<PartProps<'outro.thanks'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), c1 = accOf(scene.section + 1), c2 = accOf(scene.section + 2), c3 = accOf(scene.section + 3), chips = data.chips ?? [];
  const cols = portrait ? 4 : 7, tw = (W * 1.14) / cols, th = tw * (portrait ? 1.05 : 0.9), rows = Math.ceil((H * 1.14) / th), n = photos.length;
  const pull = easeInOut(clamp(f / 74, 0, 1)), S = 2.0 - 1.0 * pull - 0.03 * life(f, dur, 74), wx = (W - cols * tw) / 2, wy = (H - rows * th) / 2;
  const cw = portrait ? W - PAD * 1.6 : Math.min(W * 0.46, 900), ls = data.title.split('\n'), inner = cw - 140;
  const tfs = Math.min(portrait ? 150 : 140, ...ls.map((t) => inner / Math.max([...t].length * 0.98, 1))), msg = data.message ?? '', mfs = portrait ? 46 : 42;
  const th2 = ls.length * tfs * 1.18, mh = msg ? msg.split('\n').length * mfs * 1.5 + 30 : 0, chH = chips.length > 1 ? 90 : 0, ch = 70 + th2 + mh + chH + 80;
  const cs = pop(f, 30, 11), stamp = chips[0], sd = portrait ? 250 : 240, sT = 70, st = pop(f, sT, 7, 260), restChips = chips.slice(1, 4);
  const sfs = stamp ? Math.min(46, (sd * 0.66) / (Math.max([...stamp].length, 3) * 0.6)) : 0;
  return (
    <Paper color={tint(c1, P.bg, 25)}>
      <AbsoluteFill style={{ transform: `scale(${S})`, transformOrigin: '50% 50%' }}>
        {Array.from({ length: cols * rows }, (_, k) => {
          const r = Math.floor(k / cols), c = k % cols, rot = (hash(k + 3) - 0.5) * 8, g = hash(k + 9), pt = n ? photos[(k * 7 + r) % n] : null, sp = pop(f, (r + c) * 1.2, 14);
          return <div key={k} style={{ position: 'absolute', left: wx + c * tw + tw * 0.04, top: wy + r * th + th * 0.04, width: tw * 0.92, height: th * 0.92, background: P.surface, padding: tw * 0.035, paddingBottom: tw * 0.1, boxSizing: 'border-box', borderRadius: 6, boxShadow: '0 8px 16px rgba(42,36,64,.22)', transform: `rotate(${rot}deg) scale(${0.7 + 0.3 * sp})`, opacity: clamp(sp * 2, 0, 1) }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: [c1, c2, c3, acc][k % 4] }}>
              {pt ? <Photo src={pt.src} fx={clamp((pt.fx ?? 0.5) + (g - 0.5) * 0.5, 0.1, 0.9)} fy={clamp((pt.fy ?? 0.45) + (hash(k + 5) - 0.5) * 0.3, 0.1, 0.9)} scale={1.12 + g * 0.5} tx={pan((g - 0.5) * 8, 1.12 + g * 0.5)} ty={0} /> : <Star size={tw * 0.5} color={P.surface} rot={k * 17 + f * 0.4} style={{ left: '50%', top: '50%', marginLeft: -tw * 0.25, marginTop: -tw * 0.25 }} />}
            </div>
          </div>;
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: alpha(P.bg, 18 + 14 * pull) }} />
      <div style={{ position: 'absolute', left: (W - cw) / 2, top: (H - ch) / 2 + (portrait ? -30 : 0), width: cw, height: ch, transform: `scale(${cs}) rotate(${(1 - cs) * -8 - 2 + wob(f, 5, 0.7)}deg) translateY(${wob(f, 7, 5) + (st > 0.5 ? -4 * Math.max(0, 1 - Math.abs(st - 1) * 6) : 0)}px)`, opacity: clamp(cs * 2, 0, 1), zIndex: 3 }}>
        <Sheet seed={21} e={{ b: true, t: true }} bg={P.surface} style={{ inset: 0 }} inner={{ backgroundImage: ruled(alpha(c1, 30), 54), backgroundPosition: '0 36px' }}>
          <div style={{ position: 'absolute', inset: 0, padding: '70px 70px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ fontFamily: KID, fontSize: tfs, lineHeight: 1.18, color: P.ink, wordBreak: 'keep-all' }}>{ls.map((t, i) => <div key={i} style={{ whiteSpace: 'nowrap', opacity: prog(f, 38 + i * 6, 12), transform: `translateY(${(1 - prog(f, 38 + i * 6, 14)) * 26}px)` }}><span style={i === ls.length - 1 ? mark(acc, prog(f, 58, 16)) : undefined}>{t}</span></div>)}</div>
            {msg && <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: mfs, lineHeight: 1.5, color: P.muted, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', opacity: prog(f, 54, 14) }}>{msg}</div>}
            {restChips.length > 0 && <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', opacity: prog(f, 60, 12) }}>{restChips.map((t, i) => <Pill key={i} text={t} bg={[c2, c3, acc][i % 3]} color={P.onAccent} size={portrait ? 34 : 30} />)}</div>}
          </div>
        </Sheet>
        <Tape w={200} rot={-5} color={c2} style={{ left: cw * 0.1, top: -26 }} />
        <Tape w={170} rot={6} color={c3} style={{ right: cw * 0.1, top: -22 }} />
        <div style={{ position: 'absolute', right: -sd * 0.18, bottom: -sd * 0.28, width: sd, height: sd, borderRadius: '50%', transform: `rotate(${-16 + (1 - st) * 40}deg) scale(${1 + (1 - Math.min(st, 1)) * 2.2})`, opacity: clamp(st * 2.5, 0, 0.94), zIndex: 9 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `9px solid ${c1}`, filter: 'brightness(.78) saturate(1.4)' }} />
          <div style={{ position: 'absolute', inset: 22, borderRadius: '50%', border: `4px dashed ${c1}`, filter: 'brightness(.78) saturate(1.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: sfs, color: c1, textAlign: 'center', lineHeight: 1.1, background: alpha(P.surface, 55) }}>{stamp ? <span style={{ filter: 'brightness(.78) saturate(1.4)' }}>{stamp}</span> : <svg width={sd * 0.4} height={sd * 0.4} viewBox="0 0 100 100"><path d="M50 88 C10 55 4 28 26 16 C40 8 50 18 50 28 C50 18 60 8 74 16 C96 28 90 55 50 88Z" fill={c1} /></svg>}</div>
        </div>
      </div>
      <Doodle k="heart" x={portrait ? PAD * 1.2 : W * 0.12} y={portrait ? H * 0.12 : H * 0.18} size={110} color={c2} rot={-12} delay={46} />
      <Sticker size={100} color={acc} x={portrait ? W - PAD * 1.1 : W * 0.88} y={portrait ? H * 0.9 : H * 0.84} delay={52} />
      <Brand scene={scene} pos="bl" onPhoto />
    </Paper>
  );
};

/* ---------- data.list: 이름표 수첩, 쪽으로 넘긴다 ---------- */
export const DataList: React.FC<PartProps<'data.list'>> = ({ data, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), items = data.items.slice(0, 40), n = items.length, c1 = accOf(scene.section + 1), c2 = accOf(scene.section + 2);
  const pages = n <= 14 ? 1 : n <= 28 ? 2 : 3, per = Math.ceil(n / pages), seg = (dur - 18) / pages;
  const shW = portrait ? W - PAD * 1.2 : W * 0.64, shH = portrait ? H * 0.72 : H * 0.86, shL = portrait ? PAD * 0.6 : W - shW - PAD * 0.7, shT = portrait ? H - shH - PAD * 0.7 : (H - shH) / 2;
  const cols = portrait ? (per <= 4 ? 1 : 2) : per <= 6 ? 2 : per <= 12 ? 3 : 4, rows = Math.ceil(per / cols), padX = portrait ? 70 : 100, padY = 56, gx = 22, gy = portrait ? 22 : 26;
  const tgW = (shW - padX - 50 - gx * (cols - 1)) / cols, tgH = Math.min(portrait ? 190 : 200, (shH - padY * 2 - gy * (rows - 1)) / rows), usedH = rows * tgH + (rows - 1) * gy;
  const title = data.title ?? '', tl = title.split('\n'), tfs = Math.min(portrait ? 120 : 130, ((portrait ? W - PAD * 2 : W * 0.3) - 60) / Math.max(1, ...tl.map((t) => [...t].length * 0.98)));
  const maxLen = Math.max(1, ...items.map((t) => [...t].length)), nfs = Math.min(tgH * 0.4, 70, (tgW - tgH * 0.5 - 30) / (maxLen * 0.95));
  return (
    <Stage scene={scene} dur={dur}>
      <Band seed={12} color={alpha(c1, 55)} x={portrait ? -W * 0.05 : -W * 0.04} y={portrait ? H * 0.02 : H * 0.12} w={portrait ? W * 1.1 : W * 0.5} h={portrait ? H * 0.22 : H * 0.62} rot={portrait ? -3 : -4} delay={0} />
      {/* 제목 라벨 */}
      <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 0.9 : H * 0.2, width: portrait ? W - PAD * 2 : W * 0.3, transform: `rotate(${-2.5 + wob(f, 1, 0.7)}deg) scale(${pop(f, 4, 11)})`, transformOrigin: 'left center', zIndex: 5 }}>
        {title && <div style={{ position: 'relative', filter: SHADOW }}><div style={{ background: P.surface, clipPath: torn(14, { b: true, l: true }), padding: '34px 30px 50px', fontFamily: KID, fontSize: tfs, lineHeight: 1.15, color: P.ink, wordBreak: 'keep-all', whiteSpace: 'pre-wrap', ...mark(acc, prog(f, 14, 20)) }}>{title}</div></div>}
        <Tape w={150} rot={-6} color={c2} style={{ left: 24, top: -24 }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 26, flexWrap: 'wrap' }}>
          {data.sub && <Pill text={data.sub} bg={P.ink} color={P.bg} size={portrait ? 36 : 32} />}
          <Pill text={`${n}`} bg={acc} color={P.onAccent} size={portrait ? 36 : 32} />
        </div>
      </div>
      {/* 쪽 번호 */}
      {pages > 1 && <div style={{ position: 'absolute', left: portrait ? W - PAD - 150 : PAD + 10, top: portrait ? PAD * 0.9 : H * 0.72, display: 'flex', gap: 14, zIndex: 5 }}>
        {Array.from({ length: pages }, (_, i) => { const cur = Math.min(pages - 1, Math.floor(clamp((f - 8) / seg, 0, pages - 0.001))); return <div key={i} style={{ width: i === cur ? 70 : 24, height: 24, borderRadius: 12, background: i === cur ? P.ink : alpha(P.ink, 30), border: `3px solid ${P.ink}`, boxSizing: 'border-box', transition: 'none' }} />; })}
      </div>}
      {Array.from({ length: pages }, (_, k) => {
        const lf = f - 8 - k * seg, enter = easeInOut(clamp((lf + 2) / 16, 0, 1)), exit = k < pages - 1 ? easeInOut(clamp((lf - seg + 2) / 14, 0, 1)) : 0;
        if (f < 8 + k * seg - 3 || (exit >= 1)) return null;
        const first = k === 0, pop0 = first ? pop(f, 6, 12) : 1, tx = first ? (1 - pop0) * 900 : (1 - enter) * 1400 - exit * 1500, rot = first ? (1 - pop0) * 6 - 1.2 : (1 - enter) * 9 - exit * 12 - 1.2 + (k % 2 ? 1.6 : 0);
        const its = items.slice(k * per, (k + 1) * per);
        return (
          <div key={k} style={{ position: 'absolute', left: shL, top: shT, width: shW, height: shH, transform: `translateX(${tx}px) rotate(${rot + wob(f, k, 0.5)}deg)`, zIndex: 3 + k }}>
            <div style={{ position: 'absolute', inset: 0, filter: SHADOW }}><div style={{ position: 'absolute', inset: 0, background: P.surface, borderRadius: 26, backgroundImage: ruled(alpha(c1, 26), 58), backgroundPosition: '0 30px' }}>
              {/* 바인더 구멍 */}
              {Array.from({ length: portrait ? 5 : 6 }, (_, h) => <div key={h} style={{ position: 'absolute', left: 22, top: ((h + 0.5) / (portrait ? 5 : 6)) * shH - 14, width: 28, height: 28, borderRadius: '50%', background: tint(acc, P.bg, 30), boxShadow: `inset 3px 3px 5px ${alpha(P.ink, 30)}` }} />)}
              <div style={{ position: 'absolute', left: 70, top: 0, bottom: 0, width: 4, background: alpha(accOf(scene.section + 3), 50) }} />
            </div></div>
            <div style={{ position: 'absolute', left: padX, top: padY + (shH - padY * 2 - usedH) / 2, right: 50 }}>
              {its.map((t, i) => {
                const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, its.length - r * cols), off = ((cols - inRow) * (tgW + gx)) / 2, s = pop(f, 8 + k * seg + 4 + i * 2.2, 11), cc = accOf(scene.section + i + k), gi = k * per + i;
                return (
                  <div key={i} style={{ position: 'absolute', left: off + c * (tgW + gx), top: r * (tgH + gy), width: tgW, height: tgH, boxSizing: 'border-box', background: i % 3 === 0 ? tint(cc, P.surface, 28) : P.surface, border: `4px solid ${P.ink}`, borderRadius: 24, boxShadow: `6px 7px 0 ${cc}`, display: 'flex', alignItems: 'center', gap: tgH * 0.12, padding: `0 ${tgH * 0.1}px 0 ${tgH * 0.22}px`, transform: `scale(${first || enter > 0.4 ? s : 0}) rotate(${((i * 7 + k) % 3 - 1) * 1.6 + wob(f, gi, 0.7)}deg) translateY(${wob(f, gi + 3, 2.5)}px)`, opacity: first || enter > 0.4 ? clamp(s * 2, 0, 1) : 0 }}>
                    <div style={{ flex: '0 0 auto', width: tgH * 0.2, height: tgH * 0.2, borderRadius: '50%', background: P.bg, border: `4px solid ${P.ink}`, boxSizing: 'border-box', marginLeft: -tgH * 0.06 }} />
                    <div style={{ flex: 1, minWidth: 0, fontFamily: KID, fontSize: nfs, lineHeight: 1.15, color: P.ink, whiteSpace: 'nowrap', textAlign: 'center' }}>{t}</div>
                    {i % 5 === 2 && <Star size={tgH * 0.3} color={cc} style={{ right: -tgH * 0.12, top: -tgH * 0.14, transform: `rotate(${f * 0.9}deg)` }} />}
                  </div>
                );
              })}
            </div>
            <Tape w={200} rot={-3} color={c2} style={{ left: shW * 0.4, top: -26 }} />
          </div>
        );
      })}
      <div style={{ display: 'none' }}>{BODY}</div>
    </Stage>
  );
};
