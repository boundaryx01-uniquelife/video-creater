import React from 'react';
import type { PartProps } from '../../schema.ts';
import { Brand, Folio, Pic, Rise, Rule, drift, ep, fitBox, lines, useEd } from './kit';

const WORD: React.CSSProperties = { wordBreak: 'keep-all' };

export const TextStatement: React.FC<PartProps<'text.statement'>> = ({ data, dur, scene }) => {
  const e = useEd(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ls = data.lines.slice(0, 3), n = ls.length, em = data.emphasis;
  const hasE = typeof em === 'number' && em >= 0 && em < n, ind = (i: number) => i * W * (portrait ? 0.035 : 0.055);
  const sizes = ls.map((l, i) => {
    const w = W - 2 * PAD - ind(i);
    if (!hasE) return fitBox([l], w, (H * 0.62) / n, portrait ? 150 : 190, 1.14);
    return i === em ? fitBox([l], w, H * (portrait ? 0.3 : 0.36), portrait ? 190 : 230, 1.12) : fitBox([l], w, H * (portrait ? 0.11 : 0.14), portrait ? 80 : 92, 1.2);
  });
  const uni = hasE ? sizes : sizes.map(() => Math.min(...sizes));
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: PAD * 1.15 }}><Rule d={0} dur={36} color={p.ink} th={2} /></div>
    <Brand scene={scene} style={{ left: PAD, top: PAD * 1.15 + 22 }} />
    <Folio scene={scene} style={{ right: PAD, top: PAD * 1.15 + 22 }} />
    <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: PAD * 1.1, display: 'flex', flexDirection: 'column', gap: portrait ? 20 : 14 }}>
      {ls.map((l, i) => {
        const isE = hasE && i === em, dx = drift(f, dur, 36) * (i % 2 ? -1 : 1) * 0.5;
        return <div key={i} style={{ marginLeft: ind(i), transform: `translateX(${dx}px)` }}><Rise d={4 + i * 5} dur={22}>
          <div style={{ fontFamily: fonts.display, fontWeight: isE || !hasE ? 900 : 500, fontSize: uni[i], lineHeight: 1.14, letterSpacing: '-0.035em', color: isE ? ac : p.ink, ...WORD }}>{l}</div>
        </Rise></div>;
      })}
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
