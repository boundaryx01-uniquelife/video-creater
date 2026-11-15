import React from 'react';
import { AbsoluteFill } from 'remotion';
import { LivePhoto, glide, life, pop, prog, wob } from '../../motion';
import type { KPhoto, PartProps } from '../../schema.ts';
import { Brand, Paper, Pill, Polaroid, Star, Sticker, alpha, fitLines, lines, pfit, useS } from './kit';

type Slot = [number, number, number, number, number]; // 중심 x·y(비율), 최대 가로·세로, 기울기
const masked = (f: number, i: number, children: React.ReactNode) => <div style={{ overflow: 'hidden', paddingBottom: 6 }}><div style={{ transform: `translateY(${(1 - prog(f, 8 + i * 5, 16)) * 110}%)` }}>{children}</div></div>;
const SLOTS_L: Record<number, Slot[]> = {
  1: [[0.76, 0.5, 740, 640, -4]],
  2: [[0.73, 0.3, 660, 440, -6], [0.82, 0.7, 640, 420, 5]],
  3: [[0.7, 0.26, 600, 400, -7], [0.87, 0.55, 520, 380, 5], [0.66, 0.77, 520, 340, -3]],
};
const SLOTS_P: Record<number, Slot[]> = {
  1: [[0.5, 0.72, 860, 780, -3]],
  2: [[0.33, 0.66, 640, 480, -6], [0.68, 0.84, 600, 440, 5]],
  3: [[0.3, 0.64, 620, 440, -6], [0.7, 0.76, 560, 400, 5], [0.34, 0.89, 520, 320, -3]],
};

/* ---------- opener.title ---------- */
export const OpenerTitle: React.FC<PartProps<'opener.title'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, accOf } = useS(scene), a0 = accOf(0), a1 = accOf(1), a2 = accOf(2);
  const ls = lines(data.title, portrait, 9), tw = portrait ? W - PAD * 2 : W * 0.46, fs = fitLines(ls, portrait ? 200 : 210, tw);
  const hl = prog(f, 26, 20), chips = data.chips ?? [], ph = photos.slice(0, 3), slots = (portrait ? SLOTS_P : SLOTS_L)[ph.length];
  const d = portrait ? W * 0.62 : H * 0.66;
  return (
    <Paper>
      <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 1.7 : 0, bottom: portrait ? undefined : 0, width: tw, display: 'flex', flexDirection: 'column', justifyContent: portrait ? 'flex-start' : 'center', transform: `translateY(${-14 * life(f, dur, 40)}px)` }}>
        {data.kicker && <div style={{ transform: `scale(${pop(f, 4)})`, transformOrigin: 'left center', alignSelf: 'flex-start' }}><Pill text={data.kicker} bg={P.ink} color={P.bg} size={portrait ? 40 : 38} /></div>}
        <div style={{ marginTop: 30, fontFamily: KID, color: P.ink, lineHeight: 1.12, wordBreak: 'keep-all' }}>
          {ls.map((t, i) => masked(f, i, <div style={{ fontSize: fs, whiteSpace: 'nowrap' }}><span style={i === ls.length - 1 ? { backgroundImage: `linear-gradient(transparent 58%, ${alpha(a0, 85)} 58%, ${alpha(a0, 85)} 90%, transparent 90%)`, backgroundRepeat: 'no-repeat', backgroundSize: `${hl * 100}% 100%`, padding: '0 10px', marginLeft: -10 } : undefined}>{t}</span></div>))}
        </div>
        {data.sub && <div style={{ marginTop: 22, fontFamily: BODY, fontWeight: 700, fontSize: portrait ? 46 : 42, color: P.muted, lineHeight: 1.4, opacity: prog(f, 24, 16), wordBreak: 'keep-all' }}>{data.sub}</div>}
        {chips.length > 0 && <div style={{ marginTop: portrait ? 36 : 40, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {chips.map((t, i) => <div key={i} style={{ transform: `translateY(${(1 - pop(f, 34 + i * 4)) * 40}px) rotate(${wob(f, i, 1)}deg)`, opacity: Math.min(1, pop(f, 34 + i * 4) * 2) }}><Pill text={t} bg={[a0, a1, a2][i % 3]} color={P.onAccent} size={portrait ? 34 : 32} /></div>)}
        </div>}
      </div>
      {ph.length === 0 && <div style={{ position: 'absolute', left: portrait ? (W - d) / 2 : W - PAD - d - W * 0.03, top: portrait ? H * 0.52 : (H - d) / 2, width: d, height: d, transform: `scale(${pop(f, 6, 10)}) translateY(${wob(f, 2, 8)}px)` }}>
        <div style={{ position: 'absolute', inset: -d * 0.05, borderRadius: '50%', border: `${Math.max(6, d * 0.012)}px dashed ${alpha(a0, 80)}`, transform: `rotate(${f * 0.6}deg)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: a0 }} />
        <Star size={d * 0.62} color={P.surface} rot={f * 0.7} style={{ left: d * 0.19, top: d * 0.19 }} />
        <Star size={d * 0.26} color={a1} rot={-f * 0.9} style={{ left: d * 0.74, top: d * 0.06 }} />
      </div>}
      {ph.map((x, i) => { const [cx, cy, mw, mh, rot] = slots[i], b = pfit(x.aspect, mw, mh); return <Polaroid key={i} ph={x} {...b} rot={rot} dur={dur} delay={6 + i * 8} seed={i + 1} tape={alpha([a1, a2, a0][i], 85)} style={{ left: cx * W - b.ow / 2, top: cy * H - b.oh / 2 }} />; })}
      {!portrait && <><Sticker size={96} color={a0} x={W * 0.93} y={H * 0.1} delay={30} /><Sticker size={58} color={a1} x={W * 0.51} y={H * 0.1} delay={36} spin={-0.7} seed={2} /></>}
      {portrait && <Sticker size={110} color={a0} x={W - PAD - 30} y={PAD * 1.4 + 40} delay={30} />}
      <Brand scene={scene} pos="bl" />
    </Paper>
  );
};

/* ---------- opener.collage ---------- */
const COL_L: Slot[] = [[0.14, 0.26, 540, 380, -6], [0.86, 0.74, 540, 380, 4], [0.14, 0.76, 500, 340, 4], [0.86, 0.25, 520, 360, -5], [0.5, 0.89, 420, 250, 3], [0.5, 0.08, 420, 260, -3]];
const COL_P: Slot[] = [[0.26, 0.13, 520, 360, -6], [0.74, 0.86, 540, 370, 5], [0.76, 0.2, 500, 340, 5], [0.24, 0.8, 520, 350, -4], [0.08, 0.5, 380, 320, -8], [0.93, 0.5, 380, 320, 7]];
export const OpenerCollage: React.FC<PartProps<'opener.collage'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, accOf } = useS(scene), a0 = accOf(0), a1 = accOf(1), a2 = accOf(2), slots = portrait ? COL_P : COL_L;
  const cw = portrait ? W * 0.74 : Math.min(W * 0.4, 800), inner = cw - (portrait ? 110 : 130), ls = lines(data.title, portrait, 8), fs = fitLines(ls, portrait ? 150 : 150, inner, 0.95), s = pop(f, 18, 10);
  return (
    <Paper>
      {photos.slice(0, 6).map((x, i) => { const [cx, cy, mw, mh, rot] = slots[i], b = pfit(x.aspect, mw, mh); return <Polaroid key={i} ph={x} {...b} rot={rot} dur={dur} delay={4 + i * 6} seed={i + 1} tape={alpha(P.accents[i % P.accents.length], 85)} style={{ left: cx * W - b.ow / 2, top: cy * H - b.oh / 2 }} />; })}
      <div style={{ position: 'absolute', left: (W - cw) / 2, top: H * 0.5, width: cw, transform: `translateY(-50%) scale(${s}) rotate(${(1 - s) * -6 - 2 + wob(f, 4, 0.8)}deg) translateY(${wob(f, 6, 6)}px)`, background: P.surface, border: `6px solid ${P.ink}`, borderRadius: 56, boxShadow: `12px 14px 0 ${a0}`, padding: portrait ? '56px 50px' : '60px 64px', textAlign: 'center', zIndex: 3 }}>
        {data.kicker && <Pill text={data.kicker} bg={a1} color={P.onAccent} size={portrait ? 36 : 32} />}
        <div style={{ marginTop: data.kicker ? 26 : 0, fontFamily: KID, color: P.ink, fontSize: fs, lineHeight: 1.14, wordBreak: 'keep-all' }}>{ls.map((t, i) => <div key={i} style={{ whiteSpace: 'nowrap', transform: `translateY(${(1 - prog(f, 24 + i * 5, 14)) * 30}px)`, opacity: prog(f, 24 + i * 5, 10) }}>{t}</div>)}</div>
        {data.sub && <div style={{ marginTop: 22, fontFamily: BODY, fontWeight: 800, fontSize: portrait ? 40 : 36, color: P.muted, lineHeight: 1.4, wordBreak: 'keep-all', opacity: prog(f, 38, 14) }}>{data.sub}</div>}
      </div>
      <Sticker size={portrait ? 120 : 110} color={a2} x={(W + cw) / 2 - 10} y={H * 0.5 - (portrait ? H * 0.14 : H * 0.2)} delay={34} />
      <Brand scene={scene} pos="bl" />
    </Paper>
  );
};

/* ---------- section.title ---------- */
export const SectionTitle: React.FC<PartProps<'section.title'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), ph = photos[0], ci = data.index - 1;
  const d = portrait ? W * 0.7 : H * 0.62, ls = lines(data.title, portrait, 8), budget = portrait ? W - PAD * 2 : W - PAD * 2 - d - 100, tw = fitLines(ls, portrait ? 150 : 170, budget, 0.98), s = pop(f, 6, 10), L = life(f, dur), dots = alpha(P.onAccent, 18);
  return (
    <AbsoluteFill style={{ background: acc, backgroundImage: `radial-gradient(${dots} 2.4px, transparent 2.8px)`, backgroundSize: '40px 40px', backgroundPosition: `${f * 0.7}px ${f * 0.35}px`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.6 : 0, bottom: portrait ? undefined : 0, width: portrait ? W - PAD * 2 : W - PAD * 2 - d - 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateX(${-18 * life(f, dur, 20)}px)` }}>
        {data.sub && <div style={{ transform: `translateY(${(1 - pop(f, 8)) * 50}px)`, opacity: Math.min(1, pop(f, 8) * 2), alignSelf: 'flex-start' }}><Pill text={data.sub} bg={P.bg} color={P.ink} size={portrait ? 40 : 36} /></div>}
        <div style={{ marginTop: 28, fontFamily: KID, color: P.onAccent, fontSize: tw, lineHeight: 1.1, wordBreak: 'keep-all' }}>{ls.map((t, i) => <div key={i} style={{ overflow: 'hidden', paddingBottom: 8, whiteSpace: 'nowrap' }}><div style={{ transform: `translateY(${(1 - prog(f, 10 + i * 4, 16)) * 110}%)` }}>{t}</div></div>)}</div>
        <div style={{ marginTop: 40, display: 'flex', gap: 14 }}>
          {Array.from({ length: Math.min(data.total, 12) }, (_, i) => <div key={i} style={{ width: i === ci ? 64 : 22, height: 22, borderRadius: 11, background: i === ci ? P.bg : alpha(P.onAccent, 45), transform: `scale(${pop(f, 24 + i * 3)})` }} />)}
        </div>
      </div>
      <div style={{ position: 'absolute', left: portrait ? (W - d) / 2 : W - PAD - d, top: portrait ? H * 0.07 : (H - d) / 2, width: d, height: d, transform: `scale(${s}) rotate(${(1 - s) * 40}deg) translateY(${wob(f, ci, 6)}px)` }}>
        <div style={{ position: 'absolute', inset: -d * 0.06, borderRadius: '50%', border: `${Math.max(6, d * 0.012)}px dashed ${alpha(P.onAccent, 75)}`, transform: `rotate(${f * 0.6}deg)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', border: `${d * 0.025}px solid ${P.bg}`, boxSizing: 'border-box', background: P.surface }}>
          {ph ? <LivePhoto ph={ph} dur={dur} strength={1.2} /> : <>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: d * 0.6, color: acc, transform: `scale(${1 + 0.04 * Math.sin(f / 12)})` }}>{data.index}</div>
          </>}
        </div>
        {ph && <div style={{ position: 'absolute', left: -d * 0.04, top: -d * 0.04, width: d * 0.3, height: d * 0.3, borderRadius: '50%', background: P.bg, border: `${d * 0.012}px solid ${P.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: d * 0.2, color: P.ink, transform: `scale(${pop(f, 16, 9)}) rotate(${wob(f, ci + 5, 6)}deg)` }}>{data.index}</div>}
        <Star size={d * 0.2} color={accOf(scene.section + 1)} rot={f * 0.8} style={{ right: -d * 0.02, bottom: d * 0.02, transform: `rotate(${f * 0.8}deg) scale(${pop(f, 28)})` }} />
      </div>
      <Brand scene={scene} pos="bl" onPhoto />
      <div style={{ display: 'none' }}>{BODY}{L}</div>
    </AbsoluteFill>
  );
};

/* ---------- outro.thanks ---------- */
export const OutroThanks: React.FC<PartProps<'outro.thanks'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), ls = lines(data.title, portrait, 9), tw = portrait ? W - PAD * 2 : W * 0.52 - PAD, fs = fitLines(ls, portrait ? 190 : 170, tw, 0.98);
  const ph = photos.slice(0, 3), chips = data.chips ?? [];
  const slotsL: Slot[] = [[0.7, 0.24, 520, 380, -6], [0.86, 0.54, 420, 320, 5], [0.68, 0.78, 420, 310, -3]], slotsP: Slot[] = [[0.3, 0.57, 580, 400, -5], [0.7, 0.7, 520, 380, 4], [0.34, 0.86, 480, 330, -3]];
  const slots = portrait ? slotsP : slotsL;
  return (
    <AbsoluteFill style={{ background: acc, backgroundImage: `radial-gradient(${alpha(P.onAccent, 18)} 2.4px, transparent 2.8px)`, backgroundSize: '40px 40px', backgroundPosition: `${f * 0.7}px ${f * 0.35}px`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.08 : 0, bottom: portrait ? undefined : 0, width: portrait ? W - PAD * 2 : W * 0.52, display: 'flex', flexDirection: 'column', justifyContent: portrait ? 'flex-start' : 'center', gap: portrait ? 40 : 34, alignItems: portrait ? 'center' : 'flex-start', textAlign: portrait ? 'center' : 'left' }}>
        <div style={{ fontFamily: KID, color: P.onAccent, fontSize: fs, lineHeight: 1.12, wordBreak: 'keep-all' }}>{ls.map((t, i) => <div key={i} style={{ overflow: 'hidden', paddingBottom: 6, whiteSpace: 'nowrap' }}><div style={{ transform: `translateY(${(1 - prog(f, 4 + i * 5, 16)) * 110}%)` }}>{t}</div></div>)}</div>
        {data.message && <div style={{ fontFamily: BODY, fontWeight: 800, color: P.onAccent, fontSize: portrait ? 48 : 42, lineHeight: 1.5, opacity: prog(f, 24, 16), whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{data.message}</div>}
        {chips.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: portrait ? 'center' : 'flex-start', gap: 16, opacity: prog(f, 34, 14) }}>{chips.map((t, i) => <Pill key={i} text={t} bg={i % 2 ? P.surface : P.ink} color={i % 2 ? P.ink : P.bg} size={portrait ? 38 : 34} />)}</div>}
      </div>
      {ph.map((x, i) => { const [cx, cy, mw, mh, rot] = slots[i], b = pfit(x.aspect, mw, mh); return <Polaroid key={i} ph={x} {...b} rot={rot} dur={dur} delay={12 + i * 8} seed={i + 2} tape={alpha(accOf(i + 1), 90)} style={{ left: cx * W - b.ow / 2, top: cy * H - b.oh / 2 }} />; })}
      {ph.length === 0 && <div style={{ position: 'absolute', left: portrait ? W / 2 - 220 : W * 0.78 - 260, top: portrait ? H * 0.62 : H / 2 - 260, width: 520, height: 520 }}><Star size={500} color={P.surface} style={{ left: 10, top: 10, transform: `rotate(${wob(f, 1, 8)}deg) scale(${pop(f, 10, 9)})` }} /></div>}
      <Sticker size={portrait ? 100 : 90} color={accOf(scene.section + 1)} x={portrait ? W - PAD : W * 0.93} y={portrait ? H * 0.06 : H * 0.1} delay={30} />
      <Sticker size={56} color={P.surface} x={portrait ? PAD : W * 0.56} y={portrait ? H * 0.5 : H * 0.92} delay={38} spin={-0.8} seed={3} />
      <Brand scene={scene} pos="bl" onPhoto />
      <div style={{ display: 'none' }}>{dur}{glide(f, 0)}</div>
    </AbsoluteFill>
  );
};
