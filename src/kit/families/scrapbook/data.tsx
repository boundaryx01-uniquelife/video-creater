import React from 'react';
import { AbsoluteFill } from 'remotion';
import { clamp, life, pop, prog, wob } from '../../motion';
import type { PartProps } from '../../schema.ts';
import { Brand, Paper, Pill, Sticker, alpha, tint, useS } from './kit';

/* ---------- data.numbers ---------- */
export const DataNumbers: React.FC<PartProps<'data.numbers'>> = ({ data, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), items = data.items.slice(0, 4), n = items.length, gap = portrait ? 36 : 50;
  const top = data.title ? (portrait ? H * 0.18 : H * 0.3) : portrait ? H * 0.12 : H * 0.2, bottom = portrait ? H - PAD * 1.4 : H - H * 0.12;
  const cw = portrait ? W - PAD * 2 : Math.min(n === 1 ? 760 : 470, (W - PAD * 2 - gap * (n - 1)) / n), ch = portrait ? Math.min(340, (bottom - top - gap * (n - 1)) / n) : Math.min(500, bottom - top);
  return (
    <AbsoluteFill style={{ background: acc, backgroundImage: `radial-gradient(${alpha(P.onAccent, 14)} 2.4px, transparent 2.8px)`, backgroundSize: '40px 40px', backgroundPosition: `${f * 0.7}px ${f * 0.35}px`, overflow: 'hidden' }}>
      {data.title && <div style={{ position: 'absolute', left: PAD, right: PAD, top: portrait ? PAD * 1.3 : H * 0.1, fontFamily: KID, fontSize: Math.min(portrait ? 120 : 130, (W - PAD * 2) / ([...data.title].length * 0.98)), color: P.onAccent, whiteSpace: 'nowrap', transform: `translateY(${(1 - pop(f, 2)) * 60}px)`, wordBreak: 'keep-all' }}>{data.title}</div>}
      {items.map((it, i) => {
        const s = pop(f, 12 + i * 8, 10), v = Math.round(it.value * prog(f, 18 + i * 8, Math.max(34, dur * 0.55))), vs = it.value.toLocaleString('en-US'), unit = it.unit ?? '', c = accOf(scene.section + 1 + i);
        const x = portrait ? PAD : (W - (cw * n + gap * (n - 1))) / 2 + i * (cw + gap), y = portrait ? top + i * (ch + gap) : top + (bottom - top - ch) / 2;
        const vfs = portrait ? Math.min(150, ch * 0.5, (cw * 0.5) / (vs.length * 0.6 + unit.length * 0.45)) : Math.min(170, (cw - 70) / (vs.length * 0.6 + unit.length * 0.45));
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: cw, height: ch, background: P.surface, border: `6px solid ${P.ink}`, borderRadius: 56, boxShadow: `12px 14px 0 ${c}`, boxSizing: 'border-box', display: 'flex', flexDirection: portrait ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: portrait ? 34 : 18, padding: '0 30px', transform: `scale(${s}) rotate(${(i % 2 ? 2 : -2) * s + wob(f, i, 1.2)}deg) translateY(${wob(f, i + 3, 9)}px)`, opacity: clamp(s * 2, 0, 1) }}>
            <div style={{ fontFamily: KID, color: P.ink, fontSize: vfs, lineHeight: 1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString('en-US')}<span style={{ fontSize: vfs * 0.42, marginLeft: 6 }}>{unit}</span></div>
            <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: portrait ? 46 : 42, color: P.onAccent, background: c, borderRadius: 999, padding: '6px 26px', wordBreak: 'keep-all', textAlign: 'center', lineHeight: 1.3, maxWidth: portrait ? cw * 0.42 : cw - 60 }}>{it.label}</div>
          </div>
        );
      })}
      <Brand scene={scene} pos="bl" onPhoto />
    </AbsoluteFill>
  );
};

/* ---------- data.schedule ---------- */
export const DataSchedule: React.FC<PartProps<'data.schedule'>> = ({ data, dur, scene }) => {
  const { P, f, KID, BODY, W, H, PAD, portrait, acc, accOf } = useS(scene), rows = data.rows.slice(0, 6), n = rows.length, L = life(f, dur);
  const gap = portrait ? 24 : 18, top = portrait ? (data.title ? H * 0.2 : H * 0.1) : H * 0.1, bottom = H - (portrait ? PAD * 1.3 : H * 0.1), rh = Math.min(portrait ? 250 : 150, (bottom - top - gap * (n - 1)) / n);
  const rx = portrait ? PAD : data.title ? W * 0.4 : PAD * 2, rw = W - rx - PAD, used = rh * n + gap * (n - 1), y0 = top + Math.max(0, (bottom - top - used) / 2);
  const tfs = Math.min(portrait ? 130 : 150, (portrait ? W - PAD * 2 : W * 0.3) / (Math.max(...(data.title ?? '').split('\n').map((t) => [...t].length), 1) * 0.98));
  return (
    <Paper color={tint(acc, P.bg, 12)}>
      {data.title && <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 1.4 : 0, bottom: portrait ? undefined : 0, width: portrait ? W - PAD * 2 : W * 0.32, display: 'flex', alignItems: portrait ? 'flex-start' : 'center' }}>
        <div style={{ fontFamily: KID, color: P.ink, fontSize: tfs, lineHeight: 1.12, wordBreak: 'keep-all', transform: `translateY(${(1 - pop(f, 2)) * 60}px) rotate(${-1.5 + wob(f, 1, 0.6)}deg)`, background: `linear-gradient(transparent 62%, ${alpha(acc, 80)} 62%, ${alpha(acc, 80)} 92%, transparent 92%)`, padding: '0 8px', whiteSpace: 'pre-wrap' }}>{data.title}</div>
      </div>}
      {/* 타임라인 줄 */}
      <div style={{ position: 'absolute', left: rx - 26, top: y0 + rh / 2, width: 6, height: (used - rh) * prog(f, 6, 30), background: alpha(P.ink, 30), borderRadius: 3 }} />
      {rows.map((r, i) => {
        const s = pop(f, 8 + i * 7, 12), y = y0 + i * (rh + gap), tfsz = Math.min(rh * 0.4, 44), wfs = Math.min(rh * 0.42, portrait ? 66 : 62), tw = tfsz * 3.4 + 40, avail = rw - tw - 90;
        const wfit = Math.min(wfs, avail / (Math.max(1, [...r.what].length) * 0.95)), hasNote = !!r.note;
        const pulse = r.hi ? 1 + 0.012 * Math.sin(f / 8 + i) : 1;
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: rx - 38, top: y + rh / 2 - 16, width: 32, height: 32, borderRadius: '50%', background: r.hi ? acc : P.surface, border: `5px solid ${P.ink}`, transform: `scale(${s})` }} />
            <div style={{ position: 'absolute', left: rx, top: y, width: rw, height: rh, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 26, padding: '0 30px', background: r.hi ? tint(acc, P.surface, 30) : P.surface, border: `5px solid ${P.ink}`, borderRadius: 36, boxShadow: `8px 10px 0 ${r.hi ? acc : alpha(P.ink, 18)}`, transform: `translateX(${(1 - s) * 140}px) scale(${pulse}) translateY(${wob(f, i + 2, 3)}px)`, opacity: clamp(s * 2, 0, 1), transformOrigin: 'left center' }}>
              <div style={{ flex: '0 0 auto', minWidth: tw }}><Pill text={r.when} bg={r.hi ? acc : P.ink} color={r.hi ? P.onAccent : P.bg} size={tfsz} style={{ fontVariantNumeric: 'tabular-nums', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: KID, fontSize: wfit, color: P.ink, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.what}</div>
                {hasNote && <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: Math.min(34, rh * 0.22), color: P.muted, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.note}</div>}
              </div>
              {r.hi && <div style={{ flex: '0 0 auto', width: rh * 0.4, height: rh * 0.4 }} />}
            </div>
            {r.hi && <Sticker size={rh * 0.5} color={acc} x={rx + rw - rh * 0.4} y={y + rh * 0.5} delay={16 + i * 7} seed={i} />}
          </React.Fragment>
        );
      })}
      <Brand scene={scene} pos="bl" />
      <div style={{ display: 'none' }}>{L}{accOf(0)}</div>
    </Paper>
  );
};

