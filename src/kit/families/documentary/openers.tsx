import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { accentOf } from '../../context';
import { LivePhoto, fitFont, glide, useLayout, wob } from '../../motion';
import type { PartProps } from '../../schema.ts';
import { Bug, DarkBase, Montage, BottomScrim, Rise, SCRIM, Tag, useDoc } from './common';

const lines = (t: string) => t.split('\n');

/** 표지 글 블록: 태그 + 세리프 제목 + 부제 + 정보 줄 */
export const TitleBlock: React.FC<{ kicker?: string; title: string; sub?: string; chips?: string[]; accent: string; bottom: number; maxW: number; size: number }> = ({ kicker, title, sub, chips, accent, bottom, maxW, size }) => {
  const f = useCurrentFrame(), { palette, serif, sans } = useDoc(), { PAD, portrait } = useLayout(), ls = lines(title).slice(0, 2), longest = Math.max(...ls.map((l) => Array.from(l).length), 1), fs = Math.min(size, fitFont('가'.repeat(longest), size, maxW, 1.02));
  return <div style={{ position: 'absolute', left: PAD, bottom, width: maxW, transform: `translateY(${wob(f, 1, 4)}px)`, zIndex: 15 }}>
    {kicker && <div style={{ marginBottom: fs * 0.28 }}><Tag text={kicker} accent={accent} size={Math.max(22, fs * 0.3)} delay={6} /></div>}
    {ls.map((l, i) => <Rise key={i} delay={10 + i * 6} dur={22}><div style={{ fontFamily: serif, fontWeight: 800, fontSize: fs, lineHeight: 1.14, color: palette.ink, wordBreak: 'keep-all', textShadow: `0 2px 24px ${SCRIM}0.45)` }}>{l}</div></Rise>)}
    {sub && <div style={{ marginTop: fs * 0.3, fontFamily: sans, fontSize: Math.max(26, fs * 0.36), fontWeight: 500, color: palette.ink, opacity: 0.9 * glide(f, 30, 18), wordBreak: 'keep-all', lineHeight: 1.3, textShadow: `0 1px 12px ${SCRIM}0.6)` }}>{sub}</div>}
    {chips && chips.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${fs * 0.1}px ${fs * 0.42}px`, marginTop: fs * 0.34, fontFamily: sans, fontWeight: 700, fontSize: Math.max(22, fs * 0.3), color: palette.ink, opacity: glide(f, 38, 16), fontVariantNumeric: 'tabular-nums', textShadow: `0 1px 8px ${SCRIM}0.6)` }}>
      {chips.slice(0, 4).map((c, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: fs * 0.42 }}>{i > 0 && <span style={{ width: 2, height: fs * 0.3, background: accent }} />}{c}</span>)}
    </div>}
  </div>;
};

export const SectionTitle: React.FC<PartProps<'section.title'>> = ({ data, photos, dur, scene }) => {
  const { palette, serif, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, scene.section), ls = lines(data.title).slice(0, 2);
  const mw = portrait ? W - PAD * 2 : W * 0.62, fs = Math.min(portrait ? 104 : 120, fitFont('가'.repeat(Math.max(...ls.map((l) => Array.from(l).length), 1)), 200, mw, 1.02)), total = Math.max(1, Math.min(data.total, 12));
  const exit = 1 - Math.max(0, (f - (dur - 8)) / 8);
  return <AbsoluteFill style={{ background: palette.bg, opacity: exit }}>
    {photos[0] ? <><LivePhoto ph={photos[0]} dur={dur} strength={0.8} /><AbsoluteFill style={{ background: `${SCRIM}0.68)` }} /></> : <div style={{ position: 'absolute', inset: 0, background: palette.surface }} />}
    <Bug scene={scene} />
    <div style={{ position: 'absolute', left: PAD, bottom: portrait ? H * 0.2 : H * 0.17, width: mw + PAD, transform: `translateY(${wob(f, 3, 4)}px)` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: fs * 0.2, fontFamily: sans, color: palette.ink, opacity: glide(f, 4, 14) }}>
        <span style={{ fontSize: fs * 0.3, fontWeight: 600, letterSpacing: 1 }}>제</span>
        <span style={{ fontFamily: serif, fontSize: fs * 1.15, fontWeight: 800, color: a, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{data.index}</span>
        <span style={{ fontSize: fs * 0.3, fontWeight: 600 }}>장</span>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: `${fs * 0.22}px 0 ${fs * 0.26}px`, width: Math.min(mw, total * 64) }}>{Array.from({ length: total }, (_, i) => <div key={i} style={{ flex: 1, height: 6, background: i < data.index ? a : 'rgba(255,255,255,0.28)', transformOrigin: 'left', transform: `scaleX(${glide(f, 8 + i * 3, 12)})` }} />)}</div>
      {ls.map((l, i) => <Rise key={i} delay={12 + i * 6} dur={22}><div style={{ fontFamily: serif, fontWeight: 800, fontSize: fs, lineHeight: 1.15, color: palette.ink, wordBreak: 'keep-all' }}>{l}</div></Rise>)}
      {data.sub && <div style={{ marginTop: fs * 0.22, fontFamily: sans, fontSize: Math.max(26, fs * 0.34), fontWeight: 600, color: palette.ink, opacity: glide(f, 30, 16), wordBreak: 'keep-all' }}>{data.sub}</div>}
    </div>
  </AbsoluteFill>;
};

export const OutroThanks: React.FC<PartProps<'outro.thanks'>> = ({ data, photos, dur, scene }) => {
  const { palette, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, Math.max(0, scene.section)), fade = Math.min(1, Math.max(0, (dur - f) / 22));
  const block = <TitleBlock title={data.title} sub={data.message} chips={data.chips} accent={a} bottom={portrait ? H * 0.17 : H * 0.12} maxW={portrait ? W - PAD * 2 : W * 0.66} size={portrait ? 96 : 108} />;
  return <AbsoluteFill style={{ background: palette.bg }}>
    {photos.length ? <><Montage photos={photos.slice(0, 3)} dur={dur} strength={0.8} /><BottomScrim strength={0.85} h={0.8} /><AbsoluteFill style={{ background: `${SCRIM}${0.18 + 0.2 * glide(f, 0, 40)})` }} /><Bug scene={scene} />{block}</> : <DarkBase accent={a}><Bug scene={scene} />{block}</DarkBase>}
    <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: `${(1 - Math.max(0, f / dur)) * 100}%`, background: a }} />
    <AbsoluteFill style={{ background: palette.bg, opacity: 1 - fade, zIndex: 30 }} />
  </AbsoluteFill>;
};
