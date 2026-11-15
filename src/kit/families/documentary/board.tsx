import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { accentOf } from '../../context';
import { LivePhoto, clamp, easeInOut, glide, useLayout, wob } from '../../motion';
import type { KPhoto, PartProps } from '../../schema.ts';
import { BottomScrim, Bug, Cell, LowerThird, SCRIM, Stamp, Tag, useDoc } from './common';
import { Label } from './photos';

const pad2 = (n: number) => String(n).padStart(2, '0');
type R = [number, number, number, number];
const box = (r: R, W: number, H: number, g: number) => {
  const x0 = r[0] * W + (r[0] > 0 ? g / 2 : 0), y0 = r[1] * H + (r[1] > 0 ? g / 2 : 0), x1 = (r[0] + r[2]) * W - (r[0] + r[2] < 0.999 ? g / 2 : 0), y1 = (r[1] + r[3]) * H - (r[1] + r[3] < 0.999 ? g / 2 : 0);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/* ---------------- photo.grid: 장면 번호·장수로 방식이 달라진다 ---------------- */
const ML: Record<number, R[]> = {
  4: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.25, 0.5], [0.75, 0.5, 0.25, 0.5]],
  5: [[0, 0, 0.4, 1], [0.4, 0, 0.3, 0.5], [0.7, 0, 0.3, 0.5], [0.4, 0.5, 0.3, 0.5], [0.7, 0.5, 0.3, 0.5]],
  6: [[0, 0, 0.4, 0.6], [0.4, 0, 0.3, 0.6], [0.7, 0, 0.3, 0.6], [0, 0.6, 0.3, 0.4], [0.3, 0.6, 0.4, 0.4], [0.7, 0.6, 0.3, 0.4]],
};
const MP: Record<number, R[]> = {
  4: [[0, 0, 1, 0.4], [0, 0.4, 0.5, 0.3], [0.5, 0.4, 0.5, 0.3], [0, 0.7, 1, 0.3]],
  5: [[0, 0, 1, 0.36], [0, 0.36, 0.5, 0.32], [0.5, 0.36, 0.5, 0.32], [0, 0.68, 0.5, 0.32], [0.5, 0.68, 0.5, 0.32]],
  6: [[0, 0, 1, 0.28], [0, 0.28, 0.5, 0.22], [0.5, 0.28, 0.5, 0.22], [0, 0.5, 0.5, 0.22], [0.5, 0.5, 0.5, 0.22], [0, 0.72, 1, 0.28]],
};
/** 디버그·검수용: 숫자를 넣으면 그 방식으로 고정 */
export const FORCE_GRID: number | null = null;
export const gridVariant = (index: number, n: number) => FORCE_GRID ?? (((index % 3) + n) % 3);

type GP = { ph: KPhoto[]; dur: number; a: string; label?: string; scene: PartProps<'photo.grid'>['scene'] };

/** (a) 모자이크가 한 칸씩 조립되고, 번호 라벨과 함께 칸마다 차례로 짚어 준다 */
const GridMosaic: React.FC<GP> = ({ ph, dur, a, label, scene }) => {
  const f = useCurrentFrame(), { W, H, portrait } = useLayout(), { palette, sans } = useDoc(), n = ph.length, g = 8, rs = (portrait ? MP : ML)[clamp(n, 4, 6)];
  const st = 9, built = st * (n - 1) + 24, hs = Math.max(10, Math.floor((dur - built - 6) / n)), froms: ('l' | 'r' | 't' | 'b')[] = portrait ? ['l', 'r', 'l', 'r', 'l', 'r'] : ['l', 'b', 't', 'b', 't', 'r'];
  return <AbsoluteFill style={{ background: palette.bg }}>
    {ph.map((p, i) => {
      const b = box(rs[i] ?? rs[rs.length - 1], W, H, g), act = glide(f, built + i * hs, 8) * (1 - (i < n - 1 ? glide(f, built + (i + 1) * hs, 8) : 0)), dim = 0.45 * (1 - act) * glide(f, built, 10);
      return <React.Fragment key={i}>
        <Cell ph={p} dur={dur} {...b} delay={i * st} dir={i % 2 ? -1 : 1} from={froms[i]} accent={a} fs={portrait ? 30 : 28} strength={0.9} />
        <div style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, background: `${SCRIM}${dim})`, boxShadow: `inset 0 0 0 ${6 * act}px ${a}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: b.x + b.w - 8, top: b.y + 8, transform: 'translateX(-100%)', opacity: glide(f, i * st + 12, 10), background: `${SCRIM}0.68)`, padding: '4px 12px', fontFamily: sans, fontWeight: 800, fontSize: portrait ? 26 : 24, color: palette.ink, borderBottom: `3px solid ${a}`, fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>{pad2(i + 1)}</div>
      </React.Fragment>;
    })}
    <Bug scene={scene} /><Label text={label} a={a} />
  </AbsoluteFill>;
};

/** (b) 큰 사진 하나가 차례로 바뀌고, 옆(아래)의 썸네일이 현재 컷을 따라간다 */
const GridHero: React.FC<GP> = ({ ph, dur, a, label, scene }) => {
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout(), { palette, sans } = useDoc(), n = ph.length, g = 8, s = Math.floor((dur - 8) / n), k = Math.min(n - 1, Math.floor(f / s));
  const hero = portrait ? { x: 0, y: 0, w: W, h: H * 0.68 } : { x: 0, y: 0, w: W * 0.8 - g / 2, h: H };
  const th = (i: number) => portrait ? { x: i * ((W - g * (n - 1)) / n + g), y: H * 0.68 + g / 2, w: (W - g * (n - 1)) / n, h: H * 0.32 - g / 2 } : { x: W * 0.8 + g / 2, y: i * ((H - g * (n - 1)) / n + g), w: W * 0.2 - g / 2, h: (H - g * (n - 1)) / n };
  return <AbsoluteFill style={{ background: palette.bg }}>
    <div style={{ position: 'absolute', left: hero.x, top: hero.y, width: hero.w, height: hero.h, overflow: 'hidden' }}>
      {ph.map((p, i) => (i === k || i === k - 1) && <Sequence key={i} from={i * s} layout="none"><HeroShot ph={p} i={i} n={n} dur={dur} a={a} label={label} portrait={portrait} hw={hero.w} hh={hero.h} PAD={PAD} /></Sequence>)}
    </div>
    {ph.map((p, i) => {
      const b = th(i), act = i === k ? 1 : 0, on = glide(f, i * 4, 14), prog = i === k ? clamp((f - i * s) / s, 0, 1) : 0;
      return <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, overflow: 'hidden', opacity: on, transform: `translateY(${(1 - on) * 16}px)` }}>
        <LivePhoto ph={p} dur={dur} strength={0.5} dir={i % 2 ? -1 : 1} />
        <div style={{ position: 'absolute', inset: 0, background: `${SCRIM}${i === k ? 0 : 0.55})`, boxShadow: `inset 0 0 0 ${i === k ? 5 : 0}px ${a}` }} />
        <div style={{ position: 'absolute', left: 10, top: 8, fontFamily: sans, fontWeight: 800, fontSize: portrait ? 24 : 22, color: palette.ink, textShadow: `0 1px 8px ${SCRIM}0.8)`, fontVariantNumeric: 'tabular-nums' }}>{pad2(i + 1)}</div>
        {act > 0 && <div style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: `${prog * 100}%`, background: a }} />}
      </div>;
    })}
    <Bug scene={scene} />
  </AbsoluteFill>;
};
const HeroShot: React.FC<{ ph: KPhoto; i: number; n: number; dur: number; a: string; label?: string; portrait: boolean; hw: number; hh: number; PAD: number }> = ({ ph, i, n, dur, a, label, portrait, hw, hh, PAD }) => {
  const f = useCurrentFrame(), { palette, sans } = useDoc(), t = i === 0 ? glide(f, 0, 18) : glide(f, 0, 10), cap = ph.caption ?? (label ? `${label} ${pad2(i + 1)}` : `${pad2(i + 1)} / ${pad2(n)}`);
  return <AbsoluteFill style={{ clipPath: portrait ? `inset(0 ${(1 - t) * 100}% 0 0)` : `inset(${(1 - t) * 100}% 0 0 0)` }}>
    <LivePhoto ph={ph} dur={dur * 0.5} dir={i % 2 ? -1 : 1} strength={1.2} />
    <BottomScrim strength={0.88} h={0.6} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '22%', background: `linear-gradient(to bottom, ${SCRIM}0.5), ${SCRIM}0))` }} />
    <LowerThird caption={cap} time={ph.time} date={ph.date} accent={a} delay={5} left={PAD} bottom={hh * 0.08} maxW={hw - PAD * 2} scale={portrait ? 0.95 : 0.9} />
    <div style={{ position: 'absolute', right: PAD * 0.6, top: PAD * 0.7, fontFamily: sans, fontWeight: 700, fontSize: portrait ? 30 : 26, color: palette.ink, letterSpacing: 2, fontVariantNumeric: 'tabular-nums', textShadow: `0 1px 10px ${SCRIM}0.7)` }}>{pad2(i + 1)}<span style={{ opacity: 0.55 }}> / {pad2(n)}</span></div>
  </AbsoluteFill>;
};

/** (c) 밀착 인화(콘택트 시트): 필름 칸 번호가 붙은 사진판 위에 붉은 펜으로 고른 컷을 짚는다 */
const GridSheet: React.FC<GP & { pick: number }> = ({ ph, dur, a, label, scene, pick }) => {
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout(), { palette, sans, serif } = useDoc(), n = ph.length, gap = 14, pad = Math.round(W * 0.035), head = Math.round(PAD * 0.7 + 70);
  const rows = portrait ? (n >= 6 ? [2, 2, 2] : n === 5 ? [2, 2, 1] : [2, 2]) : (n >= 6 ? [3, 3] : n === 5 ? [3, 2] : [2, 2]), rh = (H - head - pad - gap * (rows.length - 1)) / rows.length;
  const cells: { x: number; y: number; w: number; h: number }[] = []; let y = head;
  rows.forEach((c) => { const w = (W - pad * 2 - gap * (c - 1)) / c; for (let k = 0; k < c; k++) cells.push({ x: pad + k * (w + gap), y, w, h: rh }); y += rh + gap; });
  const p1 = pick % n, p2 = (p1 + 2) % n, built = n * 4 + 14, h1 = built + 8, h2 = h1 + Math.floor((dur - h1 - 14) / 2);
  const pickT = (i: number) => (i === p1 ? glide(f, h1, 10) : i === p2 ? glide(f, h2, 10) : 0), dimT = glide(f, h1, 12);
  const stroke = (i: number, from: number) => { const c = cells[i], t = glide(f, from, 14), P = (c.w + 16 + c.h + 16) * 2; return c && <rect x={c.x - 8} y={c.y - 8} width={c.w + 16} height={c.h + 16} fill="none" stroke={a} strokeWidth={7} strokeLinecap="round" strokeDasharray={P} strokeDashoffset={P * (1 - t)} transform={`rotate(${i % 2 ? 0.5 : -0.5} ${c.x + c.w / 2} ${c.y + c.h / 2})`} />; };
  return <AbsoluteFill style={{ background: palette.bg }}>
    <div style={{ position: 'absolute', left: pad / 2, right: pad / 2, top: head - 12, bottom: pad / 2, background: palette.surface, transformOrigin: 'top', transform: `scaleY(${glide(f, 0, 16)})` }} />
    {ph.map((p, i) => {
      const c = cells[i]; if (!c) return null; const on = glide(f, i * 4, 12), bright = (0.35 + 0.65 * on) * (1 - 0.5 * dimT * (1 - pickT(i)));
      return <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, opacity: on, filter: `brightness(${bright})` }}>
        <Cell ph={p} dur={dur} x={0} y={0} w={c.w} h={c.h} delay={i * 4} dir={i % 2 ? -1 : 1} from="t" accent={a} fs={portrait ? 28 : 26} strength={0.7} />
        <div style={{ position: 'absolute', left: 0, top: 0, background: `${SCRIM}0.7)`, padding: '4px 12px', fontFamily: sans, fontWeight: 700, fontSize: portrait ? 22 : 20, color: palette.ink, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>{`${pad2(i + 1)}A`}</div>
      </div>;
    })}
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>{stroke(p1, h1)}{stroke(p2, h2)}</svg>
    <Bug scene={scene} />
    <div style={{ position: 'absolute', right: pad, top: PAD * 0.7, height: 40, display: 'flex', alignItems: 'baseline', gap: 18, fontFamily: sans, opacity: glide(f, 6, 14), color: palette.ink }}>
      {label && <span style={{ fontFamily: serif, fontWeight: 800, fontSize: Math.max(30, W * 0.02) }}>{label}</span>}
      <span style={{ fontSize: Math.max(20, W * 0.012), fontWeight: 600, color: palette.muted, letterSpacing: 2 }}>{n}컷</span>
    </div>
  </AbsoluteFill>;
};

export const PhotoGrid: React.FC<PartProps<'photo.grid'>> = ({ data, photos, dur, scene }) => {
  const { palette } = useDoc(), a = accentOf(palette, scene.section), ph = photos.slice(0, 6), v = gridVariant(scene.index, ph.length), P = { ph, dur, a, label: data.label, scene };
  return v === 0 ? <GridMosaic {...P} /> : v === 1 ? <GridHero {...P} /> : <GridSheet {...P} pick={scene.index * 2 + 1} />;
};

/* ---------------- photo.trio: 세 장면 순차 초점 + 타임라인 + 시차 ---------------- */
export const PhotoTrio: React.FC<PartProps<'photo.trio'>> = ({ data, photos, dur, scene }) => {
  const { palette, serif, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), ph = photos.slice(0, 3), n = ph.length, g = 8;
  const tl = Math.round(H * (portrait ? 0.12 : 0.14)), area = H - tl, total = (portrait ? area : W), enter = glide(f, 0, 18);
  const seg = (dur - 20) / n, p = n > 1 ? clamp((f - 8) / seg, 0, n) : 0;   // 초점 위치 0→n, 전환은 구간 끝 14프레임
  const pos = (() => { let q = 0; for (let i = 0; i < n - 1; i++) q += easeInOut(clamp((f - (8 + seg * (i + 1) - 14)) / 14, 0, 1)); return q; })();
  void p;
  const amt = (i: number) => clamp(1 - Math.abs(pos - i), 0, 1), wt = ph.map((_, i) => 1 + 2.2 * amt(i)), sum = wt.reduce((x, y) => x + y, 0), avail = total - g * (n - 1);
  let acc = 0; const panels = ph.map((_, i) => { const size = (avail * wt[i]) / sum, st = acc; acc += size + g; return { st, size }; });
  const cur = Math.round(pos), moving = Math.abs(pos - cur) > 0.02;
  return <AbsoluteFill style={{ background: palette.bg }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: area, overflow: 'hidden' }}>
      {ph.map((p, i) => {
        const { st, size } = panels[i], A = amt(i), par = clamp((pos - i) * 34, -36, 36), L = portrait ? { left: 0, top: st, width: W, height: size } : { left: st, top: 0, width: size, height: area };
        const px = portrait ? { left: 0, top: -40 + par, width: W, height: size + 80 } : { left: -40 + par, top: 0, width: size + 80, height: area };
        const cap = p.caption ?? data.label ?? '', cs = portrait ? 52 : 50, mw = (portrait ? W : size) - PAD * 1.6 - cs * 2.2, fs = Math.min(cs, (mw / Math.max(Array.from(cap).length, 1)) * 0.98);
        return <div key={i} style={{ position: 'absolute', ...L, overflow: 'hidden', opacity: enter, transform: `translate${portrait ? 'X' : 'Y'}(${(1 - enter) * (i % 2 ? -1 : 1) * 40}px)` }}>
          <div style={{ position: 'absolute', ...px }}><LivePhoto ph={p} dur={dur} dir={i % 2 ? -1 : 1} strength={1} /></div>
          <div style={{ position: 'absolute', inset: 0, background: `${SCRIM}${0.5 * (1 - A)})` }} />
          <BottomScrim strength={0.75 * A} h={0.5} />
          {/* 비초점: 번호 */}
          <div style={{ position: 'absolute', right: 22, top: portrait ? 16 : 20, fontFamily: sans, fontWeight: 800, fontSize: portrait ? 34 : 30, color: palette.ink, opacity: 0.9 * (1 - A), letterSpacing: 2, textShadow: `0 1px 8px ${SCRIM}0.8)`, fontVariantNumeric: 'tabular-nums' }}>{pad2(i + 1)}</div>
          {/* 초점: 큰 번호 + 캡션 + 시각 */}
          <div style={{ position: 'absolute', left: portrait ? PAD : PAD * 0.7, bottom: portrait ? Math.min(size * 0.1, 60) : H * 0.06, display: 'flex', alignItems: 'flex-end', gap: cs * 0.4, opacity: A * A, transform: `translateY(${(1 - A) * 18 + wob(f, i, 2)}px)`, fontFamily: sans, color: palette.ink, textShadow: `0 2px 14px ${SCRIM}0.6)` }}>
            <span style={{ fontFamily: serif, fontWeight: 800, fontSize: cs * 2.2, lineHeight: 0.85, color: a, fontVariantNumeric: 'tabular-nums' }}>{pad2(i + 1)}</span>
            <div style={{ paddingBottom: cs * 0.05, minWidth: 0 }}>
              {(p.time || p.date) && <div style={{ marginBottom: cs * 0.15 }}><Stamp time={p.time} date={p.date} size={cs * 0.5} accent={a} /></div>}
              {cap && <div style={{ fontWeight: 700, fontSize: fs, lineHeight: 1.15, wordBreak: 'keep-all' }}>{cap}</div>}
            </div>
          </div>
        </div>;
      })}
    </div>
    {/* 타임라인 */}
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tl, background: palette.bg }} />
    {(() => {
      const x0 = PAD + 20, x1 = W - PAD - 20, y = H - tl * 0.55, fill = n > 1 ? pos / (n - 1) : 1;
      return <>
        <div style={{ position: 'absolute', left: x0, width: x1 - x0, top: y - 2, height: 4, background: 'rgba(255,255,255,0.2)' }}><div style={{ width: `${fill * 100}%`, height: '100%', background: a }} /></div>
        {ph.map((p, i) => {
          const x = n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : (x0 + x1) / 2, on = i <= pos + 0.02, here = i === cur && !moving, r = (portrait ? 13 : 12) * (1 + 0.5 * amt(i));
          const lab = p.time ?? `${pad2(i + 1)}`;
          return <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: on ? a : palette.bg, border: `3px solid ${on ? a : palette.muted}`, boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', left: x - 120, width: 240, top: y + r + 8, textAlign: 'center', fontFamily: sans, fontWeight: here || amt(i) > 0.5 ? 800 : 600, fontSize: portrait ? 28 : 24, color: amt(i) > 0.5 ? palette.ink : palette.muted, letterSpacing: 1.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{lab}</div>
          </React.Fragment>;
        })}
      </>;
    })()}
    <Bug scene={scene} /><Label text={data.label} a={a} />
  </AbsoluteFill>;
};
