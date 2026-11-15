import React from 'react';
import type { PartProps } from '../../schema.ts';
import { Brand, Folio, NUM, Pic, Rise, Rule, drift, ep, fitBox, fitNW, lines, tw, useEd } from './kit';

const WORD: React.CSSProperties = { wordBreak: 'keep-all' };

/** 한 줄을 (세로 화면에서) 단어 경계 기준으로 균형 있게 둘로 나눈다 */
const balance = (l: string, max: number) => {
  const ws = l.split(' ');
  if (ws.length < 2 || tw(l) <= max) return [l];
  let best = 1, bd = 1e9;
  for (let i = 1; i < ws.length; i++) { const d = Math.abs(tw(ws.slice(0, i).join(' ')) - tw(ws.slice(i).join(' '))); if (d < bd) { bd = d; best = i; } }
  return [ws.slice(0, best).join(' '), ws.slice(best).join(' ')];
};

/** 큰 문장: 강조줄은 크고 기울인 명조, 나머지는 작은 정자체, 한 단어는 강조색 + 형광 띠 */
export const TextStatement: React.FC<PartProps<'text.statement'>> = ({ data, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ls = data.lines.slice(0, 3), n = ls.length;
  const em = typeof data.emphasis === 'number' && data.emphasis >= 0 && data.emphasis < n ? data.emphasis : ls.reduce((b, l, i) => (tw(l) > tw(ls[b]) ? i : b), 0);
  const eLines = balance(ls[em], portrait ? 7.5 : 8), words = ls[em].split(' ');
  const hiW = words.reduce((b, w) => (tw(w) > tw(b) ? w : b), words[0]);
  const bw0 = W - 2 * PAD, ghost = Array.from(ls[em].replace(/\s/g, ''))[0] ?? '';
  const es = fitNW(eLines, bw0, portrait ? H * 0.34 : H * 0.5, portrait ? 230 : 270, 1.04);
  const small = (l: string) => fitBox([l], bw0 * (portrait ? 1 : 0.7), portrait ? H * 0.08 : H * 0.12, portrait ? 80 : 104, 1.2);
  const before = ls.slice(0, em), after = ls.slice(em + 1), sp = ep(f, 0, 30), L = f / dur;
  const row = (l: string, i: number, kind: 'b' | 'a') => <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 28, marginLeft: kind === 'a' ? (portrait ? 0 : W * 0.12) : 0 }}>
    <Rise d={4 + i * 4}><span style={{ fontFamily: fonts.body, ...NUM, fontSize: 26, fontWeight: 700, letterSpacing: '0.1em', color: ac }}>{String.fromCharCode(65 + i)}</span></Rise>
    <Rise d={6 + i * 4} dur={22}><div style={{ fontFamily: fonts.display, fontStyle: kind === 'b' ? 'italic' : 'normal', fontWeight: kind === 'b' ? 500 : 900, fontSize: small(l), lineHeight: 1.2, letterSpacing: '-0.03em', color: kind === 'b' ? p.muted : p.ink, ...WORD, whiteSpace: portrait ? 'normal' : 'nowrap' }}>{l}</div></Rise>
  </div>;
  const hiOf = (txt: string) => {
    const parts = txt.split(hiW);
    return <>{parts.map((pt, i) => <React.Fragment key={i}>{pt}{i < parts.length - 1 && <span style={{ position: 'relative', color: ac, display: 'inline-block' }}>
      <span style={{ position: 'absolute', left: '-2%', right: '-2%', bottom: '6%', height: '30%', background: ac, opacity: 0.2, transformOrigin: 'left', transform: `scaleX(${ep(f, 22, 22)})` }} />
      <span style={{ position: 'relative' }}>{hiW}</span></span>}</React.Fragment>)}</>;
  };
  return <div style={{ position: 'absolute', inset: 0, background: p.bg, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', right: portrait ? -W * 0.08 : W * 0.02, bottom: portrait ? H * 0.02 : -H * 0.12, fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 900, fontSize: portrait ? H * 0.5 : H * 1.25, lineHeight: 1, color: p.surface, opacity: 0.9 * sp, transform: `translateX(${-L * 40}px) scale(${1 + L * 0.05})`, transformOrigin: 'right bottom', whiteSpace: 'nowrap' }}>{ghost}</div>
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: PAD * 0.8 }}><Rule d={0} dur={36} color={p.ink} th={2} /></div>
    <div style={{ position: 'absolute', left: PAD, top: PAD * 0.8 + 18, right: PAD, display: 'flex', justifyContent: 'space-between' }}>
      <Brand scene={scene} style={{ position: 'static' }} />
      <Folio scene={scene} style={{ position: 'static' }} />
    </div>
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: PAD * 1.8, bottom: PAD * 1.1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: portrait ? 36 : 26, transform: `translateY(${drift(f, dur, 14)}px)` }}>
      {before.map((l, i) => row(l, i, 'b'))}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: -PAD * 0.45, top: '6%', width: 8, height: '88%', background: ac, transformOrigin: 'top', transform: `scaleY(${ep(f, 10, 26)})` }} />
        {eLines.map((l, i) => <Rise key={i} d={8 + i * 5} dur={26}><div style={{ fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 900, fontSize: es, lineHeight: 1.08, letterSpacing: '-0.04em', color: p.ink, whiteSpace: 'nowrap' }}>{words.length > 1 ? hiOf(l) : <span style={{ color: ac }}>{l}</span>}</div></Rise>)}
      </div>
      {after.map((l, i) => row(l, before.length + 1 + i, 'a'))}
    </div>
  </div>;
};

export const TextQuote: React.FC<PartProps<'text.quote'>> = ({ data, photos, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ph = photos[0], tl = lines(data.text);
  const px = portrait ? 0 : Math.round(W * 0.64), pH = portrait ? Math.round(H * 0.34) : H;
  const bx = PAD, bw = portrait ? W - 2 * PAD : (ph ? px : W) - 2 * PAD, mark = portrait ? 300 : 380;
  const qs = fitBox(tl, bw, portrait ? H * 0.36 : H * (ph ? 0.4 : 0.44), portrait ? 104 : ph ? 96 : 124, 1.3, 24, 1.08), dr = drift(f, dur, 14);
  const top = portrait ? (ph ? pH + PAD * 0.5 : PAD * 1.6) : PAD * 0.9;
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    {ph && <Pic ph={ph} dur={dur} x={px} y={0} w={W - px} h={pH} from={portrait ? 't' : 'r'} dir={-1} />}
    <Brand scene={scene} style={{ left: PAD, [portrait ? 'bottom' : 'top']: PAD * 0.7 }} />
    {!ph && <Folio scene={scene} style={{ right: PAD, top: PAD * 0.75 }} />}
    <div style={{ position: 'absolute', left: bx, top, transform: `translateY(${dr}px)` }}>
      <Rise d={0} dur={24}><div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: mark, lineHeight: 0.8, height: mark * 0.5, color: ac }}>“</div></Rise>
    </div>
    <div style={{ position: 'absolute', left: bx, width: bw, top: top + mark * 0.56, bottom: PAD * (portrait ? 1.6 : 1.5), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transform: `translateY(${dr}px)` }}>
      <div>{tl.map((l, i) => <Rise key={i} d={6 + i * 5} dur={22}><div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: qs, lineHeight: 1.3, letterSpacing: '-0.03em', color: p.ink, ...WORD }}>{l}</div></Rise>)}</div>
      {(data.who || data.role) && <div>
        <div style={{ width: 120, marginBottom: 22 }}><Rule d={20} color={p.ink} th={4} /></div>
        <Rise d={22}><div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: portrait ? 40 : 36, color: p.ink }}>{data.who}</div></Rise>
        {data.role && <Rise d={26}><div style={{ fontFamily: fonts.body, fontSize: portrait ? 32 : 28, color: p.muted, marginTop: 6, ...WORD }}>{data.role}</div></Rise>}
      </div>}
    </div>
  </div>;
};
