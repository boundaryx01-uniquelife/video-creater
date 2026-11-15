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

