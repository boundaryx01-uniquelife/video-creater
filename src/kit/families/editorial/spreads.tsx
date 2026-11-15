import React from 'react';
import type { KPhoto, PartProps } from '../../schema.ts';
import { LivePhoto, clamp } from '../../motion';
import { Brand, Crop, Detail, Folio, NUM, Pic, Rise, Rule, drift, ep, fitBox, fitNW, pad2, useEd } from './kit';
import { Cap, Label } from './photos';

const WORD: React.CSSProperties = { wordBreak: 'keep-all' };
const issue = (scene: { index: number }) => pad2(scene.index + 1);

/** 작은 머리글: "N° 03 ─── 보조 글" */
const Kick: React.FC<{ e: ReturnType<typeof useEd>; d: number; n: string; right?: string; color?: string; ink?: string; size?: number; w?: number | string }> = ({ e, d, n, right, color, ink, size = 28, w = '100%' }) => <div style={{ width: w }}>
  <Rise d={d}><div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, fontFamily: e.fonts.body, fontSize: size, fontWeight: 700, ...NUM, color: ink ?? e.p.ink, whiteSpace: 'nowrap' }}>
    <span><span style={{ color: color ?? e.ac, fontFamily: e.fonts.display, fontWeight: 900, fontStyle: 'italic', fontSize: size * 1.25, marginRight: 12 }}>N°</span>{n}</span>
    {right && <span style={{ fontWeight: 500, opacity: 0.85 }}>{right}</span>}
  </div></Rise>
  <div style={{ marginTop: 10 }}><Rule d={d + 2} color={ink ?? e.p.ink} th={2} /></div>
</div>;

/* ───────────── photo.full : 잡지 풀블리드 ───────────── */
export const PhotoFull: React.FC<PartProps<'photo.full'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ph = photos[0];
  const t = ep(f, 0, 34), my = (1 - t) * 50, dr = drift(f, dur, 16);
  const pw = portrait ? W - PAD * 1.1 : Math.min(W * 0.56, 1060), px = portrait ? PAD * 0.55 : PAD, py = portrait ? PAD * 1.1 : PAD * 0.85, ipad = portrait ? 40 : 44, iw = pw - 2 * ipad;
  const cs = data.caption ? fitBox([data.caption], iw, portrait ? 260 : 220, portrait ? 104 : 104, 1.14) : 0;
  const nsz = portrait ? 380 : 360, tp = ep(f, 6, 30);
  const pt = ep(f, 12, 24);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${my}% 0 ${my}% 0)` }}>
      {ph && <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + (1 - t) * 0.12})` }}><LivePhoto ph={ph} dur={dur} /></div>}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 34%), linear-gradient(to top, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 30%)' }} />
    </div>
    <Crop x={PAD * 0.5} y={PAD * 0.5} w={W - PAD} h={H - PAD} color={p.bg} len={28} gap={0} d={8} />
    <Brand scene={scene} color={p.bg} style={{ left: PAD, top: PAD * 0.8 }} />
    <div style={{ position: 'absolute', right: PAD * (portrait ? 0.7 : 0.9), top: PAD * (portrait ? 0.7 : 0.35), textAlign: 'right', transform: `translateY(${-dr * 0.6}px)` }}>
      <div style={{ overflow: 'hidden', paddingBottom: '0.08em' }}><div style={{ transform: `translateY(${(1 - tp) * 105}%)`, fontFamily: fonts.display, ...NUM, fontStyle: 'italic', fontWeight: 900, fontSize: nsz, lineHeight: 0.92, letterSpacing: '-0.05em', color: p.bg }}>{issue(scene)}</div></div>
    </div>
    <div style={{ position: 'absolute', left: px, bottom: py, width: pw, clipPath: `inset(${(1 - pt) * 100}% 0 0 0)`, background: p.bg, transform: `translateY(${dr * 0.5}px)` }}>
      <div style={{ height: 10, background: ac }} />
      <div style={{ padding: `${portrait ? 30 : 30}px ${ipad}px ${portrait ? 38 : 40}px` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <Rise d={14}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 28 : 26, fontWeight: 700, ...NUM, letterSpacing: '0.06em', color: ac }}>PLATE {issue(scene)}{scene.section >= 0 ? ` · ${pad2(scene.section + 1)}/${pad2(Math.max(scene.sections, scene.section + 1))}` : ''}</div></Rise>
          {data.chip && <Rise d={16}><div style={{ fontFamily: fonts.display, ...NUM, fontWeight: 700, fontSize: portrait ? 44 : 46, color: p.ink, lineHeight: 1 }}>{data.chip}</div></Rise>}
        </div>
        {data.caption && <Rise d={16} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: cs, lineHeight: 1.14, letterSpacing: '-0.03em', color: p.ink, ...WORD }}>{data.caption}</div></Rise>}
        {data.sub && <Rise d={24} style={{ marginTop: 18 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 34 : 32, fontWeight: 500, lineHeight: 1.35, color: p.muted, ...WORD }}>{data.sub}</div></Rise>}
      </div>
    </div>
  </div>;
};

/* ───────────── photo.side : 비대칭 격자 + 풀 인용 ───────────── */
export const PhotoSide: React.FC<PartProps<'photo.side'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ph = photos[0], mir = !portrait && scene.index % 2 === 1;
  const dr = drift(f, dur, 12);
  if (!portrait) {
    const pw = Math.round(W * 0.44), py = PAD * 0.9, phH = H - py * 2, px = mir ? W - PAD - pw : PAD;
    const tx = mir ? PAD : PAD + pw + PAD * 0.9, tw0 = W - pw - 2 * PAD - PAD * 0.9;
    const dh = 250, dw = 300, bt = H - py - dh, ht = py + 150, hh = bt - ht - 34;
    const cs = data.caption ? fitBox([data.caption], tw0, hh - 70, 96, 1.16) : 0;
    return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
      {ph && <Pic ph={ph} dur={dur} x={px} y={py} w={pw} h={phH} from={mir ? 'r' : 'l'} dir={mir ? -1 : 1} />}
      <Crop x={px} y={py} w={pw} h={phH} color={p.ink} len={22} gap={14} d={10} th={1.5} />
      <Brand scene={scene} style={{ left: tx, bottom: PAD * 0.38 }} />
      <div style={{ position: 'absolute', left: tx, top: py, width: tw0 }}><Kick e={e} d={4} n={issue(scene)} right={data.chip} /></div>
      <div style={{ position: 'absolute', left: tx, top: ht, width: tw0, height: hh, transform: `translateY(${dr}px)`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <Rise d={6}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 220, lineHeight: 0.8, height: 110, color: ac }}>“</div></Rise>
        {data.caption && <Rise d={10} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: cs, lineHeight: 1.16, letterSpacing: '-0.03em', color: p.ink, ...WORD }}>{data.caption}</div></Rise>}
      </div>
      {ph && <Detail ph={ph} dur={dur} x={tx} y={bt} w={dw} h={dh} d={14} border={p.bg} />}
      <div style={{ position: 'absolute', left: tx + dw + 34, top: bt, height: dh, width: 2 }}><Rule d={16} color={p.ink} v th={2} /></div>
      <div style={{ position: 'absolute', left: tx + dw + 70, top: bt, width: tw0 - dw - 70, height: dh, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Rise d={18}><div style={{ fontFamily: fonts.body, fontSize: 24, fontWeight: 700, letterSpacing: '0.08em', color: ac }}>DETAIL</div></Rise>
        {data.sub && <Rise d={22}><div style={{ fontFamily: fonts.body, fontSize: 32, lineHeight: 1.4, color: p.ink, ...WORD }}>{data.sub}</div></Rise>}
      </div>
    </div>;
  }
  const ph0 = H * 0.46, py = H * 0.075, pw = W * 0.86, dwid = W * 0.34, dhei = dwid * 0.95;
  const hy = py + ph0 + PAD * 0.9, hh = H - hy - PAD * 2.4 - (data.sub ? 230 : 0), cs = data.caption ? fitBox([data.caption], W - 2 * PAD, hh - 40, 104, 1.16) : 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, width: W - 2 * PAD }}><Kick e={e} d={2} n={issue(scene)} right={data.chip} /></div>
    {ph && <Pic ph={ph} dur={dur} x={0} y={py} w={pw} h={ph0} from="t" />}
    {ph && <Detail ph={ph} dur={dur} x={W - PAD - dwid + 10} y={py + ph0 - dhei * 0.8} w={dwid} h={dhei} d={14} border={p.bg} />}
    <div style={{ position: 'absolute', left: PAD, top: hy, width: W - 2 * PAD, transform: `translateY(${dr}px)` }}>
      <Rise d={6}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 150, lineHeight: 0.8, height: 70, color: ac }}>“</div></Rise>
      {data.caption && <Rise d={10} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: cs, lineHeight: 1.16, letterSpacing: '-0.03em', color: p.ink, ...WORD }}>{data.caption}</div></Rise>}
    </div>
    {data.sub && <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: PAD * 1.5, display: 'flex', gap: 28 }}>
      <div style={{ width: 2 }}><Rule d={16} color={ac} v th={6} /></div>
      <Rise d={20}><div style={{ fontFamily: fonts.body, fontSize: 36, lineHeight: 1.4, color: p.muted, ...WORD }}>{data.sub}</div></Rise>
    </div>}
    <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.6 }} />
  </div>;
};

/* ───────────── photo.pair : 잡지 펼침면 ───────────── */
const Plate: React.FC<{ e: ReturnType<typeof useEd>; ph: KPhoto; n: number; label?: string; d: number; w: number; size?: number; align?: 'left' | 'right' }> = ({ e, ph, n, label, d, w, size = 32, align = 'left' }) => {
  const meta = ph.time ?? ph.date, txt = ph.caption ?? (label ? `${label} ${pad2(n)}` : undefined);
  return <div style={{ width: w, textAlign: align }}>
    <Rise d={d}><div style={{ display: 'flex', alignItems: 'baseline', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 14, fontFamily: e.fonts.body, ...NUM, fontSize: size * 0.8, fontWeight: 700, letterSpacing: '0.06em', color: e.ac }}>FIG. {pad2(n)}{meta && <span style={{ color: e.p.muted, fontWeight: 500 }}>{meta}</span>}</div></Rise>
    {txt && <Rise d={d + 4} dur={22}><div style={{ marginTop: 6, fontFamily: e.fonts.display, fontWeight: 900, fontSize: size * 1.35, lineHeight: 1.2, letterSpacing: '-0.03em', color: e.p.ink, ...WORD }}>{txt}</div></Rise>}
  </div>;
};

export const PhotoPair: React.FC<PartProps<'photo.pair'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, [a, b] = photos, dr = drift(f, dur, 12);
  if (!portrait) {
    const A = { x: PAD, y: PAD * 0.9, w: W * 0.41, h: H * 0.64 }, B = { x: W * 0.5, y: H * 0.28, w: W * 0.38, h: H * 0.62 };
    const sp = ep(f, 0, 40), lsz = data.label ? fitNW([data.label], W * 0.3, 150, 132, 1.1) : 0;
    return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
      <div style={{ position: 'absolute', left: W / 2 - 1, top: 0, height: H * sp, width: 2, background: p.ink, opacity: 0.25 }} />
      {a && <Pic ph={a} dur={dur} {...A} from="b" />}
      {b && <Pic ph={b} dur={dur} {...B} d={8} from="t" dir={-1} />}
      {a && <Crop x={A.x} y={A.y} w={A.w} h={A.h} color={p.ink} len={20} gap={12} d={10} th={1.5} />}
      <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.4 }} />
      <Folio scene={scene} style={{ right: PAD, top: PAD * 0.6 }} />
      <div style={{ position: 'absolute', left: PAD, top: A.y + A.h + 34, width: A.w, transform: `translateY(${dr * 0.5}px)` }}>{a && <Plate e={e} ph={a} n={1} label={data.label} d={14} w={A.w} />}</div>
      <div style={{ position: 'absolute', left: B.x, top: B.y - 118, width: B.w, transform: `translateY(${dr * 0.5}px)` }}>{b && <Plate e={e} ph={b} n={2} label={data.label} d={20} w={B.w} />}</div>
      {data.label && <div style={{ position: 'absolute', left: A.x + A.w - 120, top: B.y + B.h - 150, background: p.bg, padding: '14px 40px 22px 34px', zIndex: 3, boxShadow: `0 0 0 0 ${p.bg}` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: ac }} />
        <Label e={e} text={data.label} w={W * 0.3} max={132} d={12} />
      </div>}
      <div style={{ position: 'absolute', left: B.x + B.w + 36, top: B.y, height: B.h }}><div style={{ height: '100%', width: 2 }}><Rule d={12} color={p.ink} v th={2} /></div></div>
    </div>;
  }
  const A = { x: 0, y: H * 0.085, w: W * 0.82, h: H * 0.34 }, B = { x: W * 0.18, y: H * 0.52, w: W * 0.82, h: H * 0.34 };
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <div style={{ position: 'absolute', top: H * 0.5, left: 0, width: W * ep(f, 0, 40), height: 2, background: p.ink, opacity: 0.25 }} />
    {a && <Pic ph={a} dur={dur} {...A} from="l" />}
    {b && <Pic ph={b} dur={dur} {...B} d={8} from="r" dir={-1} />}
    <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.55 }} />
    <Folio scene={scene} style={{ right: PAD, bottom: PAD * 0.55 }} />
    <div style={{ position: 'absolute', left: PAD, top: A.y + A.h + 24, width: W - 2 * PAD - 120 }}>{a && <Plate e={e} ph={a} n={1} label={data.label} d={14} w={W * 0.62} size={30} />}</div>
    <div style={{ position: 'absolute', left: PAD * 1.4, top: B.y + B.h + 24, width: W * 0.7 }}>{b && <Plate e={e} ph={b} n={2} label={data.label} d={20} w={W * 0.6} size={30} />}</div>
    {data.label && <div style={{ position: 'absolute', left: 0, top: A.y - 64, background: p.bg, padding: '8px 44px 20px', paddingLeft: PAD, zIndex: 3 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: ac }} />
      <Label e={e} text={data.label} w={W * 0.7} max={118} d={12} />
    </div>}
  </div>;
};

/* ───────────── photo.strip : 필름 프루프(contact sheet) ───────────── */
export const PhotoStrip: React.FC<PartProps<'photo.strip'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, n = photos.length, k = clamp(f / (dur * 0.97), 0, 1), t = k * k * (3 - 2 * k);
  const paper = p.bg;
  const label = data.label ?? 'CONTACT SHEET', sel = Math.min(n - 1, portrait ? 2 : 2);
  const holes = (len: number, horizontal: boolean, off: number, thick: number) => {
    const pitch = 46, cnt = Math.ceil(len / pitch) + 3, o = off % pitch;
    return Array.from({ length: cnt }, (_, i) => <div key={i} style={{ position: 'absolute', ...(horizontal ? { left: i * pitch - o, top: 0, width: 24, height: thick } : { top: i * pitch - o, left: 0, height: 24, width: thick }), background: p.ink, borderRadius: 5 }} />);
  };
  if (!portrait) {
    const bandY = H * 0.27, bh = H * 0.55, fh = H * 0.4, fw = Math.round(fh * 1.5), gap = 26, step = fw + gap, x0 = PAD * 0.6, total = n * step - gap, dist = Math.max(0, total + x0 * 2 - W), off = dist * t;
    const fy = bandY + (bh - fh) / 2, bt = ep(f, 0, 24);
    const cxSel = x0 + sel * step - off + fw / 2, ring = clamp((W * 0.7 - cxSel) / (W * 0.2), 0, 1) * ep(f, 36, 1);
    return <div style={{ position: 'absolute', inset: 0, background: p.ink, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.7, right: PAD, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: paper }}>
        <Rise d={2}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontStyle: data.label ? 'normal' : 'italic', fontSize: fitNW([label], W * 0.5, 130, 112, 1.1), letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{label}</div></Rise>
        <Rise d={6}><div style={{ fontFamily: fonts.body, ...NUM, fontSize: 24, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.8, whiteSpace: 'nowrap' }}>PROOF {issue(scene)} · {pad2(n)} FRAMES</div></Rise>
      </div>
      <div style={{ position: 'absolute', left: 0, top: bandY, width: W, height: bh, background: paper, opacity: 0.1 * bt, transform: `scaleY(${bt})` }} />
      <div style={{ position: 'absolute', left: 0, top: bandY + 14, width: W, height: 22, overflow: 'hidden', opacity: 0.9 * bt }}>{holes(W, true, off, 22)}</div>
      <div style={{ position: 'absolute', left: 0, top: bandY + bh - 36, width: W, height: 22, overflow: 'hidden', opacity: 0.9 * bt }}>{holes(W, true, off, 22)}</div>
      {photos.map((ph, i) => {
        const x = x0 + i * step - off;
        return <React.Fragment key={i}>
          <Pic ph={ph} dur={dur} x={x} y={fy} w={fw} h={fh} d={2 + Math.min(i, 5) * 3} from="b" dir={i % 2 ? -1 : 1} />
          <div style={{ position: 'absolute', left: x, top: bandY + 40, fontFamily: fonts.body, ...NUM, fontSize: 21, fontWeight: 700, letterSpacing: '0.06em', color: ac, whiteSpace: 'nowrap', opacity: bt }}>▸ {pad2(i + 1)}<span style={{ color: paper, opacity: 0.65, marginLeft: 14 }}>{pad2(i + 1)}A</span></div>
          <div style={{ position: 'absolute', left: x, top: bandY + bh + 34, width: fw }}><Cap e={e} ph={ph} d={14 + Math.min(i, 5) * 3} n={i + 1} color={paper} size={40} /></div>
        </React.Fragment>;
      })}
      <svg style={{ position: 'absolute', left: cxSel - fw / 2 - 30, top: fy - 34, width: fw + 60, height: fh + 68, overflow: 'visible', transform: 'rotate(-1.5deg)' }} viewBox={`0 0 ${fw + 60} ${fh + 68}`}>
        <rect x={6} y={6} width={fw + 48} height={fh + 56} rx={44} fill="none" stroke={ac} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ring} />
      </svg>
      <Brand scene={scene} color={paper} style={{ left: PAD, bottom: PAD * 0.4 }} />
      <Folio scene={scene} color={paper} style={{ right: PAD, bottom: PAD * 0.4 }} />
    </div>;
  }
  const bandX = PAD * 1.2, bw = W - PAD * 1.9, fw = bw - 130, fh = Math.round(fw / 1.5), step = fh + 100, top0 = H * 0.2, viewH = H * 0.76, total = n * step - 100, dist = Math.max(0, total - viewH + 40), off = dist * t, bt = ep(f, 0, 24);
  const cySel = top0 + 30 + sel * step - off + fh / 2, ring = clamp((H * 0.72 - cySel) / (H * 0.15), 0, 1);
  return <div style={{ position: 'absolute', inset: 0, background: p.ink, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: PAD, top: PAD * 0.9, right: PAD, color: paper }}>
      <Rise d={2}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontStyle: data.label ? 'normal' : 'italic', fontSize: fitNW([label], W - 2 * PAD, 140, 118, 1.1), letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{label}</div></Rise>
      <Rise d={6} style={{ marginTop: 14 }}><div style={{ fontFamily: fonts.body, ...NUM, fontSize: 26, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.8 }}>PROOF {issue(scene)} · {pad2(n)} FRAMES</div></Rise>
    </div>
    <div style={{ position: 'absolute', left: bandX, top: top0, width: bw, height: viewH, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 4%, #000 96%, transparent 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, background: paper, opacity: 0.1 * bt }} />
      <div style={{ position: 'absolute', left: 18, top: 0, width: 22, height: '100%', overflow: 'hidden' }}>{holes(viewH, false, off, 22)}</div>
      <div style={{ position: 'absolute', right: 18, top: 0, width: 22, height: '100%', overflow: 'hidden' }}>{holes(viewH, false, off, 22)}</div>
    </div>
    <div style={{ position: 'absolute', left: bandX, top: top0, width: bw, height: viewH, overflow: 'hidden', zIndex: 2, WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 4%, #000 96%, transparent 100%)' }}>
    {photos.map((ph, i) => {
      const y = 30 + i * step - off;
      return <React.Fragment key={i}>
        <Pic ph={ph} dur={dur} x={65} y={y} w={fw} h={fh} d={2 + Math.min(i, 3) * 4} from="l" dir={i % 2 ? -1 : 1} style={{ zIndex: 2 }} />
        <div style={{ position: 'absolute', left: 65, top: y + fh + 14, width: fw, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Cap e={e} ph={ph} d={12 + Math.min(i, 3) * 4} n={i + 1} color={paper} size={30} />
        </div>
      </React.Fragment>;
    })}
    </div>
    <svg style={{ position: 'absolute', left: bandX + 30, top: cySel - fh / 2 - 26, width: fw + 70, height: fh + 52, overflow: 'visible', transform: 'rotate(1.2deg)', zIndex: 3 }} viewBox={`0 0 ${fw + 70} ${fh + 52}`}>
      <rect x={6} y={6} width={fw + 58} height={fh + 40} rx={40} fill="none" stroke={ac} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ring} />
    </svg>
    <Brand scene={scene} color={paper} style={{ left: PAD, bottom: PAD * 0.45, zIndex: 5 }} />
    <Folio scene={scene} color={paper} style={{ right: PAD, bottom: PAD * 0.45, zIndex: 5 }} />
  </div>;
};
