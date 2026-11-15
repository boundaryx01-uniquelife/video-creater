import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { accentOf } from '../../context';
import { LivePhoto, fitFont, glide, pop, useLayout, wob, prog, clamp } from '../../motion';
import type { PartProps } from '../../schema.ts';
import { Bug, DarkBase, Rise, SCRIM, Tag, useDoc } from './common';

export const TextStatement: React.FC<PartProps<'text.statement'>> = ({ data, dur, scene }) => {
  const { palette, serif } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), ls = data.lines.slice(0, 3), mw = W - PAD * 2 - (portrait ? 0 : W * 0.04);
  const fs = Math.min(portrait ? 120 : 132, ...ls.map((l) => fitFont(l, 200, mw - 40, 0.9)));
  return <AbsoluteFill style={{ background: palette.bg }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 14, height: H * glide(f, 0, 24), background: a }} />
    <Bug scene={scene} />
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: 0, bottom: H * (portrait ? 0.08 : 0), display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateX(${-f * 0.14}px)` }}>
      {ls.map((l, i) => { const em = i === data.emphasis; return <Rise key={i} delay={8 + i * 9} dur={24}><div style={{ fontFamily: serif, fontWeight: 800, fontSize: fs, lineHeight: 1.22, color: em ? a : palette.ink, opacity: em || data.emphasis === undefined ? 1 : 0.86, wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>{l}</div></Rise>; })}
    </div>
  </AbsoluteFill>;
};

export const TextQuote: React.FC<PartProps<'text.quote'>> = ({ data, photos, dur, scene }) => {
  const { palette, serif, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), ph = photos[0], t = glide(f, 0, 22);
  const hasPh = !!ph, pw = hasPh ? (portrait ? W : W * 0.42) : 0, ph_h = portrait ? H * 0.42 : H;
  const tx = portrait ? PAD : PAD, tw = portrait ? W - PAD * 2 : W - pw - PAD * 1.8 - (hasPh ? 0 : PAD * 1.5);
  const ls = data.text.split('\n'), longest = Math.max(...ls.map((l) => Array.from(l).length), 1), tl = Array.from(data.text.replace(/\n/g, '')).length;
  const fs = Math.min(portrait ? 88 : 72, fitFont('가'.repeat(longest), 120, tw, 0.95), Math.sqrt(((tw * (portrait ? H * 0.36 : H * 0.5)) / Math.max(tl, 1)) / 1.5));
  return <AbsoluteFill style={{ background: palette.bg }}>
    {hasPh && <div style={{ position: 'absolute', left: 0, top: 0, width: pw, height: ph_h, overflow: 'hidden', clipPath: portrait ? `inset(0 0 ${(1 - t) * 100}% 0)` : `inset(0 ${(1 - t) * 100}% 0 0)` }}><LivePhoto ph={ph} dur={dur} /></div>}
    <Bug scene={scene} />
    <div style={{ position: 'absolute', left: (hasPh && !portrait ? pw : 0) + tx, width: tw, ...(portrait ? { top: (hasPh ? ph_h : 0) + H * 0.05 } : { top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }), transform: `translateY(${wob(f, 6, 3)}px)` }}>
      <div style={{ fontFamily: serif, fontWeight: 800, fontSize: fs * 1.8, lineHeight: 0.6, height: fs * 0.7, color: a, opacity: glide(f, 4, 14) }}>“</div>
      {ls.map((l, i) => <Rise key={i} delay={8 + i * 7} dur={22}><div style={{ fontFamily: serif, fontWeight: 700, fontSize: fs, lineHeight: 1.36, color: palette.ink, wordBreak: 'keep-all' }}>{l}</div></Rise>)}
      {(data.who || data.role) && <div style={{ marginTop: fs * 0.5, display: 'flex', gap: 18, fontFamily: sans, opacity: glide(f, 30, 16), transform: `translateX(${(1 - glide(f, 30, 16)) * -20}px)` }}>
        <div style={{ width: 6, background: a }} />
        <div><div style={{ fontSize: Math.max(32, fs * 0.5), fontWeight: 800, color: palette.ink }}>{data.who}</div>{data.role && <div style={{ fontSize: Math.max(24, fs * 0.36), fontWeight: 500, color: palette.muted, marginTop: 4 }}>{data.role}</div>}</div>
      </div>}
    </div>
  </AbsoluteFill>;
};
