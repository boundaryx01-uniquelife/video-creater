import React from 'react';
import { AbsoluteFill } from 'remotion';
import { LivePhoto, clamp, easeInOut, fit, glide, life, pan, pop, prog, wob } from '../../motion';
import type { KPhoto, PartProps, SceneInfo } from '../../schema.ts';
import { Brand, Paper, Pill, Polaroid, Sticker, alpha, exitT, pfit, tint, useS } from './kit';
import { Photo } from '../../../lib/common';

/** 사진 부품 공용 틀: 구간 색으로 물든 종이, 위쪽 꼬리표, 구석 브랜드, 장면 끝에서 밀려 나감 */
const Page: React.FC<{ scene: SceneInfo; label?: string; dur: number; cam?: boolean; children: React.ReactNode }> = ({ scene, label, dur, cam = true, children }) => {
  const { P, f, KID, PAD, portrait, acc } = useS(scene), out = exitT(f, dur), L = life(f, dur);
  return (
    <Paper color={tint(acc, P.bg, 14)}>
      <AbsoluteFill style={{ transform: `scale(${cam ? 1 + 0.035 * L : 1}) translateX(${-70 * out}px)`, opacity: 1 - 0.15 * out }}>{children}</AbsoluteFill>
      <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 0.9 : PAD * 0.6, display: 'flex', gap: 14, alignItems: 'center', transform: `translateY(${(1 - pop(f, 2)) * -50}px)`, zIndex: 5 }}>
        {scene.section >= 0 && <Pill text={`${scene.section + 1}`} bg={acc} color={P.onAccent} size={36} style={{ padding: '6px 20px' }} />}
        {label && <Pill text={label} bg={P.ink} color={P.bg} size={portrait ? 34 : 32} />}
      </div>
      <Brand scene={scene} />
    </Paper>
  );
};
const tapes = (P: { accents: string[] }, k: number) => alpha(P.accents[k % P.accents.length], 82);
const capOf = (x: KPhoto) => x.caption;
const capSize = (text: string, width: number) => { const n = [...text].length; return n <= 7 ? Math.min(112, width / (n * 0.95)) : Math.min(104, Math.max(70, width / (Math.ceil(n / 2) + 0.5))); };

/* ---------- photo.full ---------- */
export const PhotoFull: React.FC<PartProps<'photo.full'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, PAD, W, H, portrait, acc } = useS(scene), x = photos[0], L = life(f, dur), out = exitT(f, dur);
  const dir = scene.index % 2 ? 1 : -1, z = 1.08 + 0.12 * L, fx = x?.fx ?? 0.5, fy = x?.fy ?? 0.45;
  const tx = dir * (-3 + 6 * L) + (0.5 - fx) * 6, ty = (0.45 - fy) * 6;
  return (
    <AbsoluteFill style={{ background: P.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ overflow: 'hidden', transform: `scale(${1.02 - 0.02 * pop(f, 0, 14)}) translateX(${-50 * out}px)` }}>{x && <Photo src={x.src} fx={fx} fy={fy} scale={z} tx={pan(tx, z)} ty={pan(ty, z)} />}</AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,.66) 100%)' }} />
      {/* 사진 둘레 종이 테두리 */}
      <AbsoluteFill style={{ border: `${portrait ? 22 : 20}px solid ${P.surface}`, boxSizing: 'border-box', borderRadius: 0, opacity: 0.95 * pop(f, 0, 14), transform: `scale(${1.05 - 0.05 * pop(f, 0, 14)})` }} />
      <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: portrait ? H * 0.12 : PAD * 1.1, zIndex: 4 }}>
        {data.chip && <div style={{ transform: `scale(${pop(f, 12)})`, transformOrigin: 'left' }}><Pill text={data.chip} bg={acc} color={P.onAccent} size={34} /></div>}
        {data.caption && <div style={{ marginTop: 20, fontFamily: KID, color: '#fff', fontSize: capSize(data.caption, portrait ? W - PAD * 2 : W * 0.62), lineHeight: 1.18, wordBreak: 'keep-all', textWrap: 'balance', textShadow: '0 4px 18px rgba(0,0,0,.5)', transform: `translateY(${(1 - prog(f, 10, 16)) * 50}px) rotate(${wob(f, 2, 0.5)}deg)`, opacity: prog(f, 10, 12), maxWidth: portrait ? undefined : W * 0.66 }}>{data.caption}</div>}
        {data.sub && <div style={{ marginTop: 12, fontFamily: BODY, fontWeight: 700, color: '#fff', opacity: 0.92 * prog(f, 18, 14), fontSize: portrait ? 38 : 36, textShadow: '0 2px 10px rgba(0,0,0,.5)', wordBreak: 'keep-all' }}>{data.sub}</div>}
      </div>
      <Sticker size={portrait ? 96 : 84} color={acc} x={W - PAD - 40} y={PAD + 60} delay={22} />
      <Brand scene={scene} onPhoto pos="tr" />
    </AbsoluteFill>
  );
};

/* ---------- photo.trio ---------- */
export const PhotoTrio: React.FC<PartProps<'photo.trio'>> = ({ data, photos, dur, scene }) => {
  const { W, H, PAD, portrait, P } = useS(scene), [x, y, z] = photos, hasCap = photos.some((p) => capOf(p));
  const A = portrait ? pfit(x.aspect, W * 0.84, H * 0.3, !!capOf(x)) : pfit(x.aspect, 940, 700, !!capOf(x));
  const B = portrait ? pfit(y.aspect, W * 0.42, H * 0.24, !!capOf(y)) : pfit(y.aspect, 560, 360, !!capOf(y)), C = portrait ? pfit(z.aspect, W * 0.42, H * 0.24, !!capOf(z)) : pfit(z.aspect, 560, 360, !!capOf(z));
  void hasCap;
  const lx = (W - (A.ow + 70 + Math.max(B.ow, C.ow))) / 2;
  return (
    <Page scene={scene} label={data.label} dur={dur}>
      {portrait ? <>
        <Polaroid ph={x} {...A} rot={-2.5} dur={dur} delay={6} seed={1} cap={capOf(x)} tape={tapes(P, 0)} style={{ left: (W - A.ow) / 2, top: H * 0.13 }} />
        <Polaroid ph={y} {...B} rot={4} dur={dur} delay={16} seed={2} cap={capOf(y)} tape={tapes(P, 1)} style={{ left: PAD * 0.8, top: H * 0.56 }} />
        <Polaroid ph={z} {...C} rot={-4} dur={dur} delay={26} seed={3} cap={capOf(z)} tape={tapes(P, 2)} style={{ right: PAD * 0.8, top: H * 0.68 }} />
      </> : <>
        <Polaroid ph={x} {...A} rot={-2.5} dur={dur} delay={6} seed={1} cap={capOf(x)} tape={tapes(P, 0)} style={{ left: lx, top: (H - A.oh) / 2 + 20 }} />
        <Polaroid ph={y} {...B} rot={4} dur={dur} delay={16} seed={2} cap={capOf(y)} tape={tapes(P, 1)} style={{ left: lx + A.ow + 70, top: H * 0.13 }} />
        <Polaroid ph={z} {...C} rot={-3} dur={dur} delay={26} seed={3} cap={capOf(z)} tape={tapes(P, 2)} style={{ left: lx + A.ow + 100, top: H * 0.54 }} />
      </>}
    </Page>
  );
};

/* ---------- photo.grid ---------- */
export const PhotoGrid: React.FC<PartProps<'photo.grid'>> = ({ data, photos, dur, scene }) => {
  const { W, H, PAD, portrait, P } = useS(scene), n = photos.length, cols = portrait ? 2 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
  const top = portrait ? H * 0.12 : PAD * 1.5, aw = W - PAD * 2, ah = H - top - (portrait ? PAD * 1.2 : PAD * 0.9), cw = aw / cols, ch = ah / rows;
  const rots = [-3, 2.5, 2, -2.5, 3, -2];
  return (
    <Page scene={scene} label={data.label} dur={dur}>
      {photos.map((x, k) => {
        const r = Math.floor(k / cols), inRow = Math.min(cols, n - r * cols), off = ((cols - inRow) * cw) / 2, c = k % cols, b = pfit(x.aspect, cw * 0.9, ch * 0.9, !!capOf(x));
        return <Polaroid key={k} ph={x} {...b} rot={rots[k % 6]} dur={dur} delay={4 + k * 6} seed={k + 1} cap={capOf(x)} tape={tapes(P, k)} style={{ left: PAD + off + c * cw + (cw - b.ow) / 2, top: top + r * ch + (ch - b.oh) / 2 }} />;
      })}
    </Page>
  );
};

/* ---------- photo.strip ---------- */
export const PhotoStrip: React.FC<PartProps<'photo.strip'>> = ({ data, photos, dur, scene }) => {
  const { f, W, H, PAD, portrait, P } = useS(scene), L = life(f, dur, 6), mv = easeInOut(L), gap = portrait ? 70 : 80;
  const sizes = photos.map((x) => (portrait ? pfit(x.aspect, W * 0.74, H * 0.3, !!capOf(x)) : pfit(x.aspect, 660, 560, !!capOf(x))));
  const rots = [-2.5, 2, -1.5, 2.5, -2, 1.5];
  let pos = 0;
  const total = sizes.reduce((a, b) => a + (portrait ? b.oh : b.ow) + gap, 0) - gap;
  const start = portrait ? H * 0.2 : W * 0.12, end = portrait ? H * 0.84 - total : W * 0.88 - total, t = start + (end - start) * mv;
  return (
    <Page scene={scene} label={data.label} dur={dur} cam={false}>
      {/* 종이띠: 사진 뒤로 길게 깔린 마스킹테이프 */}
      <div style={{ position: 'absolute', ...(portrait ? { left: W / 2 - 14, top: 0, width: 28, height: '100%' } : { top: H / 2 - 14, left: 0, height: 28, width: '100%' }), background: alpha(P.accents[scene.section < 0 ? 0 : scene.section % P.accents.length], 35) }} />
      <div style={{ position: 'absolute', inset: 0, transform: portrait ? `translateY(${t}px)` : `translateX(${t}px)` }}>
        {photos.map((x, k) => {
          const b = sizes[k], p0 = pos; pos += (portrait ? b.oh : b.ow) + gap;
          const st: React.CSSProperties = portrait ? { left: (W - b.ow) / 2 + (k % 2 ? 50 : -50), top: p0 } : { left: p0, top: (H - b.oh) / 2 + (k % 2 ? 40 : -40) };
          return <Polaroid key={k} ph={x} {...b} rot={rots[k % 6]} dur={dur} delay={2 + k * 4} seed={k + 1} cap={capOf(x)} tape={tapes(P, k)} style={st} drift={0.8} />;
        })}
      </div>
    </Page>
  );
};
