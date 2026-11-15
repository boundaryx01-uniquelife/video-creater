import React from 'react';
import type { KPhoto, PartProps } from '../../schema.ts';
import { Brand, Folio, NUM, Pic, Rise, Rule, drift, ep, fitBox, fitNW, pad2, useEd } from './kit';

type Ed = ReturnType<typeof useEd>;
const WORD: React.CSSProperties = { wordBreak: 'keep-all' };

/** 사진 한 장의 짧은 글(캡션 + 시각) */
const Cap: React.FC<{ e: Ed; ph: KPhoto; d: number; n?: number; color?: string; sub?: string; size?: number; align?: 'left' | 'right' }> = ({ e, ph, d, n, color, sub, size = 30, align }) => {
  const c = color ?? e.p.ink, meta = ph.time ?? ph.date;
  if (!ph.caption && !meta) return n != null ? <Rise d={d}><div style={{ fontFamily: e.fonts.display, ...NUM, fontSize: size * 1.5, fontWeight: 700, color: e.ac }}>{pad2(n)}</div></Rise> : null;
  return <Rise d={d} dur={22}><div style={{ textAlign: align, fontFamily: e.fonts.body, fontSize: size, fontWeight: 600, lineHeight: 1.3, color: c, ...WORD }}>
    {n != null && <span style={{ fontFamily: e.fonts.display, ...NUM, fontWeight: 700, color: e.ac, marginRight: 14, fontSize: size * 1.15 }}>{pad2(n)}</span>}
    {ph.caption}{meta && <span style={{ ...NUM, color: e.p.muted, fontWeight: 500, marginLeft: ph.caption ? 14 : 0 }}>{sub ?? meta}</span>}
  </div></Rise>;
};

const Label: React.FC<{ e: Ed; text?: string; w: number; max?: number; d?: number; color?: string }> = ({ e, text, w, max = 120, d = 6, color }) => {
  if (!text) return null;
  const s = fitNW([text], w, max * 1.2, max, 1.1);
  return <Rise d={d} dur={22}><div style={{ fontFamily: e.fonts.display, fontWeight: 900, fontSize: s, lineHeight: 1.1, letterSpacing: '-0.035em', color: color ?? e.p.ink, whiteSpace: 'nowrap' }}>{text}</div></Rise>;
};

/** 구간 제목 */
export const SectionTitle: React.FC<PartProps<'section.title'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, has = photos.length > 0, tl = data.title.split('\n');
  const px = portrait ? 0 : Math.round(W * 0.66), ph = portrait ? Math.round(H * 0.4) : H;
  const nsz = portrait ? (has ? 400 : 760) : has ? 540 : 860, dr = drift(f, dur, 24);
  const tw0 = portrait ? W - 2 * PAD : has ? px - 2 * PAD : W * 0.46;
  const ts = fitNW(tl, tw0, portrait ? 300 : 230, portrait ? 130 : 120, 1.1);
  const segs = Array.from({ length: Math.max(1, data.total) }, (_, i) => i + 1);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {has && <Pic ph={photos[0]} dur={dur} x={px} y={0} w={W - px} h={ph} from={portrait ? 't' : 'l'} />}
    <Brand scene={scene} style={{ left: PAD, top: PAD * 0.75 }} />
    <div style={{ position: 'absolute', left: PAD, top: portrait ? (has ? ph + 20 : PAD * 1.8) : PAD * 1.3, ...(has || portrait ? {} : { right: PAD, textAlign: 'right', left: undefined }), transform: `translateY(${dr}px)` }}>
      <Rise d={0} dur={34}><div style={{ fontFamily: fonts.display, ...NUM, fontWeight: 900, fontSize: nsz, lineHeight: 0.86, letterSpacing: '-0.04em', color: ac, ...(has || portrait ? {} : { marginRight: -20 }) }}>{pad2(data.index)}</div></Rise>
    </div>
    <div style={{ position: 'absolute', left: PAD, width: tw0, bottom: PAD * (portrait ? 1.1 : 0.9) }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 34, alignItems: 'center' }}>
        {segs.map((s) => <div key={s} style={{ width: 46 }}><Rule d={6 + s * 3} color={s === data.index ? ac : p.muted} th={s === data.index ? 8 : 2} /></div>)}
        <span style={{ fontFamily: fonts.body, ...NUM, fontSize: 24, fontWeight: 600, color: p.muted, marginLeft: 12, opacity: ep(f, 14) }}>{pad2(data.index)} / {pad2(data.total)}</span>
      </div>
      {tl.map((l, i) => <Rise key={i} d={6 + i * 4} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: ts, lineHeight: 1.1, letterSpacing: '-0.035em', color: p.ink, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
      {data.sub && <Rise d={24} style={{ marginTop: 22 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 38 : 34, color: p.muted, ...WORD }}>{data.sub}</div></Rise>}
    </div>
  </div>;
};

export const PhotoFull: React.FC<PartProps<'photo.full'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts } = e, ph = photos[0];
  const cw = W - 2 * PAD - (data.chip ? 240 : 0), cs = data.caption ? fitBox([data.caption], cw, portrait ? 300 : 200, portrait ? 104 : 96, 1.12) : 0, dr = drift(f, dur, 16);
  return <div style={{ position: 'absolute', inset: 0, background: p.ink }}>
    {ph && <Pic ph={ph} dur={dur} x={0} y={0} w={W} h={H} from="b" />}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.22) 38%, rgba(0,0,0,0) 58%), linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 20%)' }} />
    <Brand scene={scene} color={p.bg} style={{ left: PAD, top: PAD * 0.75 }} />
    <Folio scene={scene} color={p.bg} style={{ right: PAD, top: PAD * 0.75 }} />
    <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: PAD * 0.9, transform: `translateY(${dr}px)` }}>
      <div style={{ marginBottom: 26 }}><Rule d={8} color={p.bg} th={2} style={{ opacity: 0.85 }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40 }}>
        <div style={{ minWidth: 0 }}>
          {data.caption && <Rise d={12} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: cs, lineHeight: 1.12, letterSpacing: '-0.03em', color: p.bg, ...WORD }}>{data.caption}</div></Rise>}
          {data.sub && <Rise d={20} style={{ marginTop: 16 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 36 : 32, fontWeight: 500, color: p.bg, opacity: 0.88, ...WORD }}>{data.sub}</div></Rise>}
        </div>
        {data.chip && <Rise d={22}><div style={{ fontFamily: fonts.display, ...NUM, fontWeight: 700, fontSize: portrait ? 56 : 64, color: p.bg, whiteSpace: 'nowrap' }}>{data.chip}</div></Rise>}
      </div>
    </div>
  </div>;
};

export const PhotoSide: React.FC<PartProps<'photo.side'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ph = photos[0], right = !portrait && scene.index % 2 === 1;
  const pw = portrait ? W : Math.round(W * 0.56), phh = portrait ? Math.round(H * 0.56) : H, px = right ? W - pw : 0;
  const tx = portrait ? PAD : right ? PAD : pw + PAD * 0.9, tw0 = portrait ? W - 2 * PAD : W - pw - PAD * 1.9;
  const cs = data.caption ? fitBox([data.caption], tw0, portrait ? 330 : 400, portrait ? 112 : 92, 1.16) : 0, dr = drift(f, dur, 14);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {ph && <Pic ph={ph} dur={dur} x={px} y={0} w={pw} h={phh} from={portrait ? 't' : right ? 'r' : 'l'} dir={right ? -1 : 1} />}
    <Brand scene={scene} style={{ left: portrait ? PAD : tx, [portrait ? 'bottom' : 'top']: PAD * 0.75 }} />
    {!portrait && <Folio scene={scene} style={{ left: tx, top: PAD * 0.75 + 44 }} />}
    <div style={{ position: 'absolute', left: tx, width: tw0, top: portrait ? phh + PAD * 0.9 : PAD * 2.2, bottom: portrait ? PAD * 1.6 : PAD * 1.6, display: 'flex', flexDirection: 'column', justifyContent: portrait ? 'flex-start' : 'center', transform: `translateY(${dr}px)` }}>
      {data.chip && <Rise d={6} style={{ marginBottom: 20 }}><div style={{ fontFamily: fonts.display, ...NUM, fontWeight: 700, fontSize: portrait ? 56 : 64, color: ac, lineHeight: 1 }}>{data.chip}</div></Rise>}
      <div style={{ marginBottom: 28, width: 120 }}><Rule d={8} color={p.ink} th={4} /></div>
      {data.caption && <Rise d={10} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: cs, lineHeight: 1.16, letterSpacing: '-0.03em', color: p.ink, ...WORD }}>{data.caption}</div></Rise>}
      {data.sub && <Rise d={20} style={{ marginTop: 24 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 36 : 32, lineHeight: 1.4, color: p.muted, ...WORD }}>{data.sub}</div></Rise>}
    </div>
  </div>;
};

export const PhotoPair: React.FC<PartProps<'photo.pair'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, p } = e, [a, b] = photos;
  const A = portrait ? { x: 0, y: H * 0.14, w: W * 0.8, h: H * 0.33 } : { x: PAD, y: 0, w: W * 0.4, h: H * 0.76 };
  const B = portrait ? { x: W * 0.2, y: H * 0.54, w: W * 0.8, h: H * 0.33 } : { x: W * 0.5, y: H * 0.24, w: W * 0.5, h: H * 0.76 };
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {a && <Pic ph={a} dur={dur} {...A} from="b" />}
    {b && <Pic ph={b} dur={dur} {...B} d={8} from="t" dir={-1} />}
    {portrait ? <>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 1.1, right: PAD }}><Label e={e} text={data.label} w={W - 2 * PAD} max={120} /></div>
      {a && <div style={{ position: 'absolute', left: PAD, top: A.y + A.h + 16, width: W - 2 * PAD }}><Cap e={e} ph={a} d={16} n={1} size={32} /></div>}
      {b && <div style={{ position: 'absolute', left: B.x, top: B.y + B.h + 16, width: W - B.x - PAD }}><Cap e={e} ph={b} d={22} n={2} size={32} /></div>}
      <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.7 }} />
      <Folio scene={scene} style={{ right: PAD, bottom: PAD * 0.7 }} />
    </> : <>
      <div style={{ position: 'absolute', left: PAD, top: A.y + A.h + 28, width: A.w }}>
        <Label e={e} text={data.label} w={A.w} max={96} />
        {a && <div style={{ marginTop: 12 }}><Cap e={e} ph={a} d={16} n={1} /></div>}
      </div>
      {b && <div style={{ position: 'absolute', left: B.x, top: B.y - 78, width: B.w - PAD }}><Cap e={e} ph={b} d={22} n={2} /></div>}
      <Brand scene={scene} style={{ left: W * 0.5, top: PAD * 0.55 }} />
      <Folio scene={scene} style={{ right: PAD, top: PAD * 0.55 }} />
    </>}
  </div>;
};

export const PhotoTrio: React.FC<PartProps<'photo.trio'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p } = e;
  const gap = 28, cw = (W - 2 * PAD - 2 * gap) / 3, hs = [0.46, 0.66, 0.56], y0 = H * 0.8;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {portrait ? <>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 1.1, right: PAD }}><Label e={e} text={data.label} w={W - 2 * PAD} max={120} /></div>
      {photos.slice(0, 3).map((ph, i) => {
        const y = H * (0.17 + i * 0.27), h = H * 0.245, w = W * 0.66, left = i % 2 === 0, x = left ? 0 : W - w, tx = left ? w + 28 : PAD, tww = W - w - 28 - PAD;
        return <React.Fragment key={i}>
          <Pic ph={ph} dur={dur} x={x} y={y} w={w} h={h} d={i * 7} from={left ? 'l' : 'r'} dir={left ? 1 : -1} />
          <div style={{ position: 'absolute', left: tx, top: y, width: tww, height: h, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ width: '100%' }}><Rule d={10 + i * 7} color={p.ink} th={2} /></div>
            <Cap e={e} ph={ph} d={14 + i * 7} n={i + 1} size={32} />
          </div>
        </React.Fragment>;
      })}
      <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.7 }} />
      <Folio scene={scene} style={{ right: PAD, bottom: PAD * 0.7 }} />
    </> : <>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.09, width: cw * 1.3 }}><Label e={e} text={data.label} w={cw * 1.3} max={120} /></div>
      {photos.slice(0, 3).map((ph, i) => <React.Fragment key={i}>
        <Pic ph={ph} dur={dur} x={PAD + i * (cw + gap)} y={y0 - hs[i] * H} w={cw} h={hs[i] * H} d={i * 7} from="b" dir={i % 2 ? -1 : 1} />
        <div style={{ position: 'absolute', left: PAD + i * (cw + gap), top: y0 + 26, width: cw }}><Cap e={e} ph={ph} d={14 + i * 7} n={i + 1} /></div>
      </React.Fragment>)}
      <div style={{ position: 'absolute', left: PAD, top: y0 + 6, width: (W - 2 * PAD) * ep(f, 4, 36), height: 2, background: p.ink }} />
      <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.55 }} />
      <Folio scene={scene} style={{ right: PAD, bottom: PAD * 0.55 }} />
    </>}
  </div>;
};

/** 12×6(가로)·6×12(세로) 격자 좌표 [x,y,w,h] */
const GL: Record<number, number[][]> = {
  6: [[0, 0, 4, 4], [0, 4, 4, 2], [4, 0, 4, 2], [4, 2, 4, 4], [8, 0, 4, 3], [8, 3, 4, 3]],
  5: [[0, 0, 4, 4], [0, 4, 4, 2], [4, 0, 4, 2], [4, 2, 4, 4], [8, 0, 4, 6]],
  4: [[0, 0, 4, 6], [4, 0, 4, 2], [4, 2, 4, 4], [8, 0, 4, 6]],
};
const GP: Record<number, number[][]> = {
  6: [[0, 0, 3, 3], [3, 0, 3, 5], [0, 3, 3, 5], [3, 5, 3, 3], [0, 8, 3, 4], [3, 8, 3, 4]],
  5: [[0, 0, 3, 3], [3, 0, 3, 5], [0, 3, 3, 5], [3, 5, 3, 3], [0, 8, 6, 4]],
  4: [[0, 0, 6, 4], [0, 4, 3, 4], [3, 4, 3, 4], [0, 8, 6, 4]],
};
export const PhotoGrid: React.FC<PartProps<'photo.grid'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, p, fonts, ac } = e, n = Math.min(6, Math.max(4, photos.length)), rs = (portrait ? GP : GL)[n], cx = portrait ? W / 6 : W / 12, cy = portrait ? H / 12 : H / 6, g = 5;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {photos.slice(0, n).map((ph, i) => { const [x, y, w, h] = rs[i]; return <Pic key={i} ph={ph} dur={dur} dir={i % 2 ? -1 : 1} d={i * 4} from={['b', 'l', 't', 'r'][i % 4] as 'b'} x={x * cx + g} y={y * cy + g} w={w * cx - 2 * g} h={h * cy - 2 * g} />; })}
    {scene.brand && <div style={{ position: 'absolute', left: 0, top: 0, background: p.bg, padding: `14px ${PAD * 0.5}px 16px ${PAD}px`, zIndex: 4 }}><div style={{ position: 'relative', height: 30, width: scene.brand.length * 22 + 40 }}><Brand scene={scene} style={{ left: 0, top: 4 }} /></div></div>}
    {data.label && <Rise d={14} style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 4 }}><div style={{ background: ac, color: p.onAccent, fontFamily: fonts.display, fontWeight: 900, fontSize: portrait ? 64 : 56, padding: `${portrait ? 24 : 20}px ${PAD}px ${portrait ? 28 : 24}px ${PAD}px`, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{data.label}</div></Rise>}
  </div>;
};

export const PhotoStrip: React.FC<PartProps<'photo.strip'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p } = e, n = photos.length, k = Math.min(1, f / (dur * 0.98)), t = k * k * (3 - 2 * k);
  const ph0 = portrait ? H * 0.26 : H * 0.5, pw0 = portrait ? W * 0.78 : W * 0.3, gap = portrait ? 96 : 36;
  const step = (portrait ? ph0 : pw0) + gap, total = n * step - gap, view = portrait ? H * 0.78 - PAD * 0.5 : W - 2 * PAD, dist = Math.max(0, total - view), off = dist * t;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg, overflow: 'hidden' }}>
    {photos.map((ph, i) => {
      const x = portrait ? (i % 2 ? W - pw0 : 0) : PAD + i * step - off, y = portrait ? H * 0.22 + i * step - off : H * 0.3 + (i % 2 ? 36 : 0);
      return <React.Fragment key={i}>
        <Pic ph={ph} dur={dur} x={x} y={y} w={pw0} h={ph0} d={portrait ? 0 : Math.min(i, 4) * 4} from={portrait ? 'l' : 'b'} dir={i % 2 ? -1 : 1} />
        <div style={{ position: 'absolute', left: portrait ? (i % 2 ? W - pw0 : PAD) : x, top: y + ph0 + (portrait ? 18 : 24), width: pw0 - (portrait ? PAD : 0) }}><Cap e={e} ph={ph} d={10 + Math.min(i, 4) * 4} n={i + 1} size={portrait ? 30 : 28} /></div>
      </React.Fragment>;
    })}
    {portrait && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H * 0.2, background: p.bg, zIndex: 3 }} />}
    {portrait && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.065, background: p.bg, zIndex: 3 }} />}
    <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 1.1 : PAD * 0.8, right: PAD, zIndex: 4 }}><Label e={e} text={data.label} w={W - 2 * PAD} max={portrait ? 120 : 110} /></div>
    {!portrait && <div style={{ position: 'absolute', left: PAD, top: H * 0.3 + H * 0.5 + 36 + 80, width: (W - 2 * PAD) * ep(f, 4, 40), height: 2, background: p.ink }} />}
    <Brand scene={scene} style={{ left: PAD, bottom: PAD * 0.55, zIndex: 5 }} />
    <Folio scene={scene} style={{ right: PAD, bottom: PAD * 0.55, zIndex: 5 }} />
  </div>;
};
