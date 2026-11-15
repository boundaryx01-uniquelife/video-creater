import React from 'react';
import type { PartProps } from '../../schema.ts';
import { fit, life } from '../../motion';
import { Brand, Dusk, Frame, Hair, KB, Leak, Rise, SHADOW, SERIF, Tiny, WORD, fitBox, fitNW, lines, sp, useLy } from './kit';

/** 큰 문장: 따뜻한 바탕에 가는 명조가 한 줄씩 떠오르고, 강조 줄은 색과 밑줄이 천천히 그려진다 */
export const TextStatement: React.FC<PartProps<'text.statement'>> = ({ data, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ls = data.lines.slice(0, 3), L = life(f, dur);
  const size = fitNW(ls, W - 2 * PAD * (portrait ? 1 : 2.2), (portrait ? H * 0.5 : H * 0.6), portrait ? 104 : 116, 1.5);
  const R = Math.min(W, H) * (portrait ? 0.78 : 0.78);
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Leak at="tr" color={ac} op={0.32} size={0.9} />
    <Leak at="bl" color={p.surface} op={1} size={0.9} />
    <div style={{ position: 'absolute', left: W * 0.5 - R / 2, top: H * 0.5 - R / 2, width: R, height: R, borderRadius: '50%', border: `1px solid ${ac}`, opacity: 0.38 * sp(f, 0, 50), transform: `scale(${0.94 + 0.1 * L}) rotate(${f * 0.04}deg)` }} />
    <div style={{ position: 'absolute', left: W * 0.5 - R * 0.62, top: H * 0.5 - R * 0.62, width: R * 1.24, height: R * 1.24, borderRadius: '50%', border: `1px solid ${p.muted}`, opacity: 0.18 * sp(f, 8, 50), transform: `scale(${1.04 - 0.06 * L})` }} />
    <Brand scene={scene} color={p.muted} style={{ left: PAD, top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: `translateY(${-10 * L}px)` }}>
      <div style={{ width: 1, height: portrait ? 90 : 70, marginBottom: 46 }}><Hair d={0} dur={40} v w="100%" color={ac} /></div>
      {ls.map((l, i) => { const emph = data.emphasis === i; return <Rise key={i} d={10 + i * 16} dur={40} dy={26}>
        <div style={{ display: 'inline-block', position: 'relative', fontFamily: fonts.display, fontWeight: emph ? 400 : SERIF, fontSize: size, lineHeight: 1.5, letterSpacing: '-0.015em', color: emph ? ac : p.ink, whiteSpace: 'nowrap' }}>
          {l}{emph && <div style={{ position: 'absolute', left: 0, right: 0, bottom: size * 0.06 }}><Hair d={10 + i * 16 + 26} dur={50} color={ac} op={0.8} /></div>}
        </div></Rise>; })}
      <div style={{ marginTop: 46, display: 'flex', gap: 14 }}>{[0, 1, 2].map((i) => <Rise key={i} d={44 + i * 6} dy={6}><div style={{ width: 5, height: 5, borderRadius: 5, background: ac, opacity: i === 1 ? 0.9 : 0.4 }} /></Rise>)}</div>
    </div>
  </div>;
};

/** 인용: 아치 모양 액자 사진 + 가는 명조 인용문(사진이 없으면 가운데 정렬) */
export const TextQuote: React.FC<PartProps<'text.quote'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ph = photos[0], L = life(f, dur), ql = lines(data.text);
  const aw = portrait ? W * 0.56 : W * 0.26, ah = portrait ? H * 0.34 : H * 0.72;
  const ax = portrait ? (W - aw) / 2 : PAD * 1.6, ay = portrait ? PAD * 1.5 : (H - ah) / 2;
  const tX = ph ? (portrait ? PAD : ax + aw + PAD * 1.3) : PAD * 1.6, tW = ph ? (portrait ? W - 2 * PAD : W - tX - PAD * 1.6) : W - 2 * PAD * (portrait ? 1 : 2.4);
  const qs = fitNW(ql, tW, portrait ? H * 0.3 : H * 0.5, portrait ? 66 : 74, 1.5);
  const center = !ph;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Leak at={ph ? 'br' : 'tr'} color={ac} op={0.3} size={0.8} />
    <Leak at="bl" color={p.surface} op={1} size={0.9} />
    {ph && <div style={{ position: 'absolute', left: ax - 24, top: ay - 24, width: aw + 48, height: ah + 48, borderRadius: `${aw}px ${aw}px 6px 6px`, border: `1px solid ${ac}`, opacity: 0.5 * sp(f, 8, 40), transform: `translateY(${8 - 16 * L}px)` }} />}
    {ph && <div style={{ position: 'absolute', left: ax, top: ay, width: aw, height: ah, borderRadius: `${aw}px ${aw}px 3px 3px`, overflow: 'hidden', boxShadow: '0 40px 80px -30px rgba(60,40,28,0.55)', opacity: sp(f, 0, 34), transform: `translateY(${(1 - sp(f, 0, 34)) * 16 - 10 * L}px)` }}><KB ph={ph} dur={dur} amt={0.08} /></div>}
    <Brand scene={scene} color={p.muted} style={{ right: PAD, top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', left: tX, width: tW, ...(portrait && ph ? { top: H * 0.5 } : { top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }), textAlign: center ? 'center' : 'left', alignItems: center ? 'center' : undefined }}>
      <Rise d={10} dur={36}><div style={{ fontFamily: fonts.display, fontWeight: 200, fontSize: portrait ? 190 : 230, lineHeight: 0.6, height: portrait ? 90 : 110, color: ac, opacity: 0.9 }}>“</div></Rise>
      {ql.map((l, i) => <Rise key={i} d={18 + i * 12} dur={38} dy={22}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: qs, lineHeight: 1.5, letterSpacing: '-0.015em', color: p.ink, whiteSpace: 'nowrap' }}>{l}</div></Rise>)}
      {(data.who || data.role) && <Rise d={18 + ql.length * 12 + 10}><div style={{ marginTop: 44, display: 'flex', alignItems: 'center', gap: 22, justifyContent: center ? 'center' : 'flex-start' }}>
        <div style={{ width: 54 }}><Hair d={18 + ql.length * 12 + 10} color={ac} /></div>
        <div>{data.who && <div style={{ fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 30 : 28, letterSpacing: '0.12em', color: p.ink }}>{data.who}</div>}
          {data.role && <Tiny size={portrait ? 22 : 20} color={p.muted} fonts={fonts} track={0.22} style={{ marginTop: 6 }}>{data.role}</Tiny>}</div>
      </div></Rise>}
    </div>
  </div>;
};
void fit; void Dusk; void Frame; void SHADOW; void WORD; void fitBox;
