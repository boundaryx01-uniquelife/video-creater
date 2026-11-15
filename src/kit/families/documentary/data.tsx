import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { accentOf } from '../../context';
import { clamp, easeInOut, fitFont, glide, prog, useLayout, wob } from '../../motion';
import type { PartProps } from '../../schema.ts';
import { Bug, Rise, Tag, useDoc } from './common';

const Head: React.FC<{ title?: string; a: string; size: number }> = ({ title, a, size }) => {
  const { palette, sans } = useDoc(), f = useCurrentFrame();
  if (!title) return null;
  return <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.4, fontFamily: sans, fontWeight: 800, fontSize: size, color: palette.ink, opacity: glide(f, 4, 14), wordBreak: 'keep-all' }}><div style={{ width: size * 0.3, height: size * 1.1, background: a }} />{title}</div>;
};

export const DataNumbers: React.FC<PartProps<'data.numbers'>> = ({ data, dur, scene }) => {
  const { palette, sans, serif } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), items = data.items.slice(0, 4), n = items.length;
  const areaW = W - PAD * 2, areaH = H - PAD * 2 - (portrait ? H * 0.1 : 0);
  const cw = portrait ? areaW : areaW / n, ch = portrait ? Math.min(areaH * 0.78 / n, 300) : 0;
  return <AbsoluteFill style={{ background: palette.bg }}>
    <Bug scene={scene} />
    <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.12 : H * 0.17 }}><Head title={data.title} a={a} size={portrait ? 46 : 42} /></div>
    <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.25 : H * 0.34, width: areaW, height: portrait ? undefined : H * 0.46, display: 'flex', flexDirection: portrait ? 'column' : 'row' }}>
      {items.map((it, i) => {
        const t = glide(f, 8 + i * 8, 20), c = clamp((f - 10 - i * 8) / 44, 0, 1), val = Math.round(it.value * (1 - Math.pow(1 - c, 3))), txt = val.toLocaleString('en-US'), full = it.value.toLocaleString('en-US');
        const fs = Math.min(portrait ? 190 : 210, fitFont(full + (it.unit ?? ''), 260, (portrait ? cw : cw - 50) * 0.96, 0.62));
        return <div key={i} style={{ width: cw, height: portrait ? ch : undefined, boxSizing: 'border-box', padding: portrait ? `${ch * 0.05}px 0` : '0 24px 0 24px', borderTop: portrait ? `2px solid ${palette.muted}55` : undefined, borderLeft: !portrait && i > 0 ? `2px solid ${palette.muted}55` : undefined, marginLeft: !portrait && i === 0 ? -24 : 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: t, transform: `translateY(${(1 - t) * 30 + wob(f, i, 2)}px)`, fontFamily: sans }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: fs * 0.1, whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: serif, fontWeight: 800, fontSize: fs, lineHeight: 1, color: palette.ink, fontVariantNumeric: 'tabular-nums' }}>{txt}</span>
            {it.unit && <span style={{ fontWeight: 800, fontSize: fs * 0.34, color: a }}>{it.unit}</span>}
          </div>
          <div style={{ marginTop: fs * 0.12, fontSize: Math.max(26, Math.min(46, fs * 0.2)), fontWeight: 600, color: palette.muted, wordBreak: 'keep-all' }}>{it.label}</div>
          <div style={{ marginTop: fs * 0.1, height: 5, width: 70, background: a, transformOrigin: 'left', transform: `scaleX(${glide(f, 20 + i * 8, 16)})` }} />
        </div>;
      })}
    </div>
  </AbsoluteFill>;
};

export const DataSchedule: React.FC<PartProps<'data.schedule'>> = ({ data, dur, scene }) => {
  const { palette, sans, serif } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), rows = data.rows.slice(0, 6), n = rows.length;
  const x0 = portrait ? PAD : W * 0.38, rw = W - x0 - PAD, top = portrait ? H * 0.2 : H * 0.14, bot = portrait ? H * 0.1 : H * 0.1, rh = Math.min(portrait ? 200 : 160, (H - top - bot) / n);
  const prog1 = glide(f, 6, Math.max(30, dur - 30)), timeW = Math.min(portrait ? 190 : 200, rw * 0.28), fsW = portrait ? 56 : 52;
  return <AbsoluteFill style={{ background: palette.bg }}>
    <Bug scene={scene} />
    {data.title && <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.12 : top, width: portrait ? W - PAD * 2 : W * 0.38 - PAD * 1.5 }}>
      <div style={{ width: 70, height: 8, background: a, marginBottom: 22, transformOrigin: 'left', transform: `scaleX(${glide(f, 0, 16)})` }} />
      <Rise delay={4} dur={22}><div style={{ fontFamily: serif, fontWeight: 800, fontSize: Math.min(portrait ? 84 : 88, fitFont(data.title, 100, portrait ? W - PAD * 2 : W * 0.38 - PAD * 1.6, 1.04)), color: palette.ink, lineHeight: 1.2, wordBreak: 'keep-all' }}>{data.title}</div></Rise>
    </div>}
    <div style={{ position: 'absolute', left: x0, top, width: rw }}>
      <div style={{ position: 'absolute', left: timeW + 14, top: rh / 2, width: 4, height: (n - 1) * rh, background: 'rgba(255,255,255,0.16)' }}><div style={{ width: '100%', height: `${prog1 * 100}%`, background: a }} /></div>
      {rows.map((r, i) => {
        const t = glide(f, 10 + i * 8, 18), lit = prog1 * (n - 1) >= i - 0.05, hi = !!r.hi, wfs = fitFont(r.what, fsW * (hi ? 1.08 : 1), rw - timeW - 90, 1.02);
        return <div key={i} style={{ position: 'absolute', left: 0, top: i * rh, width: rw, height: rh, display: 'flex', alignItems: 'center', fontFamily: sans, opacity: t, transform: `translateX(${(1 - t) * 30}px)` }}>
          <div style={{ width: timeW, textAlign: 'right', fontSize: fsW * 1.05, fontWeight: 800, color: lit ? palette.ink : palette.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.when}</div>
          <div style={{ width: 32, height: 32, margin: '0 -2px 0 0', marginLeft: 0, borderRadius: '50%', background: hi ? a : palette.bg, border: `5px solid ${lit ? a : palette.muted}`, boxSizing: 'border-box', flex: 'none', transform: `scale(${hi ? 1.25 : 1})`, position: 'relative', left: 0, marginRight: 40 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: wfs, fontWeight: hi ? 800 : 600, color: hi ? a : palette.ink, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{r.what}</div>
            {r.note && <div style={{ fontSize: fsW * 0.62, fontWeight: 500, color: palette.muted, marginTop: 4, wordBreak: 'keep-all' }}>{r.note}</div>}
          </div>
        </div>;
      })}
    </div>
  </AbsoluteFill>;
};

export const DataList: React.FC<PartProps<'data.list'>> = ({ data, dur, scene }) => {
  const { palette, sans, serif } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), items = data.items.slice(0, 40), n = items.length;
  const cols = portrait ? (n <= 9 ? 1 : n <= 22 ? 2 : 3) : (n <= 8 ? 1 : n <= 20 ? 2 : 3), rowsN = Math.ceil(n / cols);
  const bandX = portrait ? PAD : W * 0.4, bandW = W - bandX - PAD, bandTop = portrait ? H * 0.27 : H * 0.08, bandH = portrait ? H * 0.66 : H * 0.84;
  const colW = bandW / cols, lh = portrait ? (cols === 1 ? 92 : cols === 2 ? 78 : 70) : (cols === 1 ? 92 : cols === 2 ? 84 : 76), fs = Math.min(lh * 0.62, fitFont('가가가가', 80, colW - 20, 1.0) * (cols === 3 ? 1.0 : 1));
  const contentH = rowsN * lh, fits = contentH <= bandH * 0.92;
  const start = bandTop + bandH * 0.95, end = fits ? bandTop + (bandH - contentH) / 2 : bandTop + bandH * 0.55 - contentH + lh;
  const sT = clamp((f - 4) / Math.max(1, dur - 30), 0, 1), e = fits ? easeInOut(clamp((f - 4) / 46, 0, 1)) : sT, y = start + (end - start) * e + (fits ? -clamp((f - 50) / dur, 0, 1) * 30 : 0);
  const mask = `linear-gradient(to bottom, transparent ${(bandTop / H) * 100 - 0}%, #000 ${(bandTop / H) * 100 + 7}%, #000 ${((bandTop + bandH) / H) * 100 - 7}%, transparent ${((bandTop + bandH) / H) * 100}%)`;
  const ts = Math.min(portrait ? 82 : 90, fitFont(data.title ?? '', 100, portrait ? W - PAD * 2 : W * 0.4 - PAD * 1.4, 1.04));
  return <AbsoluteFill style={{ background: palette.bg }}>
    <Bug scene={scene} />
    <div style={{ position: 'absolute', left: PAD, width: portrait ? W - PAD * 2 : W * 0.4 - PAD * 1.4, ...(portrait ? { top: H * 0.12 } : { top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }) }}>
      <div style={{ width: 70, height: 8, background: a, marginBottom: 22, transformOrigin: 'left', transform: `scaleX(${glide(f, 0, 16)})` }} />
      {data.title && <Rise delay={4} dur={22}><div style={{ fontFamily: serif, fontWeight: 800, fontSize: ts, color: palette.ink, lineHeight: 1.2, wordBreak: 'keep-all' }}>{data.title}</div></Rise>}
      {data.sub && <div style={{ marginTop: 16, fontFamily: sans, fontSize: portrait ? 34 : 32, fontWeight: 500, color: palette.muted, opacity: glide(f, 16, 14) }}>{data.sub}</div>}
    </div>
    <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask }}>
      <div style={{ position: 'absolute', left: bandX, top: y, width: bandW, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gridTemplateRows: `repeat(${rowsN}, ${lh}px)` }}>
        {items.map((nm, i) => <div key={i} style={{ height: lh, display: 'flex', alignItems: 'center', fontFamily: sans, fontSize: fs, fontWeight: 600, color: palette.ink, whiteSpace: 'nowrap', overflow: 'hidden', paddingRight: 16 }}>{nm}</div>)}
      </div>
    </div>
  </AbsoluteFill>;
};
