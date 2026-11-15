import React from 'react';
import type { KPhoto, PartProps } from '../../schema.ts';
import { Brand, Folio, NUM, Pic, Rise, Rule, drift, ep, fitBox, fitNW, pad2, useEd } from './kit';

type Ed = ReturnType<typeof useEd>;
const WORD: React.CSSProperties = { wordBreak: 'keep-all' };

/** 사진 한 장의 짧은 글(캡션 + 시각) */
export const Cap: React.FC<{ e: Ed; ph: KPhoto; d: number; n?: number; color?: string; sub?: string; size?: number; align?: 'left' | 'right' }> = ({ e, ph, d, n, color, sub, size = 30, align }) => {
  const c = color ?? e.p.ink, meta = ph.time ?? ph.date;
  if (!ph.caption && !meta) return n != null ? <Rise d={d}><div style={{ fontFamily: e.fonts.display, ...NUM, fontSize: size * 1.5, fontWeight: 700, color: e.ac }}>{pad2(n)}</div></Rise> : null;
  return <Rise d={d} dur={22}><div style={{ textAlign: align, fontFamily: e.fonts.body, fontSize: size, fontWeight: 600, lineHeight: 1.3, color: c, ...WORD }}>
    {n != null && <span style={{ fontFamily: e.fonts.display, ...NUM, fontWeight: 700, color: e.ac, marginRight: 14, fontSize: size * 1.15 }}>{pad2(n)}</span>}
    {ph.caption}{meta && <span style={{ ...NUM, color: e.p.muted, fontWeight: 500, marginLeft: ph.caption ? 14 : 0 }}>{sub ?? meta}</span>}
  </div></Rise>;
};

export const Label: React.FC<{ e: Ed; text?: string; w: number; max?: number; d?: number; color?: string }> = ({ e, text, w, max = 120, d = 6, color }) => {
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

