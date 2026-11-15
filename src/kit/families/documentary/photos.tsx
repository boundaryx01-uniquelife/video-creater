import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { accentOf } from '../../context';
import { LivePhoto, easeInOut, fitFont, glide, prog, useLayout, wob } from '../../motion';
import type { PartProps } from '../../schema.ts';
import { BottomScrim, Bug, Cell, LowerThird, Rise, SCRIM, Stamp, Tag, useDoc } from './common';

export const PhotoFull: React.FC<PartProps<'photo.full'>> = ({ data, photos, dur, scene }) => {
  const { palette } = useDoc(), a = accentOf(palette, scene.section), ph = photos[0];
  return <AbsoluteFill style={{ background: palette.bg }}>
    {ph && <LivePhoto ph={ph} dur={dur} />}
    <BottomScrim strength={0.72} h={0.5} />
    <Bug scene={scene} />
    <LowerThird caption={data.caption ?? ph?.caption} sub={data.sub} time={data.chip ?? ph?.time} date={ph?.date} accent={a} />
  </AbsoluteFill>;
};

export const PhotoSide: React.FC<PartProps<'photo.side'>> = ({ data, photos, dur, scene }) => {
  const { palette, serif, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), ph = photos[0];
  const pw = portrait ? W : W * 0.62, ph_h = portrait ? H * 0.56 : H, t = glide(f, 0, 22);
  const tw = portrait ? W - PAD * 2 : W - pw - PAD * 1.6, cap = data.caption ?? ph?.caption ?? '', lines = Math.max(1, Math.ceil(Array.from(cap).length / (portrait ? 9 : 7)));
  const fs = Math.min(portrait ? 84 : 76, fitFont('가'.repeat(Math.max(4, Math.ceil(Array.from(cap).length / lines))), 100, tw, 1.04));
  return <AbsoluteFill style={{ background: palette.bg }}>
    <div style={{ position: 'absolute', left: portrait ? 0 : W - pw, top: 0, width: pw, height: ph_h, overflow: 'hidden', clipPath: portrait ? `inset(0 0 ${(1 - t) * 100}% 0)` : `inset(0 0 0 ${(1 - t) * 100}%)` }}>{ph && <LivePhoto ph={ph} dur={dur} />}</div>
    <Bug scene={scene} />
    <div style={{ position: 'absolute', left: PAD, width: tw, ...(portrait ? { top: ph_h + H * 0.05 } : { top: 0, bottom: H * 0.1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }), transform: `translateY(${wob(f, 4, 3)}px)` }}>
      <div style={{ width: 70, height: 8, background: a, transformOrigin: 'left', transform: `scaleX(${glide(f, 6, 16)})`, marginBottom: fs * 0.36 }} />
      {(data.chip ?? ph?.time) && <div style={{ marginBottom: fs * 0.22 }}><Stamp time={data.chip ?? ph?.time} date={ph?.date} size={Math.max(24, fs * 0.36)} accent={a} delay={8} /></div>}
      <Rise delay={10} dur={22}><div style={{ fontFamily: serif, fontWeight: 800, fontSize: fs, lineHeight: 1.2, color: palette.ink, wordBreak: 'keep-all' }}>{cap}</div></Rise>
      {data.sub && <div style={{ marginTop: fs * 0.3, fontFamily: sans, fontSize: Math.max(26, fs * 0.38), color: palette.muted, fontWeight: 500, lineHeight: 1.35, wordBreak: 'keep-all', opacity: glide(f, 24, 16) }}>{data.sub}</div>}
    </div>
  </AbsoluteFill>;
};

export const Label: React.FC<{ text?: string; a: string }> = ({ text, a }) => { const { PAD, portrait, W } = useLayout(); return text ? <div style={{ position: 'absolute', left: PAD, top: PAD * (portrait ? 1.7 : 1.5), zIndex: 20 }}><Tag text={text} accent={a} size={Math.max(24, W * 0.016)} delay={10} /></div> : null; };

export const PhotoPair: React.FC<PartProps<'photo.pair'>> = ({ data, photos, dur, scene }) => {
  const { palette } = useDoc(), { W, H, portrait } = useLayout(), a = accentOf(palette, scene.section), g = 6, fs = portrait ? 38 : 34;
  return <AbsoluteFill style={{ background: palette.bg }}>
    {photos.slice(0, 2).map((p, i) => portrait
      ? <Cell key={i} ph={p} dur={dur} x={0} y={i * (H / 2 + g / 2)} w={W} h={H / 2 - g / 2} delay={i * 8} dir={i ? -1 : 1} from="l" accent={a} fs={fs} />
      : <Cell key={i} ph={p} dur={dur} x={i * (W / 2 + g / 2)} y={0} w={W / 2 - g / 2} h={H} delay={i * 8} dir={i ? -1 : 1} from={i ? 'r' : 'l'} accent={a} fs={fs} />)}
    <Bug scene={scene} /><Label text={data.label} a={a} />
  </AbsoluteFill>;
};

const ease = (t: number) => easeInOut(Math.min(1, Math.max(0, t)));
export const PhotoStrip: React.FC<PartProps<'photo.strip'>> = ({ data, photos, dur, scene }) => {
  const { palette, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), ph = photos.slice(0, 6), n = ph.length, g = 28;
  const pw = portrait ? W - PAD * 2 : Math.round(H * 0.62 * 1.5), phh = portrait ? Math.round((W - PAD * 2) * 0.85) : Math.round(H * 0.62), step = (portrait ? phh : pw) + g;
  const u = Math.max(0, Math.min(1, (f - 6) / Math.max(1, dur - 18))) * (n - 1), k = Math.min(n - 2, Math.floor(u)), fr = u - k, pos = n > 1 ? k + ease((fr - 0.3) / 0.7) : 0, act = Math.round(pos);
  const cx = portrait ? W / 2 : W / 2, cy = portrait ? H * 0.42 : H * 0.42, enter = glide(f, 0, 20);
  const cur = ph[act];
  return <AbsoluteFill style={{ background: palette.bg }}>
    {ph.map((p, i) => {
      const d = i - pos, s = 1 - 0.1 * Math.min(1, Math.abs(d)), x = portrait ? cx - pw / 2 : cx - pw / 2 + d * step, y = portrait ? cy - phh / 2 + d * step : cy - phh / 2;
      return <div key={i} style={{ position: 'absolute', left: x, top: y, width: pw, height: phh, overflow: 'hidden', transform: `scale(${s})`, opacity: (0.45 + 0.55 * (1 - Math.min(1, Math.abs(d)))) * enter }}><LivePhoto ph={p} dur={dur} dir={i % 2 ? -1 : 1} /></div>;
    })}
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: portrait ? H * 0.22 : H * 0.2, background: palette.bg }} />
    <Bug scene={scene} />
    {data.label && <div style={{ position: 'absolute', right: PAD, top: PAD * 0.7, fontFamily: sans, fontWeight: 700, fontSize: Math.max(22, W * 0.013), color: palette.muted, opacity: glide(f, 8, 14) }}>{data.label}</div>}
    {/* 타임라인: 사진마다 눈금, 현재 위치 강조 */}
    <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: portrait ? H * 0.1 : H * 0.075, height: 4, background: 'rgba(255,255,255,0.2)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(n > 1 ? pos / (n - 1) : 1) * 100}%`, background: a }} />
      {ph.map((_, i) => <div key={i} style={{ position: 'absolute', left: `${(n > 1 ? i / (n - 1) : 0) * 100}%`, top: -8, width: 4, height: 20, background: i <= pos + 0.01 ? a : palette.muted, marginLeft: -2 }} />)}
    </div>
    {cur && <div key={act} style={{ position: 'absolute', left: PAD, bottom: portrait ? H * 0.135 : H * 0.115, right: PAD, display: 'flex', alignItems: 'baseline', gap: 20, fontFamily: sans, color: palette.ink, opacity: Math.max(0, 1 - Math.abs(pos - act) * 2.2) }}>
      {cur.time && <Stamp time={cur.time} size={portrait ? 34 : 30} accent={a} />}
      {cur.caption && <span style={{ fontSize: portrait ? 44 : 40, fontWeight: 700, wordBreak: 'keep-all' }}>{cur.caption}</span>}
    </div>}
  </AbsoluteFill>;
};
