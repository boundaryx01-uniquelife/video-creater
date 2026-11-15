import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { accentOf } from '../../context';
import { LivePhoto, easeInOut, fitFont, glide, prog, useLayout, wob } from '../../motion';
import type { KPhoto, PartProps } from '../../schema.ts';
import { BottomScrim, Bug, Rise, SCRIM, Timecode, useDoc } from './common';
import { TitleBlock } from './openers';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 뷰파인더 모서리 표시 */
const Corners: React.FC<{ x0: number; y0: number; x1: number; y1: number; s: number; o: number }> = ({ x0, y0, x1, y1, s, o }) => {
  const c = `rgba(255,255,255,${0.55 * o})`, t = 2, mk = (l: number, tp: number, dx: number, dy: number, i: number) => <React.Fragment key={i}>
    <div style={{ position: 'absolute', left: dx > 0 ? l : l - s, top: tp, width: s, height: t, background: c }} />
    <div style={{ position: 'absolute', left: l, top: dy > 0 ? tp : tp - s, width: t, height: s, background: c, marginLeft: dx > 0 ? 0 : -t }} />
  </React.Fragment>;
  return <>{mk(x0, y0, 1, 1, 0)}{mk(x1, y0, -1, 1, 1)}{mk(x0, y1, 1, -1, 2)}{mk(x1, y1, -1, -1, 3)}</>;
};

/** 다큐 콜드 오픈 표지: 시네마스코프 바가 열리며 사진이 천천히 밀고 들어오고, 슬레이트·타임코드 위에 자간이 모이는 제목 카드가 뜬다 */
export const OpenerTitle: React.FC<PartProps<'opener.title'>> = ({ data, photos, dur, scene }) => {
  const { palette, serif, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, Math.max(0, scene.section));
  const ph = photos.slice(0, 3), n = ph.length, s = n ? dur / n : dur, bar = Math.round(H * (portrait ? 0.09 : 0.105));
  const open = glide(f, 2, 26), barH = bar + (H / 2 - bar) * (1 - open);
  const ls = data.title.split('\n').slice(0, 2), longest = Math.max(...ls.map((l) => Array.from(l).length), 1), tsp = 0.12 + 0.22 * (1 - glide(f, 26, 56));
  const fs = Math.min(portrait ? 104 : 124, fitFont('가'.repeat(longest), 200, W - PAD * 2, 1.02 + 0.34));
  const chips = (data.chips ?? []).slice(0, 4), chipFs = Math.min(portrait ? 30 : 28, fitFont(chips.join('     '), 40, W - PAD * 2, 0.95));
  const slate = Math.max(20, Math.round(W * (portrait ? 0.026 : 0.0135)));
  return <AbsoluteFill style={{ background: '#000' }}>
    {n ? ph.map((p, i) => <Sequence key={i} from={Math.round(i * s)} durationInFrames={Math.ceil(s) + 8} layout="none"><CutLayer ph={p} dur={Math.ceil(s) * 1.3 + 30} i={i} /></Sequence>)
      : <div style={{ position: 'absolute', inset: 0, background: palette.bg }}><div style={{ position: 'absolute', left: W * 0.14, right: W * 0.14, top: H * 0.2, bottom: H * 0.2, border: `2px solid ${palette.muted}`, opacity: 0.35, transform: `scale(${1 + 0.03 * (f / dur)})` }} /></div>}
    <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${SCRIM}0.45) 0%, ${SCRIM}0.12) 30%, ${SCRIM}0.22) 55%, ${SCRIM}0.66) 100%)`, opacity: n ? 1 : 0 }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, ${SCRIM}0.42) 0%, ${SCRIM}0) 62%)`, opacity: n ? glide(f, 24, 24) : 0 }} />
    <Corners x0={PAD * 0.8} y0={bar + PAD * 0.35} x1={W - PAD * 0.8} y1={H - bar - PAD * 0.35} s={Math.max(22, W * 0.016)} o={glide(f, 20, 20)} />
    {/* 제목 카드 */}
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: H * (portrait ? 0.5 : 0.5), transform: `translateY(-50%) translateY(${wob(f, 1, 3)}px)`, textAlign: 'center', zIndex: 12 }}>
      <div style={{ width: Math.min(W * 0.14, 190) * glide(f, 22, 22), height: 3, background: a, margin: `0 auto ${fs * 0.34}px` }} />
      {ls.map((l, i) => <Rise key={i} delay={26 + i * 7} dur={24}><div style={{ fontFamily: serif, fontWeight: 800, fontSize: fs, lineHeight: 1.18, color: palette.ink, letterSpacing: `${tsp}em`, marginRight: `${-tsp}em`, wordBreak: 'keep-all', textShadow: `0 2px 26px ${SCRIM}0.6)` }}>{l}</div></Rise>)}
      {data.sub && <div style={{ marginTop: fs * 0.34, fontFamily: sans, fontSize: Math.max(26, fs * 0.28), fontWeight: 500, letterSpacing: '0.16em', color: palette.ink, opacity: 0.92 * glide(f, 52, 20), wordBreak: 'keep-all', textShadow: `0 1px 12px ${SCRIM}0.7)` }}>{data.sub}</div>}
    </div>
    {/* 시네마스코프 바 + 슬레이트 */}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: barH, background: '#000', zIndex: 20 }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: barH, background: '#000', zIndex: 20 }} />
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: 0, height: bar, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: sans, zIndex: 21, opacity: glide(f, 4, 14) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: slate * 0.6, fontSize: slate, fontWeight: 700, letterSpacing: '0.2em', color: palette.ink, minWidth: 0 }}>
        <span style={{ width: slate * 0.5, height: slate * 0.5, background: a, borderRadius: '50%', opacity: f % 30 < 20 ? 1 : 0.2 }} />{data.kicker ?? 'REC'}
      </div>
      <Timecode size={slate} start={0} />
    </div>
    <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: 0, height: bar, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: slate * 0.35, fontFamily: sans, color: palette.ink, zIndex: 21 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: chipFs * 0.9, fontWeight: 600, fontSize: chipFs, letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums', opacity: glide(f, 44, 18) }}>
        {chips.map((c, i) => <React.Fragment key={i}>{i > 0 && <span style={{ width: 2, height: chipFs * 0.9, background: a }} />}<span>{c}</span></React.Fragment>)}
      </div>
      {scene.brand && <div style={{ fontSize: Math.max(18, slate * 0.8), fontWeight: 600, letterSpacing: '0.18em', color: palette.muted, opacity: glide(f, 8, 14) }}>{scene.brand}</div>}
    </div>
    <div style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${(f / dur) * 100}%`, background: a, zIndex: 22 }} />
  </AbsoluteFill>;
};

/** 사진 한 컷: 느린 푸시인 + 앞 컷과 짧은 디졸브 */
const CutLayer: React.FC<{ ph: KPhoto; dur: number; i: number }> = ({ ph, dur, i }) => {
  const f = useCurrentFrame(), t = i ? glide(f, 0, 8) : glide(f, 0, 24);
  return <AbsoluteFill style={{ opacity: t }}><LivePhoto ph={ph} dur={dur} strength={1.7} dir={i % 2 ? -1 : 1} /></AbsoluteFill>;
};

/** 다큐 오프닝 몽타주: 사진이 빠르게 컷으로 지나가고(번호·장면 라벨), 마지막 한 장 위에 제목이 앉는다 */
export const OpenerCollage: React.FC<PartProps<'opener.collage'>> = ({ data, photos, dur, scene }) => {
  const { palette, serif, sans } = useDoc(), { W, H, portrait, PAD } = useLayout(), f = useCurrentFrame(), a = accentOf(palette, Math.max(0, scene.section));
  const ph = photos.slice(0, 6), n = ph.length, T0 = Math.round(dur * 0.5), c = n > 1 ? Math.floor(T0 / (n - 1)) : 0, cur = n > 1 ? Math.min(n - 1, Math.floor(f / c)) : 0;
  const montage = n > 1 && f < T0, fs = Math.round(W * (portrait ? 0.034 : 0.02));
  return <AbsoluteFill style={{ background: '#000' }}>
    {ph.map((p, i) => {
      const last = i === n - 1;
      return <Sequence key={i} from={i * c} durationInFrames={last ? Math.max(1, dur - i * c) : c + 1} layout="none"><Cut ph={p} i={i} dur={last ? dur - i * c : c} last={last} /></Sequence>;
    })}
    {/* 몽타주 라벨: 번호 + 장면 설명 */}
    {montage && <div key={cur} style={{ position: 'absolute', left: PAD, bottom: portrait ? H * 0.16 : H * 0.12, display: 'flex', alignItems: 'flex-end', gap: fs * 0.7, zIndex: 15, fontFamily: sans, color: palette.ink, textShadow: `0 2px 16px ${SCRIM}0.7)` }}>
      <Sequence from={cur * c} layout="none"><Numeral i={cur} n={n} a={a} serif={serif} size={fs * 4.2} /></Sequence>
      <div style={{ paddingBottom: fs * 0.5 }}>
        {(ph[cur].time || ph[cur].date) && <div style={{ fontSize: fs * 0.8, fontWeight: 600, letterSpacing: '0.1em', opacity: 0.9, fontVariantNumeric: 'tabular-nums' }}>{[ph[cur].date, ph[cur].time].filter(Boolean).join('  ')}</div>}
        {ph[cur].caption && <div style={{ fontSize: fs * 1.5, fontWeight: 700, marginTop: fs * 0.15, wordBreak: 'keep-all' }}>{ph[cur].caption}</div>}
      </div>
    </div>}
    {/* 필름 인덱스: 컷 수만큼 칸 */}
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: portrait ? PAD * 0.55 + 56 : PAD * 0.7 + 50, display: 'flex', gap: 8, zIndex: 16 }}>
      {ph.map((_, i) => <div key={i} style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.28)' }}><div style={{ width: i < cur ? '100%' : i === cur ? `${Math.min(1, (f - i * c) / Math.max(1, i === n - 1 ? 10 : c)) * 100}%` : '0%', height: '100%', background: a }} /></div>)}
    </div>
    <Bug scene={scene} />
    {/* 제목: 마지막 컷 위 */}
    <Sequence from={n > 1 ? T0 : 0} layout="none"><TitleStage data={data} a={a} portrait={portrait} W={W} H={H} PAD={PAD} /></Sequence>
  </AbsoluteFill>;
};

const Numeral: React.FC<{ i: number; n: number; a: string; serif: string; size: number }> = ({ i, n, a, serif, size }) => {
  const f = useCurrentFrame();
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.1, opacity: glide(f, 0, 5), transform: `translateY(${(1 - glide(f, 0, 7)) * 14}px)` }}>
    <span style={{ fontFamily: serif, fontWeight: 800, fontSize: size, lineHeight: 0.9, color: a, fontVariantNumeric: 'tabular-nums' }}>{pad2(i + 1)}</span>
    <span style={{ fontSize: size * 0.22, fontWeight: 600, opacity: 0.8 }}>/ {pad2(n)}</span>
  </div>;
};

/** 컷 하나: 펀치인(확대에서 안착) + 흰 섬광 한두 프레임 */
const Cut: React.FC<{ ph: KPhoto; i: number; dur: number; last: boolean }> = ({ ph, i, dur, last }) => {
  const f = useCurrentFrame(), punch = 1 + 0.09 * Math.pow(1 - prog(f, 0, 9, easeInOut), 2);
  return <AbsoluteFill>
    <AbsoluteFill style={{ transform: `scale(${punch})` }}><LivePhoto ph={ph} dur={last ? dur * 1.15 : dur * 1.8} strength={last ? 1.6 : 1.3} dir={i % 2 ? -1 : 1} /></AbsoluteFill>
    {i > 0 && <AbsoluteFill style={{ background: '#fff', opacity: Math.max(0, 0.5 - f * 0.12) }} />}
  </AbsoluteFill>;
};

const TitleStage: React.FC<{ data: PartProps<'opener.collage'>['data']; a: string; portrait: boolean; W: number; H: number; PAD: number }> = ({ data, a, portrait, W, H, PAD }) => {
  const f = useCurrentFrame();
  return <>
    <div style={{ position: 'absolute', inset: 0, opacity: glide(f, 0, 14) }}><BottomScrim strength={0.88} h={portrait ? 0.7 : 0.85} /><AbsoluteFill style={{ background: `${SCRIM}0.2)` }} /></div>
    <TitleBlock kicker={data.kicker} title={data.title} sub={data.sub} accent={a} bottom={portrait ? H * 0.15 : H * 0.12} maxW={portrait ? W - PAD * 2 : W * 0.7} size={portrait ? 108 : 124} />
  </>;
};
