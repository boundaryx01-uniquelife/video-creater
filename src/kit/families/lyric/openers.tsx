import React from 'react';
import type { PartProps } from '../../schema.ts';
import { fit, life } from '../../motion';
import { Brand, Chips, Dusk, Frame, Hair, KB, Leak, Rise, SE, SERIF, Tiny, WORD, fitNW, lines, pad2, sp, useLy } from './kit';
import { Photo } from '../../../lib/common';

/** 표지: 흐릿한 배경 위에 선명한 사진 액자가 겹겹이 떠오르고, 제목은 가는 명조로 한 줄씩 */
export const OpenerTitle: React.FC<PartProps<'opener.title'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, n = photos.length, tl = lines(data.title);
  const ink = n ? p.onAccent : p.ink, mut = n ? p.onAccent : p.muted;
  const tx = PAD * (portrait ? 1 : 1.5), tW = portrait ? W - 2 * PAD : W * 0.38;
  const ts = fitNW(tl, tW, portrait ? H * 0.2 : H * 0.34, portrait ? 92 : 104, 1.28);
  // 액자 배치: 0번이 가장 크고, 1·2번은 뒤에서 어긋나게 떠오른다
  const rx = portrait ? PAD : W * 0.46, rw = portrait ? W - 2 * PAD : W - rx - PAD, ry = portrait ? PAD * 1.6 : PAD, rh = portrait ? H * 0.46 : H - 2 * PAD;
  const m = n ? fit(photos[0].aspect, rw * (portrait ? 0.8 : 0.72), rh * (portrait ? 0.8 : 0.8)) : { w: 0, h: 0 };
  const cx = rx + rw / 2, cy = ry + rh / 2;
  const mx = cx - m.w / 2 + (portrait ? -rw * 0.05 : -rw * 0.04), my = cy - m.h / 2 + (portrait ? rh * 0.04 : rh * 0.03);
  const s1 = n > 1 ? fit(photos[1].aspect, rw * 0.4, rh * 0.46) : { w: 0, h: 0 }, s2 = n > 2 ? fit(photos[2].aspect, rw * 0.34, rh * 0.4) : { w: 0, h: 0 };
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {n > 0 ? <Dusk ph={photos[0]} dur={dur} dim={0.38} /> : <><Leak at="tr" color={ac} op={0.34} size={0.9} /><Leak at="bl" color={p.surface} op={0.9} size={0.8} />
      <div style={{ position: 'absolute', left: W * (portrait ? 0.15 : 0.62), top: H * (portrait ? 0.5 : 0.1), width: W * (portrait ? 0.9 : 0.34), height: W * (portrait ? 0.9 : 0.34), borderRadius: '50%', border: `1px solid ${ac}`, opacity: 0.5 * sp(f, 4, 50), transform: `rotate(${f * 0.05}deg) scale(${1 + 0.04 * life(f, dur)})` }} />
      <div style={{ position: 'absolute', left: W * (portrait ? 0.3 : 0.7), top: H * (portrait ? 0.56 : 0.2), width: W * (portrait ? 0.6 : 0.26), height: W * (portrait ? 0.6 : 0.26), borderRadius: '50%', border: `1px solid ${p.muted}`, opacity: 0.35 * sp(f, 12, 50), transform: `scale(${1 - 0.05 * life(f, dur)})` }} /></>}
    {n > 2 && <Frame ph={photos[2]} dur={dur} x={mx - s2.w * 0.42} y={my + m.h - s2.h * 0.5} w={s2.w} h={s2.h} d={34} dx={18} dir={-1} />}
    {n > 1 && <Frame ph={photos[1]} dur={dur} x={mx + m.w - s1.w * 0.4} y={my - s1.h * 0.38} w={s1.w} h={s1.h} d={22} dx={-26} />}
    {n > 0 && <Frame ph={photos[0]} dur={dur} x={mx} y={my} w={m.w} h={m.h} d={6} dx={-10} amt={0.08} />}
    {n > 0 && <Leak at="tl" color={ac} op={0.34} size={0.7} screen />}
    <Brand scene={scene} color={mut} style={{ left: PAD * (portrait ? 1 : 1.5), top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', left: tx, width: tW, ...(portrait ? { top: H * 0.62 } : { top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }) }}>
      {data.kicker && <Rise d={8}><div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: portrait ? 30 : 38 }}><div style={{ width: 54 }}><Hair d={8} color={ac === ink ? mut : ac} /></div><Tiny size={portrait ? 22 : 21} color={mut} fonts={fonts}>{data.kicker}</Tiny></div></Rise>}
      {tl.map((l, i) => <Rise key={i} d={14 + i * 9} dur={36} dy={22}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ts, lineHeight: 1.28, letterSpacing: '-0.02em', color: ink, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
      <div style={{ width: portrait ? 90 : 120, margin: `${portrait ? 36 : 44}px 0 ${portrait ? 26 : 32}px` }}><Hair d={34} color={mut} op={0.7} /></div>
      {data.sub && <Rise d={38} dur={34}><div style={{ fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 32 : 30, lineHeight: 1.5, color: mut, opacity: 0.9, letterSpacing: '0.04em', ...WORD }}>{data.sub}</div></Rise>}
      <Chips items={data.chips} d={52} size={portrait ? 22 : 20} color={mut} fonts={fonts} style={{ marginTop: portrait ? 36 : 44 }} />
    </div>
  </div>;
};

/** 사진 콜라주 표지: 세로로 천천히 흐르는 사진 기둥들(서로 반대로, 다른 속도) 위에 중앙 제목 */
export const OpenerCollage: React.FC<PartProps<'opener.collage'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, n = Math.max(1, photos.length), L = life(f, dur);
  const cols = portrait ? 3 : 5, gap = portrait ? 14 : 22, cw = (W - gap * (cols + 1)) / cols;
  const tl = lines(data.title), ts = fitNW(tl, portrait ? W - 2 * PAD : W * 0.62, portrait ? H * 0.18 : H * 0.3, portrait ? 130 : 170, 1.2);
  const aspects = [0.8, 1.25, 1.0, 0.72, 1.15, 0.9];
  return <div style={{ position: 'absolute', inset: 0, background: p.ink, overflow: 'hidden' }}>
    {Array.from({ length: cols }, (_, c) => {
      const up = c % 2 === 0, speed = 120 + (c % 3) * 55, t = sp(f, c * 5, 40);
      const cells = Array.from({ length: 4 }, (_, k) => { const ph = photos[(c * 2 + k * 3 + c) % n] ?? photos[0]; const ar = aspects[(c + k * 2) % aspects.length]; return { ph, h: Math.round(cw / ar * (ar > 1 ? 1 : 1)) , k }; });
      const colH = cells.reduce((a, x) => a + x.h + gap, 0), off = (up ? -1 : 1) * (L - 0.5) * speed - (up ? 0 : colH - H) * 0.0 - (H * 0.12 + c * 40);
      return <div key={c} style={{ position: 'absolute', left: gap + c * (cw + gap), top: (up ? -colH * 0.12 : -colH * 0.42) + off, width: cw, opacity: t, display: 'flex', flexDirection: 'column', gap }}>
        {cells.map((x) => <div key={x.k} style={{ width: cw, height: x.h, position: 'relative', borderRadius: 3, overflow: 'hidden', boxShadow: '0 14px 40px -12px rgba(0,0,0,0.5)', flex: 'none' }}><KB ph={x.ph} dur={dur} amt={0.06} dir={up ? 1 : -1} /></div>)}
      </div>;
    })}
    <div style={{ position: 'absolute', inset: 0, background: p.ink, opacity: 0.5 }} />
    <div style={{ position: 'absolute', inset: 0, background: p.ink, opacity: 0.55 * sp(f, 14, 40), WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 15%, transparent 72%)', maskImage: 'radial-gradient(ellipse at 50% 50%, #000 15%, transparent 72%)' }} />
    <Leak at="br" color={ac} op={0.3} size={0.7} screen />
    <Brand scene={scene} color={p.onAccent} style={{ left: PAD, top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: `0 ${PAD}px` }}>
      {data.kicker && <Rise d={12}><Tiny size={portrait ? 24 : 22} color={p.onAccent} fonts={fonts} track={0.42} style={{ opacity: 0.85 }}>{data.kicker}</Tiny></Rise>}
      <div style={{ margin: `${portrait ? 36 : 40}px 0` }}>{tl.map((l, i) => <Rise key={i} d={18 + i * 9} dur={38} dy={22}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ts, lineHeight: 1.25, letterSpacing: '-0.02em', color: p.onAccent, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}</div>
      <div style={{ width: 80 }}><Hair d={40} color={p.onAccent} op={0.7} /></div>
      {data.sub && <Rise d={48}><div style={{ marginTop: 32, fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 30 : 28, letterSpacing: '0.12em', color: p.onAccent, opacity: 0.9, ...WORD }}>{data.sub}</div></Rise>}
    </div>
  </div>;
};

/** 구간 제목: 가는 숫자 + 제목, 사진이 있으면 흐릿한 배경 위 작은 액자 */
export const SectionTitle: React.FC<PartProps<'section.title'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, has = photos.length > 0, tl = lines(data.title);
  const ink = has ? p.onAccent : p.ink, mut = has ? p.onAccent : p.muted, tW = portrait ? W - 2 * PAD : W * (has ? 0.46 : 0.7);
  const ts = fitNW(tl, tW, portrait ? 300 : 260, portrait ? 112 : 124, 1.25), numS = portrait ? 200 : 260;
  const fr = has ? fit(photos[0].aspect, portrait ? W - 2 * PAD : W * 0.34, portrait ? H * 0.32 : H * 0.66) : { w: 0, h: 0 };
  const total = Math.max(1, data.total);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {has ? <Dusk ph={photos[0]} dur={dur} dim={0.42} /> : <>
      <Leak at={portrait ? 'br' : 'r'} color={ac} op={0.3} size={0.9} />
      <div style={{ position: 'absolute', right: portrait ? -W * 0.1 : PAD, top: portrait ? H * 0.06 : '50%', transform: portrait ? undefined : 'translateY(-50%)', fontFamily: fonts.display, fontWeight: 200, ...{ fontVariantNumeric: 'lining-nums' }, fontSize: portrait ? W * 0.95 : H * 0.95, lineHeight: 1, color: ac, opacity: 0.11 * sp(f, 0, 40), letterSpacing: '-0.04em' }}>{pad2(data.index)}</div></>}
    {has && <Frame ph={photos[0]} dur={dur} x={portrait ? (W - fr.w) / 2 : W - PAD * 1.4 - fr.w} y={portrait ? PAD * 1.3 : (H - fr.h) / 2} w={fr.w} h={fr.h} d={4} dx={-8} amt={0.06} />}
    <Brand scene={scene} color={mut} style={{ left: PAD, top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', left: PAD * (portrait ? 1 : 1.5), width: tW, ...(portrait ? { top: has ? H * 0.5 : H * 0.28 } : { top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }) }}>
      <Rise d={0} dur={30}><div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <span style={{ fontFamily: fonts.display, fontWeight: 200, fontVariantNumeric: 'lining-nums', fontSize: numS, lineHeight: 1, color: has ? p.onAccent : ac, letterSpacing: '-0.03em' }}>{pad2(data.index)}</span>
      </div></Rise>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: `${portrait ? 18 : 22}px 0 ${portrait ? 34 : 40}px` }}>
        {Array.from({ length: total }, (_, i) => <div key={i} style={{ width: i + 1 === data.index ? 64 : 22 }}><Hair d={6 + i * 3} dur={24} color={i + 1 === data.index ? (has ? p.onAccent : ac) : mut} op={i + 1 === data.index ? 1 : 0.5} style={{ height: i + 1 === data.index ? 2 : 1 }} /></div>)}
        <Tiny size={20} color={mut} fonts={fonts} track={0.3} style={{ marginLeft: 14, opacity: 0.8 }}>{data.index} / {data.total}</Tiny>
      </div>
      {tl.map((l, i) => <Rise key={i} d={8 + i * 6} dur={30}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ts, lineHeight: 1.25, letterSpacing: '-0.02em', color: ink, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
      {data.sub && <Rise d={22}><div style={{ marginTop: 26, fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 28 : 26, letterSpacing: '0.1em', color: mut, opacity: 0.9, ...WORD }}>{data.sub}</div></Rise>}
    </div>
  </div>;
};

/** 마무리: 한 장이 화면 가득에서 천천히 물러나며 순간들의 갤러리가 되고, 마지막 한 줄이 놓인다 */
export const OutroThanks: React.FC<PartProps<'outro.thanks'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, n = photos.length, tl = lines(data.title), L = life(f, dur);
  const pull = prog3(f, 6, 62);
  // 최종 갤러리 배치
  const rx = portrait ? PAD : W * 0.44, rw = portrait ? W - 2 * PAD : W - rx - PAD * 1.2, ry = portrait ? PAD * 1.4 : PAD * 1.1, rh = portrait ? H * 0.5 : H - PAD * 2.2;
  const m = n ? fit(photos[0].aspect, rw * (portrait ? 0.8 : 0.72), rh * (portrait ? 0.74 : 0.76)) : { w: 0, h: 0 };
  const fx = rx + (portrait ? 0 : rw * 0.02), fy = ry + rh * (portrait ? 0.02 : 0.14);
  const gx = lerp(0, fx, pull), gy = lerp(0, fy, pull), gw = lerp(W, m.w, pull), gh = lerp(H, m.h, pull);
  const s1 = n > 1 ? fit(photos[1].aspect, rw * 0.34, rh * 0.38) : { w: 0, h: 0 }, s2 = n > 2 ? fit(photos[2].aspect, rw * 0.3, rh * 0.34) : { w: 0, h: 0 };
  const ts = fitNW(tl, portrait ? W - 2 * PAD : W * 0.36, portrait ? H * 0.16 : H * 0.3, portrait ? 84 : 92, 1.3);
  const tx = PAD * (portrait ? 1 : 1.5), tW = portrait ? W - 2 * PAD : W * 0.36, hasPh = n > 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.ink }}>
    {hasPh ? <Dusk ph={photos[0]} dur={dur} dim={0.46} opacity={pull} /> : <><Leak at="tr" color={ac} op={0.4} size={0.9} screen /><Leak at="bl" color={ac} op={0.25} size={0.8} screen /></>}
    {n > 2 && <div style={{ position: 'absolute', left: fx + m.w * 0.56, top: fy + m.h - s2.h * 0.45, opacity: 0 }} />}
    {n > 2 && <Frame ph={photos[2]} dur={dur} x={fx + m.w - s2.w * 0.62} y={fy + m.h - s2.h * 0.55} w={s2.w} h={s2.h} d={56} dx={-14} dy={-6} dir={-1} />}
    {n > 1 && <Frame ph={photos[1]} dur={dur} x={fx - s1.w * 0.34} y={fy + m.h * 0.52} w={s1.w} h={s1.h} d={44} dx={16} dy={-8} z={3} />}
    {hasPh && <div style={{ position: 'absolute', left: gx, top: gy, width: gw, height: gh, boxShadow: pull > 0.02 ? undefined : 'none', borderRadius: 3 * pull, overflow: 'hidden', zIndex: 2, filter: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)', zIndex: 2 }} /><KB ph={photos[0]} dur={dur} amt={0.1} base={1.0} />
    </div>}
    {hasPh && <div style={{ position: 'absolute', left: gx, top: gy, width: gw, height: gh, boxShadow: `0 40px 90px -24px rgba(0,0,0,${0.6 * pull})`, borderRadius: 3 * pull, zIndex: 1 }} />}
    <Brand scene={scene} color={p.onAccent} style={{ left: PAD * (portrait ? 1 : 1.5), top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', left: tx, width: tW, zIndex: 6, ...(portrait ? { top: H * 0.66 } : { top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }) }}>
      <Rise d={hasPh ? 66 : 8} dur={36}><div style={{ width: 54, marginBottom: 34 }}><Hair d={hasPh ? 66 : 8} color={p.onAccent} op={0.7} /></div></Rise>
      {tl.map((l, i) => <Rise key={i} d={(hasPh ? 70 : 12) + i * 10} dur={40} dy={22}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: ts, lineHeight: 1.32, letterSpacing: '-0.02em', color: p.onAccent, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
      {data.message && <Rise d={(hasPh ? 92 : 34)} dur={36}><div style={{ marginTop: 34, fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 30 : 28, letterSpacing: '0.08em', lineHeight: 1.55, color: p.onAccent, opacity: 0.88, ...WORD }}>{data.message}</div></Rise>}
      <Chips items={data.chips} d={(hasPh ? 104 : 46)} size={portrait ? 22 : 20} color={p.onAccent} fonts={fonts} style={{ marginTop: 38, opacity: 0.8 }} />
    </div>
    <div style={{ position: 'absolute', inset: 0, background: p.ink, opacity: 0.5 * sp(f, dur - 26, 24), zIndex: 9 }} />
  </div>;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog3 = (f: number, s: number, d: number) => sp(f, s, d);
