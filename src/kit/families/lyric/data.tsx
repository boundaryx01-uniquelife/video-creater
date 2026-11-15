import React from 'react';
import type { PartProps } from '../../schema.ts';
import { clamp, life } from '../../motion';
import { Brand, Hair, Leak, NUM, Rise, SERIF, Tiny, WORD, fitBox, fitNW, sp, tw, useLy } from './kit';

const fmt = (v: number, dec: boolean) => (dec ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'));
const Title: React.FC<{ text?: string; x: number; y: number; ly: ReturnType<typeof useLy>; color?: string }> = ({ text, x, y, ly, color }) => text ? (
  <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 20 }}><div style={{ width: 48 }}><Hair d={2} color={color ?? ly.ac} /></div><Rise d={2}><Tiny size={ly.portrait ? 22 : 20} color={color ?? ly.p.muted} fonts={ly.fonts} track={0.4}>{text}</Tiny></Rise></div>) : null;

/** 숫자: 가는 명조 숫자가 천천히 올라가고, 가는 선이 칸을 나눈다 */
export const DataNumbers: React.FC<PartProps<'data.numbers'>> = ({ data, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, items = data.items.slice(0, 4), n = items.length, L = life(f, dur);
  const top = H * (portrait ? 0.2 : 0.22), bw = W - 2 * PAD * (portrait ? 1 : 1.2), bx = (W - bw) / 2, colW = bw / n, rowH = (H - top - PAD * 1.2) / n;
  const em = (v: number, u?: string) => fmt(v, !Number.isInteger(v)).length * 0.5 + (u ? tw(u) * 0.34 + 0.1 : 0);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Leak at="tr" color={ac} op={0.3} size={0.8} />
    <Leak at="bl" color={p.surface} op={1} size={0.9} />
    <Title text={data.title} x={PAD * (portrait ? 1 : 1.2)} y={PAD * 0.8} ly={e} />
    <Brand scene={scene} color={p.muted} style={{ right: PAD, top: PAD * 0.7 }} />
    {items.map((it, i) => {
      const d = 6 + i * 9, t = sp(f, d, 70), txt = fmt(it.value * t, !Number.isInteger(it.value));
      const size = portrait ? Math.min(rowH * 0.62, 230, (bw * 0.96) / em(it.value, it.unit)) : Math.min(n <= 2 ? 300 : 230, ((colW - PAD * 0.9) * 0.98) / em(it.value, it.unit));
      const num = <div style={{ fontFamily: fonts.display, fontWeight: 200, ...NUM, fontSize: size, lineHeight: 1, letterSpacing: '-0.02em', color: p.ink, whiteSpace: 'nowrap' }}>{txt}{it.unit && <span style={{ fontSize: size * 0.34, marginLeft: size * 0.08, color: ac, fontWeight: 300, letterSpacing: 0 }}>{it.unit}</span>}</div>;
      const lab = <Rise d={d + 14}><div style={{ fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 34 : 30, letterSpacing: '0.08em', color: p.muted, ...WORD }}>{it.label}</div></Rise>;
      return portrait
        ? <div key={i} style={{ position: 'absolute', left: bx, width: bw, top: top + i * rowH, height: rowH }}><Hair d={d} color={p.ink} op={0.35} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 14 }}><Rise d={d + 4} dur={30}>{num}</Rise>{lab}</div></div>
        : <div key={i} style={{ position: 'absolute', left: bx + i * colW, width: colW, top, bottom: PAD * 1.1 }}>
          {i > 0 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0 }}><Hair d={d} v w="100%" color={p.ink} op={0.3} /></div>}
          <div style={{ position: 'absolute', left: i > 0 ? PAD * 0.5 : 0, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, transform: `translateY(${-10 * L}px)` }}>
            <Rise d={d + 4} dur={30}>{num}</Rise>
            <div style={{ width: `${30 + 40 * t}%` }}><Hair d={d + 10} color={ac} /></div>
            {lab}
          </div></div>;
    })}
  </div>;
};

/** 일정: 부드러운 세로 타임라인. 지금 읽는 줄이 또렷하고 나머지는 한 걸음 물러난다 */
export const DataSchedule: React.FC<PartProps<'data.schedule'>> = ({ data, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, rows = data.rows.slice(0, 6), n = rows.length;
  const lx = portrait ? PAD * 0.8 : W * 0.34, lw = W - lx - PAD * 1.2, top = portrait ? H * 0.2 : H * 0.12, avail = H - top - PAD * (portrait ? 1.0 : 0.9), rowH = Math.min(portrait ? 330 : 190, avail / n);
  const y0 = top + (avail - rowH * n) / 2 + (portrait ? 0 : 0), timeW = portrait ? 210 : 240, lineX = lx + timeW + 34, seg = Math.max(14, (dur - 50) / n);
  const cur = clamp((f - 24) / seg, 0, n - 0.001), ci = Math.floor(cur);
  const ts = data.title ? fitBox([data.title], portrait ? W - 2 * PAD : W * 0.3, portrait ? 200 : 300, portrait ? 84 : 88, 1.3) : 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Leak at="bl" color={ac} op={0.28} size={0.8} />
    <Leak at="tr" color={p.surface} op={1} size={0.9} />
    {data.title && !portrait && <div style={{ position: 'absolute', left: PAD * 1.4, top: 0, bottom: 0, width: W * 0.3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Rise d={2}><Tiny size={20} color={p.muted} fonts={fonts} track={0.4} style={{ marginBottom: 30 }}>SCHEDULE</Tiny></Rise>
      <Rise d={6} dur={36} dy={22}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ts, lineHeight: 1.35, color: p.ink, ...WORD }}>{data.title}</div></Rise>
      <div style={{ width: 80, margin: '34px 0' }}><Hair d={20} color={ac} /></div>
    </div>}
    {data.title && portrait && <div style={{ position: 'absolute', left: PAD, top: PAD * 1.5, width: W - 2 * PAD }}><Rise d={4} dur={34}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ts, lineHeight: 1.3, color: p.ink, ...WORD }}>{data.title}</div></Rise></div>}
    <Brand scene={scene} color={p.muted} style={{ right: PAD, top: PAD * 0.7 }} />
    <div style={{ position: 'absolute', left: lineX, top: y0 + rowH / 2, height: rowH * (n - 1) }}><Hair d={8} dur={60} v w="100%" color={p.muted} op={0.5} /></div>
    <div style={{ position: 'absolute', left: lineX, top: y0 + rowH / 2, width: 1, height: rowH * (n - 1) * clamp(cur / Math.max(1, n - 1) + 0.0, 0, 1), background: ac }} />
    {rows.map((r, i) => {
      const act = clamp(1 - Math.abs(cur - i) * 0.55, 0.42, 1), d = 8 + i * 8, y = y0 + i * rowH;
      return <Rise key={i} d={d} dur={34} dy={16} style={{ position: 'absolute', left: lx, top: y, width: lw, height: rowH }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', opacity: act }}>
          <div style={{ width: timeW, textAlign: 'right', fontFamily: fonts.display, fontWeight: r.hi ? 400 : 300, ...NUM, fontSize: portrait ? 54 : 62, color: r.hi ? ac : p.ink, letterSpacing: '0.01em' }}>{r.when}</div>
          <div style={{ width: 34, display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: r.hi ? 16 : 10, height: r.hi ? 16 : 10, borderRadius: 16, background: i <= ci ? ac : p.bg, border: `1px solid ${r.hi || i <= ci ? ac : p.muted}`, transform: `scale(${1 + (i === ci ? 0.25 : 0)})`, boxShadow: r.hi ? `0 0 0 6px ${p.surface}` : undefined, marginLeft: -0.5 }} />
          </div>
          <div style={{ marginLeft: 34, minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: fonts.display, fontWeight: r.hi ? 400 : SERIF, fontSize: portrait ? 54 : 60, lineHeight: 1.3, color: p.ink, letterSpacing: '-0.01em', ...WORD }}>{r.what}</div>
            {r.note && <Tiny size={portrait ? 32 : 28} color={p.muted} fonts={fonts} track={0.1} style={{ marginTop: 8, whiteSpace: 'normal' }}>{r.note}</Tiny>}
          </div>
        </div>
      </Rise>;
    })}
  </div>;
};

/** 명단: 엔딩 크레딧처럼 쪽 단위로 떠올랐다 사라진다(한 쪽에 다 들어가면 그대로 머문다) */
export const DataList: React.FC<PartProps<'data.list'>> = ({ data, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, items = data.items, N = items.length;
  const cols = portrait ? 2 : 4, cap = cols * (portrait ? 8 : 6), pages = Math.max(1, Math.ceil(N / cap)), size = Math.ceil(N / pages), top = H * (portrait ? 0.25 : 0.32);
  const bw = W - 2 * PAD * (portrait ? 1 : 1.5), colW = bw / cols, availH = H - top - PAD * (portrait ? 1.3 : 1.1);
  const inT = 20, pageLen = pages === 1 ? dur : (dur - inT) / pages, pi = pages === 1 ? 0 : clamp(Math.floor((f - inT * 0.5) / pageLen), 0, pages - 1);
  const local = pages === 1 ? f : f - inT * 0.5 - pi * pageLen, outT = pages === 1 ? 0 : sp(local, pageLen - 14, 12), inP = pages === 1 ? 1 : sp(local, 0, 14);
  const pageItems = items.slice(pi * size, pi * size + size), rowsUse = Math.max(1, Math.ceil(pageItems.length / cols)), maxC = Math.max(...pageItems.map((s) => tw(s)), 3);
  const ns = Math.min(portrait ? 66 : 60, (colW - 60) / (maxC * 1.08)), rh = Math.min(availH / rowsUse, ns * 2.4), blockH = rh * rowsUse;
  const ts = data.title ? fitNW([data.title], W - 2 * PAD * 1.5, 140, portrait ? 92 : 84, 1.3) : 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Leak at="tr" color={ac} op={0.3} size={0.8} />
    <Leak at="bl" color={p.surface} op={1} size={0.9} />
    <Brand scene={scene} color={p.muted} style={{ right: PAD, top: PAD * 0.7 }} />
    <div style={{ position: 'absolute', left: PAD * (portrait ? 1 : 1.5), top: portrait ? PAD * 1.4 : PAD * 1.1, right: PAD }}>
      {data.sub && <Rise d={2}><Tiny size={portrait ? 30 : 26} color={p.muted} fonts={fonts} track={0.3} style={{ marginBottom: 22 }}>{data.sub}</Tiny></Rise>}
      {data.title && <Rise d={4} dur={34}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ts, lineHeight: 1.25, color: p.ink, whiteSpace: 'nowrap' }}>{data.title}</div></Rise>}
      <div style={{ width: 80, marginTop: 26 }}><Hair d={14} color={ac} /></div>
    </div>
    <div style={{ position: 'absolute', left: (W - bw) / 2, top: top + (availH - blockH) / 2, width: bw, height: blockH, opacity: pages > 1 ? inP * (1 - outT) : 1, transform: `translateY(${pages > 1 ? (1 - inP) * 20 - outT * 24 : -14 * life(f, dur)}px)` }}>
      {pageItems.map((s, k) => { const c = Math.floor(k / rowsUse), r = k % rowsUse, d = 6 + k * 2.2;
        return <Rise key={pi + '-' + k} d={pages > 1 ? 0 : d} dur={pages > 1 ? 1 : 30} dy={pages > 1 ? 0 : 12} style={{ position: 'absolute', left: c * colW, top: r * rh, width: colW - 20, height: rh, display: 'flex', alignItems: 'center', gap: 20, opacity: pages > 1 ? sp(local, k * 1.6, 16) : undefined }}>
          <div style={{ width: 6, height: 6, borderRadius: 6, background: ac, opacity: 0.75, flex: 'none' }} />
          <div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ns, color: p.ink, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{s}</div></Rise>; })}
    </div>
    {pages > 1 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: PAD * 0.55, display: 'flex', justifyContent: 'center', gap: 12 }}>{Array.from({ length: pages }, (_, i) => <div key={i} style={{ width: i === pi ? 30 : 8, height: 2, borderRadius: 2, background: i === pi ? ac : p.muted, opacity: i === pi ? 1 : 0.5 }} />)}</div>}
  </div>;
};
