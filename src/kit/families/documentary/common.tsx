import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { accentOf, useKit } from '../../context';
import { LivePhoto, easeInOut, glide, prog, useLayout, wob } from '../../motion';
import type { KPhoto, SceneInfo } from '../../schema.ts';

export const SCRIM = 'rgba(0,0,0,';
export const useDoc = () => { const { palette, fonts } = useKit(); return { palette, fonts, serif: fonts.display, sans: fonts.body }; };

/** 줄 단위 마스크 상승 등장 */
export const Rise: React.FC<{ delay?: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, dur = 18, children, style }) => {
  const f = useCurrentFrame(), t = glide(f, delay, dur);
  return <div style={{ overflow: 'hidden', paddingBottom: '0.12em', marginBottom: '-0.12em', ...style }}><div style={{ transform: `translateY(${(1 - t) * 105}%)`, opacity: Math.min(1, t * 2.5) }}>{children}</div></div>;
};

/** 채널 로고처럼 작은 브랜드 표시 */
export const Bug: React.FC<{ scene: SceneInfo; right?: boolean }> = ({ scene }) => {
  const f = useCurrentFrame(), { palette, sans } = useDoc(), { PAD, W } = useLayout(), a = accentOf(palette, scene.section), s = W * 0.0125;
  if (!scene.brand) return null;
  return <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, display: 'flex', alignItems: 'center', gap: s, opacity: glide(f, 8, 14) * 0.92, fontFamily: sans, zIndex: 20 }}>
    <div style={{ width: s * 0.9, height: s * 2.4, background: a }} />
    <div style={{ fontSize: Math.max(20, W * 0.0125), fontWeight: 700, color: palette.ink, letterSpacing: 0.5, textShadow: `0 1px 8px ${SCRIM}0.55)` }}>{scene.brand}</div>
  </div>;
};

export const BottomScrim: React.FC<{ strength?: number; h?: number }> = ({ strength = 0.7, h = 0.55 }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${h * 100}%`, background: `linear-gradient(to top, ${SCRIM}${strength}) 0%, ${SCRIM}${strength * 0.55}) 45%, ${SCRIM}0) 100%)` }} />
);

/** 현장 시각 스탬프: 점 + 시각. 모노 글꼴이 아닌 산세리프 */
export const Stamp: React.FC<{ time?: string; date?: string; size: number; accent: string; delay?: number }> = ({ time, date, size, accent, delay = 0 }) => {
  const f = useCurrentFrame(), { palette, sans } = useDoc();
  if (!time && !date) return null;
  const blink = 0.55 + 0.45 * Math.sin(f / 9);
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.42, fontFamily: sans, fontWeight: 700, fontSize: size, color: palette.ink, opacity: glide(f, delay, 12), fontVariantNumeric: 'tabular-nums', textShadow: `0 1px 8px ${SCRIM}0.6)` }}>
    <span style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: accent, opacity: blink }} />
    {time && <span>{time}</span>}{date && <span style={{ fontWeight: 500, opacity: 0.8 }}>{date}</span>}
  </div>;
};

/** 하단 자막(로어서드). 세로에서는 하단 UI를 피해 더 높이 앉는다 */
export const LowerThird: React.FC<{ caption?: string; sub?: string; time?: string; date?: string; accent: string; delay?: number; maxW?: number; left?: number; bottom?: number; scale?: number }> = ({ caption, sub, time, date, accent, delay = 10, maxW, left, bottom, scale = 1 }) => {
  const f = useCurrentFrame(), { palette, sans } = useDoc(), { W, H, portrait, PAD } = useLayout();
  const mw = maxW ?? (portrait ? W - PAD * 2 : W * 0.62), cs = (portrait ? 56 : 52) * scale, fs = Math.min(cs, (mw / Math.max(Array.from(caption ?? '').length, 1)) * 0.98), bar = glide(f, delay, 16), t = glide(f, delay + 4, 20);
  if (!caption && !sub && !time) return null;
  return <div style={{ position: 'absolute', left: left ?? PAD, bottom: bottom ?? (portrait ? H * 0.17 : H * 0.12), width: mw, display: 'flex', gap: cs * 0.34, fontFamily: sans, transform: `translateY(${wob(f, 2, 3)}px)`, zIndex: 15 }}>
    <div style={{ width: Math.max(5, cs * 0.1), background: accent, transform: `scaleY(${bar})`, transformOrigin: 'bottom' }} />
    <div style={{ flex: 1, minWidth: 0, transform: `translateX(${(1 - t) * -26}px)`, opacity: t }}>
      {(time || date) && <div style={{ marginBottom: cs * 0.2 }}><Stamp time={time} date={date} size={cs * 0.56} accent={accent} delay={delay + 4} /></div>}
      {caption && <div style={{ fontSize: fs, fontWeight: 700, color: palette.ink, lineHeight: 1.18, wordBreak: 'keep-all', textShadow: `0 2px 14px ${SCRIM}0.55)` }}>{caption}</div>}
      {sub && <div style={{ fontSize: cs * 0.5, fontWeight: 500, color: palette.ink, opacity: 0.82, marginTop: cs * 0.12, lineHeight: 1.3, wordBreak: 'keep-all', textShadow: `0 1px 10px ${SCRIM}0.6)` }}>{sub}</div>}
    </div>
  </div>;
};

/** 사진을 순서대로 컷/와이프로 바꿔 보여 주는 몽타주(배경용) */
export const Montage: React.FC<{ photos: KPhoto[]; dur: number; dim?: number; strength?: number }> = ({ photos, dur, dim = 0, strength = 1 }) => {
  const n = photos.length, slice = Math.ceil(dur / Math.max(n, 1)) + (n > 1 ? 4 : 0), step = dur / Math.max(n, 1);
  return <AbsoluteFill>{photos.map((p, i) => <Sequence key={i} from={Math.round(i * step)} durationInFrames={dur}><Reveal first={i === 0}><LivePhoto ph={p} dur={i === 0 ? Math.max(slice * 1.4, 60) : slice * 1.4} dir={i % 2 ? -1 : 1} strength={strength} /></Reveal></Sequence>)}
    {dim > 0 && <AbsoluteFill style={{ background: `${SCRIM}${dim})` }} />}</AbsoluteFill>;
};
const Reveal: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame(), t = first ? 1 : prog(f, 0, 16, easeInOut);
  return <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - t) * 100}% 0 0)` }}>{children}</AbsoluteFill>;
};

/** 사진 한 칸: 프레임 안을 채우고 등장 때 한쪽에서 걷힌다 */
export const Cell: React.FC<{ ph: KPhoto; dur: number; x: number; y: number; w: number; h: number; delay?: number; dir?: 1 | -1; from?: 'l' | 'r' | 't' | 'b'; caption?: boolean; accent: string; fs: number; strength?: number }> = ({ ph, dur, x, y, w, h, delay = 0, dir = 1, from = 'l', caption = true, accent, fs, strength = 1 }) => {
  const f = useCurrentFrame(), sans = useKit().fonts.body, t = glide(f, delay, 20), inset = from === 'l' ? `0 ${(1 - t) * 100}% 0 0` : from === 'r' ? `0 0 0 ${(1 - t) * 100}%` : from === 't' ? `0 0 ${(1 - t) * 100}% 0` : `${(1 - t) * 100}% 0 0 0`;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', clipPath: `inset(${inset})` }}>
    <LivePhoto ph={ph} dur={dur} dir={dir} strength={strength} />
    {caption && (ph.caption || ph.time) && <><BottomScrim strength={0.62} h={0.5} /><div style={{ position: 'absolute', left: fs * 0.7, right: fs * 0.7, bottom: fs * 0.6, opacity: glide(f, delay + 14, 14) }}>
      {ph.time && <div style={{ marginBottom: fs * 0.12 }}><Stamp time={ph.time} size={fs * 0.62} accent={accent} delay={delay + 14} /></div>}
      {ph.caption && <div style={{ fontFamily: sans, fontWeight: 700, fontSize: fs, color: '#fff', lineHeight: 1.2, wordBreak: 'keep-all', textShadow: `0 1px 10px ${SCRIM}0.6)` }}>{ph.caption}</div>}
    </div></>}
  </div>;
};

/** 태그(라벨) */
export const Tag: React.FC<{ text: string; accent: string; size: number; delay?: number; style?: React.CSSProperties }> = ({ text, accent, size, delay = 0, style }) => {
  const f = useCurrentFrame(), { palette, sans } = useDoc(), t = glide(f, delay, 14);
  return <div style={{ display: 'inline-block', background: accent, color: palette.onAccent, fontFamily: sans, fontWeight: 800, fontSize: size, padding: `${size * 0.26}px ${size * 0.62}px`, opacity: t, transform: `translateY(${(1 - t) * 10}px)`, letterSpacing: 0.3, ...style }}>{text}</div>;
};

/** 어두운 바탕 + 아주 느린 면 이동(사진이 없는 장면용, 장식이 아닌 구도 요소) */
export const DarkBase: React.FC<{ children: React.ReactNode; accent: string }> = ({ children, accent }) => {
  const f = useCurrentFrame(), { palette } = useDoc(), { W, H } = useLayout();
  return <AbsoluteFill style={{ background: palette.bg }}>
    <div style={{ position: 'absolute', right: 0, top: 0, width: W * 0.34, height: H, background: palette.surface, transform: `translateX(${wob(f, 5, 14)}px)` }} />
    <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: '100%', background: accent, transformOrigin: 'left', transform: `scaleX(${glide(f, 0, 24)})` }} />
    {children}
  </AbsoluteFill>;
};

/** 진행 타임코드 HH:MM:SS:FF (프레임에서 계산) */
export const Timecode: React.FC<{ size: number; start?: number; accent?: string }> = ({ size, start = 0, accent }) => {
  const f = useCurrentFrame() + start, { palette, sans } = useDoc(), p = (n: number) => String(n).padStart(2, '0');
  return <span style={{ fontFamily: sans, fontWeight: 600, fontSize: size, color: palette.ink, letterSpacing: size * 0.12, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: size * 0.5 }}>
    {accent && <span style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: accent, opacity: f % 30 < 18 ? 1 : 0.25 }} />}
    {`00:${p(Math.floor(f / 1800) % 60)}:${p(Math.floor(f / 30) % 60)}:${p(f % 30)}`}
  </span>;
};
