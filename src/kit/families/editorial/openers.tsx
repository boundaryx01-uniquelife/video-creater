import React from 'react';
import type { KPhoto, PartProps } from '../../schema.ts';
import { Brand, Kicker, NUM, Pic, Rise, Rule, drift, ep, fitNW, lines, pad2, useEd } from './kit';

type Ed = ReturnType<typeof useEd>;

/** 하단 정보 칩: 헤어라인 위에 놓이는 작은 정보 목록 */
const Chips: React.FC<{ e: Ed; chips?: string[]; d: number; row?: boolean; size?: number }> = ({ e, chips, d, row, size = 28 }) => {
  if (!chips?.length) return null;
  return <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', gap: row ? 36 : 0, width: row ? undefined : '100%' }}>
    {chips.slice(0, 4).map((c, i) => <div key={i} style={{ flex: row ? 1 : undefined, minWidth: 0 }}>
      <Rule d={d + i * 4} color={e.p.ink} th={1.5} />
      <Rise d={d + 4 + i * 4}><div style={{ fontFamily: e.fonts.body, fontSize: size, fontWeight: 600, color: e.p.ink, padding: '12px 0', wordBreak: 'keep-all' }}>{c}</div></Rise>
    </div>)}
  </div>;
};

/** 사진이 없는 표지·마무리용 강조색 면 */
const Panel: React.FC<{ e: Ed; x: number; y: number; w: number; h: number; big?: string; dur: number }> = ({ e, x, y, w, h, big, dur }) => {
  const t = ep(e.f, 0, 26), sc = 1 + (e.f / dur) * 0.06;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: e.ac, clipPath: `inset(${(1 - t) * 100}% 0 0 0)`, overflow: 'hidden' }}>
    {big && <div style={{ position: 'absolute', left: '8%', bottom: '-6%', fontFamily: e.fonts.display, fontWeight: 900, fontSize: Math.min(w, h) * 0.62, lineHeight: 1, color: e.p.onAccent, opacity: 0.16, whiteSpace: 'nowrap', transform: `scale(${sc})`, transformOrigin: 'left bottom' }}>{big}</div>}
  </div>;
};

const Framed: React.FC<{ e: Ed; ph: KPhoto; dur: number; x: number; y: number; w: number; h: number; d: number; from?: 'l' | 'r' | 't' | 'b'; dir?: 1 | -1 }> = ({ e, ph, dur, x, y, w, h, d, from, dir }) => {
  const t = ep(e.f, d, 12), b = 10;
  return <>
    <div style={{ position: 'absolute', left: x - b, top: y - b, width: w + 2 * b, height: h + 2 * b, background: e.p.bg, opacity: t }} />
    <Pic ph={ph} dur={dur} x={x} y={y} w={w} h={h} d={d} from={from} dir={dir} />
  </>;
};

export const OpenerTitle: React.FC<PartProps<'opener.title'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, tl = lines(data.title);
  const px = portrait ? 0 : Math.round(W * 0.46), mh = portrait ? Math.round(H * 0.5) : H, has = photos.length > 0;
  const tw0 = portrait ? W - 2 * PAD : px - PAD - 60, th0 = portrait ? H - mh - PAD * 3 - 260 : H * 0.46;
  const ts = fitNW(tl, tw0, th0, portrait ? 150 : 158, 1.1);
  const dr = drift(f, dur, 14);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {has ? <Pic ph={photos[0]} dur={dur} x={px} y={0} w={W - px} h={mh} from={portrait ? 't' : 'b'} /> : <Panel e={e} x={px} y={0} w={W - px} h={mh} big={data.kicker} dur={dur} />}
    {photos[1] && <Framed e={e} ph={photos[1]} dur={dur} d={16} dir={-1} x={portrait ? W - PAD - 240 : px - 70} y={portrait ? mh - 340 : H - PAD - 360} w={portrait ? 240 : 250} h={portrait ? 300 : 320} from="b" />}
    {photos[2] && <Framed e={e} ph={photos[2]} dur={dur} d={24} x={portrait ? W - PAD - 240 - 230 : W - PAD - 210} y={portrait ? mh - 280 : PAD} w={portrait ? 210 : 210} h={portrait ? 240 : 260} from="t" />}
    <Brand scene={scene} color={has ? undefined : p.muted} style={{ left: PAD, top: PAD * 0.75 }} />
    <div style={{ position: 'absolute', left: PAD, width: tw0 + (portrait ? 0 : 0), top: portrait ? mh + PAD * 0.8 : PAD * 2.1, bottom: PAD, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ transform: `translateY(${dr}px)` }}>
        {data.kicker && <div style={{ marginBottom: portrait ? 28 : 34 }}><Kicker d={4} color={ac} size={portrait ? 30 : 28} fonts={fonts}>{data.kicker}</Kicker></div>}
        {tl.map((l, i) => <Rise key={i} d={6 + i * 4} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: ts, lineHeight: 1.1, letterSpacing: '-0.035em', color: p.ink, wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
        {data.sub && <Rise d={16} dur={22} style={{ marginTop: 30 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 38 : 34, fontWeight: 400, lineHeight: 1.4, color: p.muted, maxWidth: tw0, wordBreak: 'keep-all' }}>{data.sub}</div></Rise>}
      </div>
      <div style={{ width: portrait ? '100%' : Math.min(tw0, 440) }}><Chips e={e} chips={data.chips} d={26} size={portrait ? 30 : 28} /></div>
    </div>
  </div>;
};

/** 콜라주: 가로·세로 격자 좌표(분수). n장에 따라 칸을 합친다 */
const RL: Record<number, number[][]> = {
  6: [[0, 0, .28, .62], [.28, 0, .24, .62], [.52, 0, .26, .58], [.52, .58, .26, .42], [.78, 0, .22, .42], [.78, .42, .22, .58]],
  5: [[0, 0, .28, .62], [.28, 0, .24, .62], [.52, 0, .26, .58], [.52, .58, .26, .42], [.78, 0, .22, 1]],
  4: [[0, 0, .52, .62], [.52, 0, .26, 1], [.78, 0, .22, .42], [.78, .42, .22, .58]],
  3: [[0, 0, .52, .62], [.52, 0, .26, 1], [.78, 0, .22, 1]],
};
const RP: Record<number, number[][]> = {
  6: [[0, .36, .6, .22], [.6, .36, .4, .22], [0, .58, .4, .22], [.4, .58, .6, .22], [0, .8, .6, .2], [.6, .8, .4, .2]],
  5: [[0, .36, .6, .22], [.6, .36, .4, .22], [0, .58, .4, .22], [.4, .58, .6, .22], [0, .8, 1, .2]],
  4: [[0, .36, .6, .32], [.6, .36, .4, .32], [0, .68, .4, .32], [.4, .68, .6, .32]],
  3: [[0, .36, 1, .3], [0, .66, .5, .34], [.5, .66, .5, .34]],
};

export const OpenerCollage: React.FC<PartProps<'opener.collage'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, tl = lines(data.title);
  const n = Math.min(6, Math.max(3, photos.length)), rects = (portrait ? RP : RL)[n], g = 5;
  const bx = PAD, bw = portrait ? W - 2 * PAD : W * 0.5 - PAD - 40, by = portrait ? PAD * 1.6 : H * 0.62 + 36, bh = portrait ? H * 0.36 - PAD * 1.6 - 30 : H * 0.38 - 36 - PAD * 0.6;
  const ts = fitNW(tl, bw, bh - (data.sub ? 130 : 60), portrait ? 170 : 130, 1.08);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {photos.slice(0, n).map((ph, i) => { const [x, y, w, h] = rects[i]; return <Pic key={i} ph={ph} dur={dur} dir={i % 2 ? -1 : 1} d={2 + i * 4} from={i % 2 ? 't' : 'b'} x={x * W + g} y={y * H + g} w={w * W - 2 * g} h={h * H - 2 * g} />; })}
    <Brand scene={scene} style={{ left: PAD, top: PAD * 0.7 }} />
    <div style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {data.kicker && <div style={{ marginBottom: 20 }}><Kicker d={6} color={ac} size={portrait ? 30 : 26} fonts={fonts}>{data.kicker}</Kicker></div>}
      {tl.map((l, i) => <Rise key={i} d={6 + i * 4} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: ts, lineHeight: 1.08, letterSpacing: '-0.035em', color: p.ink, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
      {data.sub && <Rise d={16} style={{ marginTop: 22 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 36 : 32, color: p.muted, wordBreak: 'keep-all' }}>{data.sub}</div></Rise>}
    </div>
    <div style={{ position: 'absolute', left: bx, top: by - 18, width: bw * ep(f, 4, 30) }}><Rule d={4} color={p.ink} th={2} /></div>
  </div>;
};

/* ───────────── outro.thanks : 잡지 뒷표지·판권면 ───────────── */
type OR = { k: 'ph' | 'ac'; r: [number, number, number, number] };
const OL: Record<number, OR[]> = {
  3: [{ k: 'ph', r: [.52, 0, .27, .64] }, { k: 'ph', r: [.79, .14, .21, .5] }, { k: 'ph', r: [.52, .64, .34, .36] }, { k: 'ac', r: [.86, .64, .14, .36] }, { k: 'ac', r: [.79, 0, .21, .14] }],
  2: [{ k: 'ph', r: [.52, 0, .3, 1] }, { k: 'ph', r: [.82, .22, .18, .78] }, { k: 'ac', r: [.82, 0, .18, .22] }],
  1: [{ k: 'ph', r: [.52, 0, .48, .78] }, { k: 'ac', r: [.52, .78, .48, .22] }],
  0: [{ k: 'ac', r: [.52, 0, .48, 1] }],
};
const OP: Record<number, OR[]> = {
  3: [{ k: 'ph', r: [0, 0, .58, .26] }, { k: 'ph', r: [.58, 0, .42, .4] }, { k: 'ph', r: [0, .26, .58, .14] }],
  2: [{ k: 'ph', r: [0, 0, .6, .4] }, { k: 'ph', r: [.6, 0, .4, .4] }],
  1: [{ k: 'ph', r: [0, 0, 1, .4] }],
  0: [{ k: 'ac', r: [0, 0, 1, .4] }],
};

export const OutroThanks: React.FC<PartProps<'outro.thanks'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, tl = lines(data.title), n = Math.min(3, photos.length), rects = (portrait ? OP : OL)[n];
  const paper = p.bg, g = 5, dr = drift(f, dur, 12);
  const tx = PAD, tw0 = portrait ? W - 2 * PAD : W * 0.52 - PAD - 70, top = portrait ? H * 0.4 + PAD * 0.9 : PAD * 1.3;
  const chips = (data.chips ?? []).slice(0, 4), seed = Array.from(data.title).reduce((a, c) => a + c.charCodeAt(0), 7);
  const ts = fitNW(tl, tw0, portrait ? H * 0.26 : H * 0.34, portrait ? 150 : 128, 1.08);
  let pi = 0;
  const bars = Array.from({ length: 34 }, (_, i) => ({ w: 2 + ((seed * (i + 3) * 7) % 5), gap: 3 + ((seed + i * 5) % 4) }));
  return <div style={{ position: 'absolute', inset: 0, background: p.ink, overflow: 'hidden' }}>
    {rects.map((q, i) => {
      const [x, y, w, h] = q.r, X = x * W + g, Y = y * H + g, Wd = w * W - 2 * g, Ht = h * H - 2 * g;
      if (q.k === 'ph') { const ph = photos[pi++]; return <Pic key={i} ph={ph} dur={dur} dir={i % 2 ? -1 : 1} d={2 + i * 5} from={i % 2 ? 't' : 'b'} x={X} y={Y} w={Wd} h={Ht} />; }
      const t = ep(f, 6 + i * 4, 26);
      return <div key={i} style={{ position: 'absolute', left: X, top: Y, width: Wd, height: Ht, background: ac, clipPath: `inset(${(1 - t) * 100}% 0 0 0)`, overflow: 'hidden' }}>
        {i === rects.length - 1 && n > 0 && !portrait && <div style={{ position: 'absolute', left: 28, bottom: 12, fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 900, fontSize: Math.min(Wd, Ht) * 0.5, color: p.onAccent, opacity: 0.95, whiteSpace: 'nowrap' }}>Fin.</div>}
        {n === 0 && <div style={{ position: 'absolute', left: '8%', bottom: '-4%', fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 900, fontSize: Math.min(Wd, Ht) * 0.6, color: p.onAccent, opacity: 0.2, whiteSpace: 'nowrap', transform: `scale(${1 + (f / dur) * 0.05})`, transformOrigin: 'left bottom' }}>Fin.</div>}
      </div>;
    })}
    <Brand scene={scene} color={paper} style={{ left: PAD, top: PAD * 0.6, opacity: 0.85 }} />
    <div style={{ position: 'absolute', left: tx, width: tw0, top, bottom: PAD * 0.8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ transform: `translateY(${dr}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: portrait ? 26 : 34 }}>
          <div style={{ width: 90 * ep(f, 2, 24), height: 8, background: ac }} />
          <Rise d={4}><span style={{ fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 500, fontSize: portrait ? 40 : 38, color: paper, opacity: 0.85 }}>Fin.</span></Rise>
        </div>
        {tl.map((l, i) => <Rise key={i} d={4 + i * 4} dur={22}><div style={{ fontFamily: fonts.display, fontStyle: i === tl.length - 1 && tl.length > 1 ? 'italic' : 'normal', fontWeight: i === tl.length - 1 && tl.length > 1 ? 500 : 900, fontSize: ts, lineHeight: 1.1, letterSpacing: '-0.035em', color: paper, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
        {data.message && <Rise d={16} style={{ marginTop: 28 }}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 40 : 36, lineHeight: 1.4, color: paper, opacity: 0.75, wordBreak: 'keep-all' }}>{data.message}</div></Rise>}
      </div>
      <div>
        {chips.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${portrait ? 2 : Math.min(3, chips.length)}, 1fr)`, columnGap: 36, rowGap: 22, marginBottom: 34 }}>
          {chips.map((c, i) => <div key={i} style={{ minWidth: 0 }}>
            <Rule d={22 + i * 4} color={paper} th={1.5} style={{ opacity: 0.6 }} />
            <Rise d={26 + i * 4}><div style={{ marginTop: 10, fontFamily: fonts.body, ...NUM, fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', color: ac }}>{pad2(i + 1)}</div></Rise>
            <Rise d={28 + i * 4}><div style={{ marginTop: 4, fontFamily: fonts.body, fontSize: portrait ? 32 : 30, fontWeight: 600, color: paper, wordBreak: 'keep-all' }}>{c}</div></Rise>
          </div>)}
        </div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', opacity: ep(f, 34, 20) }}>
          <div style={{ fontFamily: fonts.body, ...NUM, fontSize: 22, fontWeight: 500, letterSpacing: '0.08em', color: paper, opacity: 0.7, lineHeight: 1.6 }}>{scene.brand ? <>© {scene.brand}<br /></> : null}N° {pad2(scene.index + 1)} · END</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 70, background: paper, padding: '8px 12px' }}>{bars.map((b, i) => <div key={i} style={{ width: b.w, height: '100%', background: p.ink, marginRight: b.gap }} />)}</div>
        </div>
      </div>
    </div>
  </div>;
};
