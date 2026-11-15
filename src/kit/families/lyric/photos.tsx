import React from 'react';
import type { KPhoto, PartProps } from '../../schema.ts';
import { clamp, fit, life } from '../../motion';
import { Brand, Dusk, Frame, Hair, KB, Leak, Rise, SERIF, Scrim, Tiny, WORD, fitBox, sp, useLy } from './kit';

/** 꽉 찬 한 장: 초점이 맺히듯 시작해 천천히 다가가고, 글은 아주 작게 아래에 */
export const PhotoFull: React.FC<PartProps<'photo.full'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ph = photos[0];
  const cw = W - 2 * PAD - (portrait ? 0 : W * 0.3), cs = data.caption ? Math.min(portrait ? 62 : 58, fitBox([data.caption], cw, portrait ? 220 : 140, portrait ? 62 : 58, 1.3)) : 0;
  const blur = (1 - sp(f, 0, 26)) * 9;
  return <div style={{ position: 'absolute', inset: 0, background: p.ink }}>
    {ph && <div style={{ position: 'absolute', inset: 0, filter: blur > 0.1 ? `blur(${blur}px)` : undefined, transform: 'scale(1.0)' }}><KB ph={ph} dur={dur} amt={0.08} base={1.02} /></div>}
    <Scrim from="b" op={0.62} size={portrait ? 46 : 52} />
    <Scrim from="t" op={0.3} size={20} />
    <Leak at="tr" color={ac} op={0.3} size={0.65} screen />
    <Brand scene={scene} color={p.onAccent} style={{ left: PAD, top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: PAD * (portrait ? 1.5 : 0.95) }}>
      {data.chip && <Rise d={14}><div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 22 }}><div style={{ width: 56 }}><Hair d={14} color={p.onAccent} op={0.8} /></div><Tiny size={portrait ? 22 : 20} color={p.onAccent} fonts={fonts} track={0.34} style={{ opacity: 0.92 }}>{data.chip}</Tiny></div></Rise>}
      {data.caption && <Rise d={22} dur={34}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: cs, lineHeight: 1.3, letterSpacing: '-0.01em', color: p.onAccent, ...WORD }}>{data.caption}</div></Rise>}
      {data.sub && <Rise d={32} dur={34}><div style={{ marginTop: 14, fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 26 : 24, letterSpacing: '0.1em', color: p.onAccent, opacity: 0.82, ...WORD }}>{data.sub}</div></Rise>}
    </div>
  </div>;
};

/** 한 장 + 큰 글: 흐릿한 배경 위의 액자 사진, 옆에 조용한 글 */
export const PhotoSide: React.FC<PartProps<'photo.side'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, ph = photos[0];
  const box = portrait ? { w: W - 2 * PAD, h: H * 0.5 } : { w: W * 0.5, h: H - 2 * PAD * 1.15 }, m = ph ? fit(ph.aspect, box.w, box.h) : { w: 0, h: 0 };
  const fx = portrait ? (W - m.w) / 2 : PAD * 1.3 + (box.w - m.w) / 2, fy = portrait ? PAD * 1.4 + (box.h - m.h) / 2 : (H - m.h) / 2;
  const tX = portrait ? PAD : PAD * 1.3 + box.w + PAD * 1.1, tW = portrait ? W - 2 * PAD : W - tX - PAD * 1.2;
  const cs = data.caption ? fitBox([data.caption], tW, portrait ? 340 : 520, portrait ? 92 : 100, 1.35) : 0;
  return <div style={{ position: 'absolute', inset: 0, background: p.ink }}>
    {ph && <Dusk ph={ph} dur={dur} dim={0.38} />}
    {ph && <Frame ph={ph} dur={dur} x={fx} y={fy} w={m.w} h={m.h} d={0} dx={-14} amt={0.07} />}
    <Leak at="br" color={ac} op={0.28} size={0.6} screen />
    <Brand scene={scene} color={p.onAccent} style={{ left: PAD, top: PAD * 0.6 }} />
    <div style={{ position: 'absolute', left: tX, width: tW, ...(portrait ? { top: H * 0.64 } : { top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }) }}>
      {data.chip && <Rise d={12}><Tiny size={portrait ? 22 : 20} color={p.onAccent} fonts={fonts} track={0.34} style={{ opacity: 0.85, marginBottom: 28 }}>{data.chip}</Tiny></Rise>}
      {data.caption && <Rise d={18} dur={36} dy={22}><div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: cs, lineHeight: 1.38, letterSpacing: '-0.015em', color: p.onAccent, ...WORD }}>{data.caption}</div></Rise>}
      <div style={{ width: 70, margin: '32px 0 26px' }}><Hair d={30} color={p.onAccent} op={0.65} /></div>
      {data.sub && <Rise d={34}><div style={{ fontFamily: fonts.body, fontWeight: 400, fontSize: portrait ? 28 : 26, letterSpacing: '0.08em', lineHeight: 1.6, color: p.onAccent, opacity: 0.85, ...WORD }}>{data.sub}</div></Rise>}
    </div>
  </div>;
};

const Cap: React.FC<{ ph: KPhoto; d: number; color: string; size: number; fonts: { body: string; display: string }; align?: 'left' | 'right' | 'center' }> = ({ ph, d, color, size, fonts, align = 'left' }) => {
  const meta = ph.time ?? ph.date;
  if (!ph.caption && !meta) return null;
  return <Rise d={d} dy={10} style={{ textAlign: align }}>
    {ph.caption && <div style={{ fontFamily: fonts.display, fontWeight: SERIF, fontSize: size, lineHeight: 1.35, color, ...WORD }}>{ph.caption}</div>}
    {meta && <Tiny size={size * 0.62} color={color} fonts={fonts} track={0.28} style={{ opacity: 0.75, marginTop: 6 }}>{meta}</Tiny>}
  </Rise>;
};

/** 두 장: 어긋나게 겹쳐 놓고 배경도 함께 크로스 디졸브 */
export const PhotoPair: React.FC<PartProps<'photo.pair'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, [a, b] = photos;
  const A = fit(a.aspect, portrait ? W * 0.78 : W * 0.42, portrait ? H * 0.3 : H * 0.7), B = fit(b.aspect, portrait ? W * 0.78 : W * 0.42, portrait ? H * 0.3 : H * 0.7);
  const ax = portrait ? PAD : W * 0.5 - A.w - PAD * 0.15, ay = portrait ? H * 0.12 : H * 0.5 - A.h * 0.5 + H * 0.06;
  const bx = portrait ? W - PAD - B.w : W * 0.5 + PAD * 0.15, by = portrait ? H * 0.5 : H * 0.5 - B.h * 0.5 - H * 0.06;
  const bgT = sp(f, 34, 44);
  return <div style={{ position: 'absolute', inset: 0, background: p.ink }}>
    <Dusk ph={a} dur={dur} dim={0.4} />
    <Dusk ph={b} dur={dur} dim={0.4} dir={-1} opacity={bgT} />
    <Leak at="tl" color={ac} op={0.26} size={0.6} screen />
    <Frame ph={a} dur={dur} x={ax} y={ay} w={A.w} h={A.h} d={4} dx={-12} dy={-6} />
    <Frame ph={b} dur={dur} x={bx} y={by} w={B.w} h={B.h} d={26} dx={14} dy={8} dir={-1} />
    <div style={{ position: 'absolute', left: ax, top: ay + A.h + 24, width: A.w }}><Cap ph={a} d={20} color={p.onAccent} size={portrait ? 30 : 28} fonts={fonts} /></div>
    <div style={{ position: 'absolute', left: bx, top: by - (portrait ? 0 : 0) + B.h + 24, width: B.w }}><Cap ph={b} d={42} color={p.onAccent} size={portrait ? 30 : 28} fonts={fonts} align={portrait ? 'right' : 'left'} /></div>
    {data.label && <div style={{ position: 'absolute', left: PAD, top: PAD * 0.8, display: 'flex', alignItems: 'center', gap: 20 }}><div style={{ width: 48 }}><Hair d={6} color={p.onAccent} op={0.8} /></div><Rise d={6}><Tiny size={portrait ? 22 : 20} color={p.onAccent} fonts={fonts} track={0.4}>{data.label}</Tiny></Rise></div>}
    <Brand scene={scene} color={p.onAccent} style={{ right: PAD, top: PAD * 0.7 }} />
  </div>;
};

/** 세 장: 높이가 같은 갤러리 줄이 천천히 흘러가고, 가운데가 가장 크다 */
export const PhotoTrio: React.FC<PartProps<'photo.trio'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, L = life(f, dur);
  const bgT = (i: number) => (i === 0 ? 1 : sp(f, 22 + i * 24, 40));
  const caps = (ph: KPhoto, d: number, x: number, y: number, w: number, al: 'left' | 'right' = 'left') => <div style={{ position: 'absolute', left: x, top: y, width: w }}><Cap ph={ph} d={d} color={p.onAccent} size={portrait ? 28 : 26} fonts={fonts} align={al} /></div>;
  const items: React.ReactNode[] = [];
  if (!portrait) {
    const hs = [H * 0.46, H * 0.62, H * 0.5], gap = PAD * 0.7, sz = photos.map((ph, i) => fit(ph.aspect, W * 0.36, hs[i])), tot = sz.reduce((a, s) => a + s.w, 0) + gap * 2;
    let x = (W - tot) / 2 + 40 - 80 * L;
    sz.forEach((s, i) => { const y = H * 0.5 - s.h / 2 - 10 + (i === 1 ? -H * 0.01 : i === 0 ? H * 0.03 : -H * 0.02); items.push(<Frame key={i} ph={photos[i]} dur={dur} x={x} y={y} w={s.w} h={s.h} d={4 + i * 14} dx={i === 1 ? -22 : -4} dir={i % 2 ? -1 : 1} />, <React.Fragment key={'c' + i}>{caps(photos[i], 30 + i * 14, x, y + s.h + 22, s.w)}</React.Fragment>); x += s.w + gap; });
  } else {
    const ws = [W * 0.6, W * 0.7, W * 0.58], hs = [H * 0.2, H * 0.26, H * 0.2], sz = photos.map((ph, i) => fit(ph.aspect, ws[i], hs[i]));
    const xs = [PAD, W - PAD - sz[1].w, PAD + W * 0.04], ys = [H * 0.14, H * 0.14 + sz[0].h + H * 0.06, H * 0.14 + sz[0].h + sz[1].h + H * 0.12];
    sz.forEach((s, i) => { items.push(<Frame key={i} ph={photos[i]} dur={dur} x={xs[i]} y={ys[i]} w={s.w} h={s.h} d={4 + i * 14} dx={(i % 2 ? 1 : -1) * 14} dir={i % 2 ? -1 : 1} />, <React.Fragment key={'c' + i}>{caps(photos[i], 30 + i * 14, i % 2 ? xs[i] - 10 : xs[i] + s.w + 22, ys[i] + s.h - 70, i % 2 ? s.w - 20 : W - xs[i] - s.w - PAD - 22, i % 2 ? 'left' : 'left')}</React.Fragment>); });
  }
  return <div style={{ position: 'absolute', inset: 0, background: p.ink }}>
    {photos.map((ph, i) => <Dusk key={i} ph={ph} dur={dur} dim={0.42} dir={i % 2 ? -1 : 1} opacity={bgT(i)} />)}
    <Leak at="br" color={ac} op={0.26} size={0.6} screen />
    {items}
    {data.label && <div style={{ position: 'absolute', left: PAD, top: PAD * 0.8, display: 'flex', alignItems: 'center', gap: 20 }}><div style={{ width: 48 }}><Hair d={6} color={p.onAccent} op={0.8} /></div><Rise d={6}><Tiny size={portrait ? 22 : 20} color={p.onAccent} fonts={fonts} track={0.4}>{data.label}</Tiny></Rise></div>}
    <Brand scene={scene} color={p.onAccent} style={{ right: PAD, top: PAD * 0.7 }} />
  </div>;
};

/** 모자이크: 밝은 바탕 위 여백 있는 격자, 칸마다 차례로 스며들고 천천히 다가간다 */
export const PhotoGrid: React.FC<PartProps<'photo.grid'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, n = photos.length, g = portrait ? 14 : 18;
  const top = data.label ? PAD * (portrait ? 2.1 : 1.9) : PAD, bx = PAD, bw = W - 2 * PAD, bh = H - top - PAD * 0.9;
  // 칸 배치(박스 비율 좌표 0–1): [x, y, w, h]
  type R = [number, number, number, number];
  const LS: Record<number, R[]> = {
    4: [[0, 0, 0.5, 0.58], [0.5, 0, 0.5, 0.58], [0, 0.58, 0.34, 0.42], [0.34, 0.58, 0.66, 0.42]],
    5: [[0, 0, 0.4, 1], [0.4, 0, 0.3, 0.52], [0.7, 0, 0.3, 0.52], [0.4, 0.52, 0.4, 0.48], [0.8, 0.52, 0.2, 0.48]],
    6: [[0, 0, 0.34, 0.6], [0.34, 0, 0.33, 0.4], [0.67, 0, 0.33, 0.6], [0, 0.6, 0.34, 0.4], [0.34, 0.4, 0.33, 0.6], [0.67, 0.6, 0.33, 0.4]],
  };
  const PS: Record<number, R[]> = {
    4: [[0, 0, 0.58, 0.4], [0.58, 0, 0.42, 0.4], [0, 0.4, 0.42, 0.6], [0.42, 0.4, 0.58, 0.6]],
    5: [[0, 0, 1, 0.32], [0, 0.32, 0.5, 0.34], [0.5, 0.32, 0.5, 0.34], [0, 0.66, 0.38, 0.34], [0.38, 0.66, 0.62, 0.34]],
    6: [[0, 0, 0.6, 0.34], [0.6, 0, 0.4, 0.34], [0, 0.34, 0.4, 0.33], [0.4, 0.34, 0.6, 0.33], [0, 0.67, 0.6, 0.33], [0.6, 0.67, 0.4, 0.33]],
  };
  const rects = (portrait ? PS : LS)[clamp(n, 4, 6)];
  const order = [0, 3, 1, 4, 2, 5];
  return <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
    <Leak at="tr" color={ac} op={0.3} size={0.8} />
    <Leak at="bl" color={p.surface} op={0.9} size={0.8} />
    {data.label && <div style={{ position: 'absolute', left: PAD, top: PAD * 0.8, display: 'flex', alignItems: 'center', gap: 20 }}><div style={{ width: 48 }}><Hair d={4} color={p.ink} op={0.6} /></div><Rise d={4}><Tiny size={portrait ? 22 : 20} color={p.ink} fonts={fonts} track={0.4}>{data.label}</Tiny></Rise></div>}
    <Brand scene={scene} color={p.muted} style={{ right: PAD, top: PAD * 0.7 }} />
    {rects.slice(0, n).map(([rx, ry, rw, rh], i) => {
      const d = 4 + order.indexOf(i) * 7, t = sp(f, d, 30);
      return <div key={i} style={{ position: 'absolute', left: bx + rx * bw + (rx > 0 ? g / 2 : 0), top: top + ry * bh + (ry > 0 ? g / 2 : 0), width: rw * bw - (rx > 0 ? g / 2 : 0) - (rx + rw < 0.999 ? g / 2 : 0), height: rh * bh - (ry > 0 ? g / 2 : 0) - (ry + rh < 0.999 ? g / 2 : 0), opacity: t, transform: `scale(${1.05 - 0.05 * t})`, overflow: 'hidden', borderRadius: 2, boxShadow: '0 18px 40px -22px rgba(40,28,20,0.55)' }}>
        <KB ph={photos[i]} dur={dur} from={d} amt={0.07} dir={i % 2 ? -1 : 1} />
      </div>;
    })}
  </div>;
};

/** 흐름: 갤러리 줄이 한 방향으로 천천히 흘러가고, 지금 가운데 오는 사진이 뒤 배경이 된다 */
export const PhotoStrip: React.FC<PartProps<'photo.strip'>> = ({ data, photos, dur, scene }) => {
  const e = useLy(scene), { W, H, PAD, portrait, f, p, fonts, ac } = e, n = photos.length, gap = portrait ? PAD * 0.9 : PAD * 0.8;
  const sizes = photos.map((ph) => (portrait ? fit(ph.aspect, W * 0.74, H * 0.3) : fit(ph.aspect, W * 0.34, H * 0.56)));
  const unit = sizes.map((s) => (portrait ? s.h : s.w) + gap), total = unit.reduce((a, b) => a + b, 0);
  const span = portrait ? H : W;
  // 첫 사진이 가운데에서 시작해 마지막 사진이 가운데에 올 때까지 흐른다
  const centers = unit.reduce<number[]>((a, u, i) => { a.push(i === 0 ? u / 2 : a[i - 1] + unit[i - 1] / 2 + u / 2); return a; }, []);
  const scroll = -centers[n - 1] * life(f, dur - 8);
  const bgIdx = centers.map((c, i) => 1 - clamp(Math.abs(c + scroll) / (unit[i] * 1.2), 0, 1));
  return <div style={{ position: 'absolute', inset: 0, background: p.ink }}>
    {photos.map((ph, i) => <Dusk key={i} ph={ph} dur={dur} dim={0.42} dir={i % 2 ? -1 : 1} opacity={i === 0 ? 1 : clamp(bgIdx[i] * 2.2, 0, 1)} />)}
    <Leak at="l" color={ac} op={0.24} size={0.7} screen />
    {photos.map((ph, i) => {
      const s = sizes[i], c = centers[i] + scroll + span * 0.5 - 0, enter = sp(f, 2 + i * 2, 28);
      const x = portrait ? (W - s.w) / 2 + (i % 2 ? PAD * 0.5 : -PAD * 0.5) : c - s.w / 2, y = portrait ? c - s.h / 2 : H * 0.5 - s.h / 2 + (i % 2 ? H * 0.03 : -H * 0.03);
      if (x > W + 50 || y > H + 50 || x + s.w < -50 || y + s.h < -50) return null;
      const dist = clamp(Math.abs(c - span / 2) / (span * 0.5), 0, 1);
      return <React.Fragment key={i}>
        <div style={{ position: 'absolute', left: x, top: y, width: s.w, height: s.h, opacity: enter, transform: `scale(${1 - 0.1 * dist})`, boxShadow: '0 40px 90px -24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.14)', borderRadius: 3, overflow: 'hidden' }}><KB ph={ph} dur={dur} amt={0.06} dir={i % 2 ? -1 : 1} /></div>
        {(ph.caption || ph.time) && <div style={{ position: 'absolute', left: x, top: y + s.h + 22, width: s.w, opacity: enter * (1 - dist * 0.6) }}><Cap ph={ph} d={0} color={p.onAccent} size={portrait ? 28 : 26} fonts={fonts} /></div>}
      </React.Fragment>;
    })}
    {data.label && <div style={{ position: 'absolute', left: PAD, top: PAD * 0.8, display: 'flex', alignItems: 'center', gap: 20, zIndex: 4 }}><div style={{ width: 48 }}><Hair d={6} color={p.onAccent} op={0.8} /></div><Rise d={6}><Tiny size={portrait ? 22 : 20} color={p.onAccent} fonts={fonts} track={0.4}>{data.label}</Tiny></Rise></div>}
    <Brand scene={scene} color={p.onAccent} style={{ right: PAD, top: PAD * 0.7 }} />
    {/* 진행 표시: 가는 선 위의 점 */}
    <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: PAD * 0.6, height: 1, background: p.onAccent, opacity: 0.25 }} />
    <div style={{ position: 'absolute', left: PAD + (W - 2 * PAD) * life(f, dur - 8), bottom: PAD * 0.6 - 3, width: 7, height: 7, borderRadius: 7, background: p.onAccent, opacity: 0.85 }} />
  </div>;
};
