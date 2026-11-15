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

/* ───────────── data.list : 목차·크레딧 페이지 ───────────── */
const BASE = ['ㄱ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅂ', 'ㅅ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const ORDER = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const headOf = (s: string): { h: string; o: number } => {
  const c = s.trim().codePointAt(0) ?? 0;
  if (c >= 0xac00 && c <= 0xd7a3) { const h = BASE[Math.floor((c - 0xac00) / 588)]; return { h, o: ORDER.indexOf(h) }; }
  const u = String.fromCodePoint(c).toUpperCase();
  return { h: /[A-Z0-9]/.test(u) ? u : '#', o: 100 + u.charCodeAt(0) };
};
type Row = { kind: 'head'; label: string; count: string } | { kind: 'item'; name: string; no: number };
const buildRows = (items: string[]): Row[] => {
  const hs = items.map(headOf), mono = hs.every((x, i) => i === 0 || x.o >= hs[i - 1].o), kinds = new Set(hs.map((x) => x.h)).size;
  const rows: Row[] = [];
  if (mono && kinds >= 3 && kinds <= items.length * 0.65) {
    let cur = '';
    hs.forEach((x, i) => { if (x.h !== cur) { cur = x.h; rows.push({ kind: 'head', label: cur, count: '' }); } rows.push({ kind: 'item', name: items[i], no: i + 1 }); });
  } else {
    const g = Math.max(6, Math.ceil(items.length / Math.ceil(items.length / 10)));
    items.forEach((name, i) => { if (i % g === 0) rows.push({ kind: 'head', label: `${pad2(i + 1)}–${pad2(Math.min(items.length, i + g))}`, count: '' }); rows.push({ kind: 'item', name, no: i + 1 }); });
  }
  return rows;
};
const flow = (rows: Row[], rpc: number) => {
  const cols: Row[][] = [[]]; let u = 0;
  rows.forEach((r, i) => {
    const need = r.kind === 'head' ? 3 : 1;
    if (u > 0 && u + need > rpc) { cols.push([]); u = 0; }
    cols[cols.length - 1].push(r); u += r.kind === 'head' ? 2 : 1;
  });
  return cols;
};

export const DataList: React.FC<PartProps<'data.list'>> = ({ data, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, items = data.items.slice(0, 40), rows = buildRows(items);
  const lx = PAD, lw = W - 2 * PAD, lt = portrait ? H * 0.26 : PAD * 0.8 + 230, lh = H - lt - PAD * 1.15, LH = 1.52, gapX = portrait ? 44 : 56, mx = Math.max(...items.map((s) => tw(s)), 2);
  let best: { c: number; rpc: number; s: number; cols: Row[][]; pages: number; score: number } | null = null;
  for (let c = 1; c <= (portrait ? 2 : 4); c++) for (let rpc = 3; rpc <= 22; rpc++) {
    const cols = flow(rows, rpc), pages = Math.ceil(cols.length / c); if (pages > 3) continue;
    const cw = (lw - (c - 1) * gapX) / c, s = Math.min(portrait ? 60 : 56, lh / (rpc * LH), cw / (mx + 3.6)), lastFill = (cols.length - (pages - 1) * c) / c, score = Math.min(s, 50) - 8 * (pages - 1) - 14 * (1 - lastFill) - (s < (portrait ? 34 : 38) ? 40 : 0);
    if (!best || score > best.score) best = { c, rpc, s, cols, pages, score };
  }
  const B = best ?? { c: 1, rpc: 8, s: 30, cols: flow(rows, 8), pages: 3, score: 0 };
  const { c, s, cols, pages, rpc } = B, LHe = Math.max(LH, Math.min(2.1, lh / (rpc * s) - 0.02)), cw = (lw - (c - 1) * gapX) / c, seg = (dur - 22) / pages;
  const pageCols = Array.from({ length: pages }, (_, k) => cols.slice(k * c, k * c + c));
  const ts = data.title ? fitNW([data.title], portrait ? W - 2 * PAD : W * 0.55, portrait ? 150 : 150, portrait ? 112 : 128, 1.1) : 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.4 }} />
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: PAD * 0.7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, fontFamily: fonts.body, fontSize: 24, fontWeight: 700, letterSpacing: '0.1em', ...NUM, color: p.ink }}>
        <Rise d={0}><span><span style={{ color: ac, fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 900, fontSize: 30, marginRight: 10 }}>N°</span>{pad2(scene.index + 1)}</span></Rise>
        <Rise d={2}><span style={{ display: 'inline-flex', gap: 14, alignItems: 'center' }}>{pageCols.map((_, k) => { const on = f >= 12 + k * seg - 2 && f < 12 + (k + 1) * seg - 2; return <span key={k} style={{ color: on ? ac : p.muted }}>P.{pad2(k + 1)}</span>; })}<span style={{ color: p.muted }}>/ {pad2(pages)} · {items.length}</span></span></Rise>
      </div>
      <Rule d={0} dur={36} color={p.ink} th={4} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40, marginTop: portrait ? 26 : 22 }}>
        {data.title && <Rise d={4} dur={24}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: ts, lineHeight: 1.12, letterSpacing: '-0.035em', color: p.ink, whiteSpace: 'nowrap' }}>{data.title}</div></Rise>}
        {data.sub && <Rise d={10}><div style={{ fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 500, fontSize: portrait ? 36 : 40, color: ac, paddingBottom: 8, whiteSpace: 'nowrap' }}>{data.sub}</div></Rise>}
      </div>
    </div>
    <div style={{ position: 'absolute', left: lx, top: lt, width: lw, height: lh }}>
      {pageCols.map((pc, k) => {
        const st = 12 + k * seg, en = st + seg - 2, last = k === pages - 1, vis = (f >= st - 2) && (last || f < en + 8), out = last ? 0 : prog(f, en - 4, 8);
        if (!vis) return null;
        let idx = 0;
        return <div key={k} style={{ position: 'absolute', inset: 0, opacity: 1 - out, transform: `translateY(${-out * 18 + drift(f - st, seg, 10)}px)` }}>
          {pc.map((col, ci) => {
            let y = 0;
            return <div key={ci} style={{ position: 'absolute', left: ci * (cw + gapX), width: cw, top: 0, height: lh }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: p.ink, transform: `scaleX(${ep(f, st + ci * 3, 24)})`, transformOrigin: 'left' }} />
              {col.map((r, ri) => {
                const u = r.kind === 'head' ? 2 : 1, top = 12 + y * s * LHe; y += u; const t = ep(f, st + 4 + (idx++) * 1.1, 16);
                if (r.kind === 'head') return <div key={ri} style={{ position: 'absolute', left: 0, right: 0, top, height: s * LHe * 2, opacity: t, transform: `translateY(${(1 - t) * 16}px)`, display: 'flex', alignItems: 'flex-end', gap: 16, paddingBottom: s * 0.15 }}>
                  <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: s * 1.9, lineHeight: 0.9, color: ac, ...NUM }}>{r.label}</span>
                  <span style={{ flex: 1, height: 2, background: p.ink, opacity: 0.35, marginBottom: s * 0.3 }} />
                </div>;
                return <div key={ri} style={{ position: 'absolute', left: 0, right: 0, top, height: s * LHe, opacity: t, transform: `translateY(${(1 - t) * 16}px)`, display: 'flex', alignItems: 'baseline', gap: 14, paddingTop: s * 0.18 }}>
                  <span style={{ fontFamily: fonts.body, fontSize: s, fontWeight: 600, color: p.ink, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{r.name}</span>
                  <span style={{ flex: 1, borderBottom: `2px dotted ${p.muted}`, opacity: 0.6, transform: 'translateY(-4px)' }} />
                  <span style={{ fontFamily: fonts.display, ...NUM, fontSize: s * 0.62, fontWeight: 700, color: ac }}>{pad2(r.no)}</span>
                </div>;
              })}
            </div>;
          })}
        </div>;
      })}
    </div>
  </div>;
};
