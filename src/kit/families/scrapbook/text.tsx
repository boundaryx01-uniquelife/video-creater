import React from 'react';
import { LivePhoto, clamp, life, pop, prog, wob } from '../../motion';
import type { PartProps } from '../../schema.ts';
import { Brand, Paper, Pill, Sticker, alpha, tint, useS } from './kit';
import { wrapTitle } from '../../../lib/layout';

/** 줄바꿈이 있는 글이 w×h 상자에 들어가는 최대 글자 크기 */
export const fitBox = (text: string, maxFs: number, w: number, h: number, em = 0.95, lh = 1.3) => {
  const ls = text.split('\n');
  for (let fs = maxFs; fs > 24; fs -= 2) { const n = ls.reduce((a, t) => a + Math.max(1, Math.ceil(([...t].length * fs * em) / w)), 0); if (n * fs * lh <= h) return fs; }
  return 24;
};

/* ---------- text.statement ---------- */
export const TextStatement: React.FC<PartProps<'text.statement'>> = ({ data, dur, scene }) => {
  const { P, f, KID, W, H, PAD, portrait, acc, accOf } = useS(scene), ls = data.lines.slice(0, 3).map((t) => (portrait ? wrapTitle([t], 7).join('\n') : t)), n = data.lines.slice(0, 3).length, em = data.emphasis ?? Math.floor(n / 2), bw = W - PAD * 2.4;
  const sizes = ls.map((t, i) => { const e = i === em, pad = e ? 70 : 0, len = Math.max(1, ...t.split('\n').map((q) => [...q].length)), rowsN = t.split('\n').length; return Math.min(e ? (portrait ? 200 : 200) : portrait ? 130 : 150, (bw - pad) / (len * 0.95), 520 / rowsN); });
  const L = life(f, dur);
  return (
    <Paper color={tint(acc, P.bg, 14)}>
      <div style={{ position: 'absolute', left: PAD * 1.2, right: PAD * 1.2, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: portrait ? 26 : 18, transform: `translateX(${-24 * L}px)` }}>
        {ls.map((t, i) => {
          const e = i === em, s = pop(f, 6 + i * 9, 12), fs = sizes[i];
          return (
            <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
              <div style={{ position: 'relative', display: 'inline-block', fontFamily: KID, fontSize: fs, lineHeight: 1.12, whiteSpace: 'pre', wordBreak: 'keep-all', color: e ? P.onAccent : P.ink, background: e ? acc : 'transparent', padding: e ? '8px 34px 14px' : '0', borderRadius: e ? 28 : 0, transform: `translateY(${(1 - s) * 70}px) rotate(${e ? -1.6 + wob(f, i, 0.9) : wob(f, i, 0.3)}deg) scale(${0.9 + 0.1 * s})`, transformOrigin: 'left center', opacity: clamp(s * 2, 0, 1), boxShadow: e ? `10px 12px 0 ${alpha(P.ink, 85)}` : undefined }}>
                {t}
                {e && <div style={{ position: 'absolute', top: -16, left: '50%', width: 150, height: 38, marginLeft: -75, background: alpha(P.surface, 85), transform: 'rotate(-3deg)', borderRadius: 4 }} />}
              </div>
            </div>
          );
        })}
      </div>
      <Sticker size={portrait ? 130 : 120} color={acc} x={W - PAD * 1.3} y={portrait ? H * 0.18 : H * 0.2} delay={26} />
      <Sticker size={portrait ? 70 : 64} color={accOf(scene.section + 1)} x={portrait ? W * 0.82 : W * 0.86} y={portrait ? H * 0.84 : H * 0.8} delay={34} spin={-0.9} seed={2} />
      <Brand scene={scene} pos="bl" />
    </Paper>
  );
};

/* ---------- text.quote ---------- */
export const TextQuote: React.FC<PartProps<'text.quote'>> = ({ data, photos, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc } = useS(scene), ph = photos[0], L = life(f, dur);
  const d = portrait ? W * 0.5 : H * 0.5, bw = ph ? (portrait ? W - PAD * 2 : W - PAD * 2 - d - 80) : portrait ? W - PAD * 2 : W - PAD * 2 - 200;
  const padX = portrait ? 56 : 80, padY = portrait ? 60 : 72, availH = ph && portrait ? H * 0.3 : portrait ? H * 0.5 : H * 0.5, fs = fitBox(data.text, portrait ? 84 : 96, bw - padX * 2, availH, 0.95, 1.35);
  const s = pop(f, 14, 12), who = [data.who, data.role].filter(Boolean).join(' · ');
  return (
    <Paper color={tint(acc, P.bg, 10)}>
      {ph && <div style={{ position: 'absolute', left: portrait ? (W - d) / 2 : PAD, top: portrait ? H * 0.08 : (H - d) / 2, width: d, height: d, transform: `scale(${pop(f, 4, 10)}) translateY(${wob(f, 2, 8)}px)` }}>
        <div style={{ position: 'absolute', inset: -d * 0.05, borderRadius: '50%', border: `${Math.max(6, d * 0.014)}px dashed ${alpha(acc, 80)}`, transform: `rotate(${-f * 0.5}deg)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', border: `10px solid ${P.surface}`, boxShadow: '0 20px 40px rgba(42,36,64,.2)', boxSizing: 'border-box' }}><LivePhoto ph={ph} dur={dur} strength={1.1} /></div>
      </div>}
      <div style={{ position: 'absolute', left: ph ? (portrait ? PAD : PAD + d + 80) : (W - bw) / 2, top: ph ? (portrait ? H * 0.08 + d + 90 : H * 0.5) : H * 0.5, width: bw, transform: `${ph && !portrait ? 'translateY(-50%) ' : ph ? '' : 'translateY(-50%) '}scale(${s * (1 + 0.012 * Math.sin(f / 9))}) rotate(${(1 - s) * -4 + wob(f, 4, 0.8)}deg) translateX(${-10 * L}px)`, transformOrigin: ph && portrait ? 'center top' : 'center' }}>
        <div style={{ position: 'relative', background: P.surface, border: `6px solid ${P.ink}`, borderRadius: 64, padding: `${padY}px ${padX}px`, boxShadow: `12px 14px 0 ${acc}` }}>
          <div style={{ position: 'absolute', left: 36, top: -34, fontFamily: KID, fontSize: 150, lineHeight: 1, color: acc }}>“</div>
          <div style={{ fontFamily: KID, color: P.ink, fontSize: fs, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{data.text}</div>
          {ph && <div style={{ position: 'absolute', left: portrait ? '50%' : -34, top: portrait ? -30 : '50%', width: 56, height: 56, background: P.surface, borderLeft: `6px solid ${P.ink}`, borderBottom: `6px solid ${P.ink}`, transform: portrait ? 'translateX(-50%) rotate(135deg)' : 'translateY(-50%) rotate(45deg)' }} />}
          {who && <div style={{ position: 'absolute', right: 44, bottom: -34 }}><Pill text={who} bg={acc} color={P.onAccent} size={portrait ? 36 : 34} /></div>}
        </div>
      </div>
      {!ph && <><Sticker size={110} color={acc} x={W - PAD * 1.1} y={H * 0.16} delay={26} /><Sticker size={64} color={P.accents[(scene.section + 1) % P.accents.length]} x={PAD * 1.1} y={H * 0.84} delay={34} spin={-0.8} seed={3} /></>}
      <Brand scene={scene} pos="bl" />
      <div style={{ display: 'none' }}>{BODY}{prog(f, 0, 1)}</div>
    </Paper>
  );
};
