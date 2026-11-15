import React from 'react';
import type { PartProps } from '../../schema.ts';
import { Brand, E, Folio, NUM, Rise, Rule, drift, ep, fitBox, fitNW, pad2, tw, useEd } from './kit';
import { life, prog } from '../../motion';

const WORD: React.CSSProperties = { wordBreak: 'keep-all' };
const fmt = (v: number, dec = false) => (dec ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'));

export const DataNumbers: React.FC<PartProps<'data.numbers'>> = ({ data, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, items = data.items.slice(0, 4), n = items.length, L = life(f, dur);
  const em = (it: { value: number; unit?: string }) => fmt(it.value, !Number.isInteger(it.value)).replace(/,/g, '').length * 0.62 + (fmt(it.value).split(',').length - 1) * 0.3 + (it.unit ? tw(it.unit) * 0.42 + 0.12 : 0);
  const colW = (W - 2 * PAD - (n - 1) * 36) / n, top = H * (data.title ? 0.34 : 0.28);
  const rowH = (H - top - PAD * 1.3) / n;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Brand scene={scene} style={{ left: PAD, top: PAD * 0.75 }} />
    <Folio scene={scene} style={{ right: PAD, top: PAD * 0.75 }} />
    {data.title && <div style={{ position: 'absolute', left: PAD, top: PAD * (portrait ? 1.6 : 1.5), right: PAD }}><Rise d={2} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: fitNW([data.title], W - 2 * PAD, 120, portrait ? 92 : 84, 1.15), letterSpacing: '-0.035em', color: p.ink, lineHeight: 1.15, whiteSpace: 'nowrap' }}>{data.title}</div></Rise></div>}
    {items.map((it, i) => {
      const t = ep(f, 4 + i * 4, 32), v = it.value * t, d0 = 4 + i * 4, txt = fmt(v, !Number.isInteger(it.value));
      const size = portrait ? Math.min(rowH * 0.62, 240, ((W - 2 * PAD) * 0.96) / em(it)) : Math.min(n <= 2 ? 360 : 280, ((colW - 10) * 0.96) / em(it));
      const num = <div style={{ fontFamily: fonts.display, ...NUM, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: '-0.03em', color: p.ink, whiteSpace: 'nowrap' }}>{txt}{it.unit && <span style={{ fontSize: size * 0.4, color: ac, marginLeft: size * 0.06, letterSpacing: 0, fontWeight: 700 }}>{it.unit}</span>}</div>;
      const bar = <div style={{ width: `${30 + 50 * L}%`, marginTop: portrait ? 14 : 26 }}><Rule d={d0 + 14} color={ac} th={8} /></div>;
      return portrait
        ? <div key={i} style={{ position: 'absolute', left: PAD, right: PAD, top: top + i * rowH, height: rowH - 10 }}>
          <Rule d={d0} color={p.ink} th={2} />
          <Rise d={d0 + 4} style={{ marginTop: 14 }}><div style={{ fontFamily: fonts.body, fontSize: 32, fontWeight: 600, color: p.muted, ...WORD }}>{it.label}</div></Rise>
          <div style={{ marginTop: 6 }}><Rise d={d0 + 6} dur={24}>{num}</Rise></div>
          {n < 4 && bar}
        </div>
        : <div key={i} style={{ position: 'absolute', left: PAD + i * (colW + 36), width: colW, top, bottom: PAD * 1.1 }}>
          <Rule d={d0} color={p.ink} th={2} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 36, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', transform: `translateY(${drift(f, dur, 10)}px)` }}>
            <Rise d={d0 + 6} dur={24}>{num}</Rise>{bar}
            <Rise d={d0 + 10} style={{ marginTop: 22 }}><div style={{ fontFamily: fonts.body, fontSize: 36, fontWeight: 600, color: p.muted, ...WORD }}>{it.label}</div></Rise>
          </div>
        </div>;
    })}
  </div>;
};

export const DataSchedule: React.FC<PartProps<'data.schedule'>> = ({ data, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, rows = data.rows.slice(0, 6), n = rows.length;
  const tx = portrait ? PAD : Math.round(W * 0.38), tw0 = portrait ? W - 2 * PAD : W - tx - PAD, ty = portrait ? H * 0.27 : PAD * 1.4;
  const avail = portrait ? H - ty - PAD * 1.4 : H - 2 * PAD * 1.3, rowH = Math.min(portrait ? 230 : 172, avail / n);
  const seg = Math.max(12, (dur - 54) / n), ws = portrait ? 250 : 230;
  const ts = data.title ? fitBox([data.title], portrait ? W - 2 * PAD : tx - 2 * PAD, portrait ? 240 : 420, portrait ? 120 : 104, 1.12) : 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.7 }} />
    <Folio scene={scene} style={{ [portrait ? 'right' : 'left']: portrait ? PAD : PAD, top: portrait ? PAD * 0.75 : PAD * 0.75 }} />
    {data.title && <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 1.5 : PAD * 1.8, width: portrait ? W - 2 * PAD : tx - 2 * PAD }}>
      <div style={{ width: 120, marginBottom: 30 }}><Rule d={0} color={ac} th={10} /></div>
      {data.title.split('\n').map((l, i) => <Rise key={i} d={4 + i * 5} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: ts, lineHeight: 1.12, letterSpacing: '-0.035em', color: p.ink, ...WORD }}>{l}</div></Rise>)}
    </div>}
    <div style={{ position: 'absolute', left: tx, width: tw0, top: ty }}>
      {rows.map((r, i) => {
        const s = 30 + i * seg, on = prog(f, s, 14, E) * (1 - prog(f, s + seg - 6, 10)), act = i === n - 1 ? prog(f, s, 14, E) : on, d0 = 4 + i * 3, dim = 1 - 0.38 * (1 - Math.max(act, ep(f, 0, 1) * (f < 34 ? 1 : 0)));
        return <div key={i} style={{ position: 'relative', height: rowH, opacity: ep(f, d0, 14) * dim }}>
          <Rule d={d0} color={p.ink} th={2} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: `${act * 100}%`, height: 8, background: ac }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: portrait ? 'flex-start' : 'center', paddingTop: portrait ? 20 : 0, gap: portrait ? 20 : 30 }}>
            <Rise d={d0 + 4} style={{ width: ws, flex: 'none' }}><div style={{ fontFamily: fonts.display, ...NUM, fontWeight: 900, fontSize: Math.min(portrait ? 64 : 72, rowH * 0.46), color: r.hi ? ac : p.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{r.when}</div></Rise>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: portrait ? 'flex-start' : 'baseline', justifyContent: 'space-between', gap: portrait ? 4 : 30 }}>
              <Rise d={d0 + 6}><div style={{ fontFamily: fonts.body, fontSize: Math.min(portrait ? 46 : 48, rowH * 0.3), fontWeight: 700, color: p.ink, ...WORD }}>{r.what}</div></Rise>
              {r.note && <Rise d={d0 + 8}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 30 : 28, color: p.muted, ...WORD }}>{r.note}</div></Rise>}
            </div>
          </div>
        </div>;
      })}
      <div style={{ height: 2, background: p.ink, opacity: ep(f, 4 + n * 3, 14) }} />
    </div>
  </div>;
};

export const DataList: React.FC<PartProps<'data.list'>> = ({ data, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, items = data.items.slice(0, 40), n = items.length;
  const x0 = portrait ? PAD : Math.round(W * 0.36), lw = W - x0 - PAD, lt = portrait ? H * 0.27 : PAD * 1.3, lh = portrait ? H - lt - PAD * 1.4 : H - 2 * PAD * 1.3, LH = 1.55, gapX = 30, mx = Math.max(...items.map((s) => tw(s)));
  let best = { c: 1, s: 0 };
  for (let c = 1; c <= 6; c++) { const r = Math.ceil(n / c), cw = (lw - (c - 1) * gapX) / c, s = Math.min(portrait ? 80 : 72, lh / (r * LH), cw / (mx + 1.5)); if (s > best.s) best = { c, s }; }
  let { c, s } = best, scroll = false;
  if (s < 28) { s = 28; c = Math.max(1, Math.min(6, Math.floor((lw + gapX) / ((mx + 1.5) * s + gapX)))); scroll = true; }
  const r = Math.ceil(n / c), cw = (lw - (c - 1) * gapX) / c, need = r * s * LH, dist = scroll ? Math.max(0, need - lh) : 0, off = scroll ? dist * Math.min(1, Math.max(0, (f - 24) / (dur - 44))) : drift(f, dur, 10) * -1 * 0 + drift(f, dur, 10);
  const ts = data.title ? fitBox([data.title], portrait ? W - 2 * PAD : x0 - 2 * PAD, portrait ? 200 : 360, portrait ? 112 : 100, 1.12) : 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.7 }} />
    <Folio scene={scene} style={{ right: PAD, top: PAD * 0.75 }} />
    <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 1.5 : PAD * 1.8, width: portrait ? W - 2 * PAD : x0 - 2 * PAD }}>
      <div style={{ width: 120, marginBottom: 30 }}><Rule d={0} color={ac} th={10} /></div>
      {data.title && <Rise d={4} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: ts, lineHeight: 1.12, letterSpacing: '-0.035em', color: p.ink, ...WORD }}>{data.title}</div></Rise>}
      {data.sub && <Rise d={12} style={{ marginTop: 20 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 36 : 32, color: p.muted }}>{data.sub}</div></Rise>}
    </div>
    <div style={{ position: 'absolute', left: x0, width: lw, top: lt, height: lh, overflow: 'hidden', WebkitMaskImage: scroll ? 'linear-gradient(to bottom, transparent 0, #000 6%, #000 94%, transparent 100%)' : undefined }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: p.ink, transform: `scaleX(${ep(f, 0, 30)})`, transformOrigin: 'left' }} />
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${scroll ? -off : off}px)` }}>
        {items.map((it, i) => {
          const col = Math.floor(i / r), row = i % r, t = ep(f, 4 + (i / n) * 14, 14);
          return <div key={i} style={{ position: 'absolute', left: col * (cw + gapX), top: row * s * LH + 10, width: cw, height: s * LH, opacity: t, transform: `translateY(${(1 - t) * 20}px)`, display: 'flex', alignItems: 'center', gap: s * 0.5, borderTop: scroll || c > 1 ? undefined : undefined }}>
            <span style={{ fontFamily: fonts.display, ...NUM, fontSize: s * 0.52, fontWeight: 700, color: ac, width: s * 1.0, flex: 'none' }}>{pad2(i + 1)}</span>
            <span style={{ fontFamily: fonts.body, fontSize: s, fontWeight: 600, color: p.ink, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{it}</span>
          </div>;
        })}
      </div>
    </div>
  </div>;
};
