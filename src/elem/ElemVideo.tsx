import React from 'react';
import { AbsoluteFill, Sequence, spring, useCurrentFrame } from 'remotion';
import { Photo, clamp, easeInOut, fitFont, prog } from '../lib/common';
import { useLayout } from '../lib/layout';
import { BgAudio } from '../audio/BgAudio';
import type { PhotoSpec } from '../analysis/videoData.ts';
import { ElemChapter, ElemProps, ElemTheme, THEMES, planElem, themeOf } from './types.ts';

/* 초등 활동 기록 영상: "그림일기 + 폴라로이드" 톤. 종이 바탕, 둥근 글꼴(주아), 챕터마다 다른 색, 통통 튀는 등장. 모든 장면은 프레임의 순수 함수 */
const KID = `'Jua','Pretendard','Noto Sans KR',sans-serif`, BODY = `'Pretendard','Noto Sans KR',sans-serif`;
const ThemeCtx = React.createContext<ElemTheme>(THEMES.sunny), useT = () => React.useContext(ThemeCtx);
const tint = (c: string, paper: string, pct = 15) => `color-mix(in srgb, ${c} ${pct}%, ${paper})`;
const dots = (t: ElemTheme): React.CSSProperties => ({ backgroundColor: t.paper, backgroundImage: 'radial-gradient(rgba(42,36,64,.10) 2.4px, transparent 2.8px)', backgroundSize: '40px 40px' });
const pop = (f: number, d = 0, damping = 11) => spring({ frame: f - d, fps: 30, config: { damping, stiffness: 150, mass: 0.7 } });
const lines = (s: string) => s.split('\n');

/** 장면 시작에 두 겹의 색 띠가 오른쪽으로 걷히며 화면이 열린다 */
const Swipe: React.FC<{ a: string; b?: string }> = ({ a, b: bb }) => {
  const T = useT(), b = bb ?? T.paper; const f = useCurrentFrame(), t1 = prog(f, 2, 17, easeInOut), t2 = prog(f, 0, 17, easeInOut);
  if (f > 22) return null;
  return <>
    <div style={{ position: 'absolute', inset: 0, background: b, transform: `translateX(${t2 * 100}%)`, zIndex: 60 }} />
    <div style={{ position: 'absolute', inset: 0, background: a, transform: `translateX(${t1 * 100}%)`, zIndex: 61 }} />
  </>;
};

const Pill: React.FC<{ text: string; bg: string; color?: string; size?: number; style?: React.CSSProperties }> = ({ text, bg, color = '#fff', size = 34, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3, padding: `${size * 0.28}px ${size * 0.62}px`, borderRadius: 999, background: bg, color, fontFamily: KID, fontSize: size, lineHeight: 1.1, whiteSpace: 'nowrap', ...style }}>{text}</div>
);

const Star: React.FC<{ size: number; color: string; rot: number; style?: React.CSSProperties }> = ({ size, color, rot, style }) => { const T = useT(); return (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', transform: `rotate(${rot}deg)`, ...style }}>
    <path d="M50 4 L61 37 L96 38 L68 59 L78 93 L50 73 L22 93 L32 59 L4 38 L39 37 Z" fill={color} stroke={T.ink} strokeWidth={4} strokeLinejoin="round" />
  </svg>
); };

/** 폴라로이드: 안쪽 사진 크기(iw×ih)를 받아 테두리·자막 칸을 더해 그린다 */
const Polaroid: React.FC<{ ph: PhotoSpec | { src: string; fx?: number; fy?: number }; iw: number; ih: number; rot: number; f: number; delay?: number; cap?: string; tape?: string; style?: React.CSSProperties; drift?: number }> = ({ ph, iw, ih, rot, f, delay = 0, cap, tape = 'rgba(255,207,74,.85)', style, drift = 1 }) => {
  const T = useT();
  const p = Math.max(10, iw * 0.04), bottom = cap ? Math.max(p * 2.2, ih * 0.2) : p, s = pop(f, delay), fx = (ph as PhotoSpec).fx ?? 0.5, fy = (ph as PhotoSpec).fy ?? 0.4;
  return (
    <div style={{ position: 'absolute', width: iw + p * 2, height: ih + p + bottom, boxSizing: 'border-box', padding: `${p}px ${p}px ${bottom}px`, background: '#fff', borderRadius: 8, boxShadow: '0 26px 50px rgba(42,36,64,.22), 0 3px 9px rgba(42,36,64,.14)', opacity: clamp(s * 1.8, 0, 1), transform: `translateY(${(1 - s) * 260}px) rotate(${rot + (1 - s) * -9}deg) scale(${0.86 + 0.14 * s})`, ...style }}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 3, background: '#ddd' }}><Photo src={ph.src} fx={fx} fy={fy} scale={1.02 + Math.max(0, f - delay) * 0.0007 * drift} /></div>
      {cap && <div style={{ position: 'absolute', left: p, right: p, bottom: 0, height: bottom, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: Math.min(bottom * 0.46, 54), color: T.ink, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cap}</div>}
      <div style={{ position: 'absolute', top: -iw * 0.035, left: '50%', width: iw * 0.26, height: iw * 0.075, marginLeft: -iw * 0.13, background: tape, transform: 'rotate(-4deg)', borderRadius: 3 }} />
    </div>
  );
};

/** 사진 비율을 상자(maxW×maxH) 안에 맞춘 안쪽 크기 */
const fit = (aspect: number, maxW: number, maxH: number) => { const a = clamp(aspect || 1.5, 0.6, 2.2), w = Math.min(maxW, maxH * a); return { iw: Math.round(w), ih: Math.round(w / a) }; };

/* ---------------- 인트로 ---------------- */
const Intro: React.FC<{ p: ElemProps }> = ({ p }) => {
  const T = useT();
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout();
  const all = p.chapters.flatMap((c) => c.photos), pick = (i: number): PhotoSpec => { const s = p.introPhotos[i]; return all.find((x) => x.src === s) ?? (s ? { src: s, aspect: 1.5, fx: 0.5, fy: 0.4 } as PhotoSpec : all[i] ?? all[0]); };
  const ph = [pick(0), pick(1), pick(2)].filter(Boolean), ls = lines(p.title), big = portrait ? 200 : 210;
  const sz = (t: string) => fitFont(t, big, (portrait ? W - PAD * 2 : W * 0.5), 0.95);
  const hl = prog(f, 26, 20);
  const info = [p.klass ? `${p.school} ${p.klass}` : p.school, p.day, p.place].filter(Boolean);
  return (
    <AbsoluteFill style={dots(T)}>
      <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 1.7 : H * 0.17, width: portrait ? W - PAD * 2 : W * 0.52 }}>
        <div style={{ transform: `scale(${pop(f, 4)})`, transformOrigin: 'left center' }}><Pill text={p.kicker} bg={T.ink} color={T.paper} size={portrait ? 40 : 38} /></div>
        <div style={{ marginTop: portrait ? 36 : 30, fontFamily: KID, color: T.ink, lineHeight: 1.12 }}>
          {ls.map((t, i) => (
            <div key={i} style={{ overflow: 'hidden', paddingBottom: 6 }}>
              <div style={{ fontSize: sz(t), transform: `translateY(${(1 - prog(f, 8 + i * 5, 16)) * 110}%)` }}>
                <span style={i === ls.length - 1 ? { backgroundImage: `linear-gradient(transparent 58%, ${T.sun} 58%, ${T.sun} 90%, transparent 90%)`, backgroundRepeat: 'no-repeat', backgroundSize: `${hl * 100}% 100%`, padding: '0 10px' } : undefined}>{t}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: portrait ? 40 : 44, display: 'flex', flexWrap: 'wrap', gap: 16, maxWidth: portrait ? undefined : W * 0.4 }}>
          {info.map((t, i) => <div key={i} style={{ transform: `translateY(${(1 - pop(f, 34 + i * 4)) * 40}px)`, opacity: clamp(pop(f, 34 + i * 4) * 2, 0, 1) }}><Pill text={t} bg={T.pal[i % T.pal.length]} size={portrait ? 34 : 32} /></div>)}
        </div>
      </div>
      {!portrait && <>
        {ph[0] && <Polaroid ph={ph[0]} {...fit(ph[0].aspect, 560, 440)} rot={-7} f={f} delay={6} style={{ left: W * 0.55, top: H * 0.1 }} />}
        {ph[1] && <Polaroid ph={ph[1]} {...fit(ph[1].aspect, 520, 400)} rot={5} f={f} delay={14} style={{ left: W * 0.7, top: H * 0.45 }} tape="rgba(61,155,255,.8)" />}
        {ph[2] && <Polaroid ph={ph[2]} {...fit(ph[2].aspect, 440, 360)} rot={-3} f={f} delay={22} style={{ left: W * 0.5, top: H * 0.56 }} tape="rgba(255,107,87,.8)" />}
        <Star size={96} color={T.sun} rot={f * 0.9} style={{ left: W * 0.9, top: H * 0.07, transform: `rotate(${f * 0.9}deg) scale(${pop(f, 30)})` }} />
        <Star size={58} color={T.pal[0]} rot={0} style={{ left: W * 0.47, top: H * 0.08, transform: `rotate(${-f * 0.7}deg) scale(${pop(f, 36)})` }} />
      </>}
      {portrait && <>
        {ph[0] && <Polaroid ph={ph[0]} {...fit(ph[0].aspect, 640, 520)} rot={-6} f={f} delay={8} style={{ left: PAD * 0.7, top: H * 0.47 }} />}
        {ph[1] && <Polaroid ph={ph[1]} {...fit(ph[1].aspect, 560, 460)} rot={5} f={f} delay={16} style={{ left: W * 0.4, top: H * 0.66 }} tape="rgba(61,155,255,.8)" />}
        {ph[2] && <Polaroid ph={ph[2]} {...fit(ph[2].aspect, 400, 320)} rot={-3} f={f} delay={24} style={{ left: PAD * 0.7, top: H * 0.76 }} tape="rgba(255,107,87,.8)" />}
        <Star size={110} color={T.sun} rot={0} style={{ right: PAD, top: PAD * 1.4, transform: `rotate(${f * 0.9}deg) scale(${pop(f, 30)})` }} />
      </>}
    </AbsoluteFill>
  );
};

/* ---------------- 챕터 제목 ---------------- */
const TitleScene: React.FC<{ p: ElemProps; ci: number }> = ({ p, ci }) => {
  const T = useT();
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout(), c = p.chapters[ci], col = T.pal[ci % T.pal.length], first = c.photos[0];
  const d = portrait ? W * 0.7 : H * 0.62, tw = fitFont(c.title, portrait ? 150 : 170, portrait ? W - PAD * 2 : W - PAD * 2 - d - 80, 0.98), s = pop(f, 6, 10);
  return (
    <AbsoluteFill style={{ background: col }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.16) 2.4px, transparent 2.8px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.6 : H * 0.34, width: portrait ? W - PAD * 2 : W - PAD * 2 - d - 60 }}>
        <div style={{ transform: `translateY(${(1 - pop(f, 8)) * 50}px)`, opacity: clamp(pop(f, 8) * 2, 0, 1) }}><Pill text={c.sub || `활동 ${ci + 1}`} bg={T.paper} color={T.ink} size={portrait ? 40 : 36} /></div>
        <div style={{ marginTop: 28, fontFamily: KID, color: '#fff', fontSize: tw, lineHeight: 1.1, overflow: 'hidden', paddingBottom: 8 }}><div style={{ transform: `translateY(${(1 - prog(f, 10, 16)) * 110}%)` }}>{c.title}</div></div>
        <div style={{ marginTop: 40, display: 'flex', gap: 14 }}>
          {p.chapters.map((_, i) => <div key={i} style={{ width: i === ci ? 64 : 22, height: 22, borderRadius: 11, background: i === ci ? T.paper : 'rgba(255,255,255,.45)', transform: `scale(${pop(f, 24 + i * 3)})` }} />)}
        </div>
      </div>
      <div style={{ position: 'absolute', left: portrait ? (W - d) / 2 : W - PAD - d, top: portrait ? H * 0.07 : (H - d) / 2, width: d, height: d, transform: `scale(${s}) rotate(${(1 - s) * 40}deg)` }}>
        <div style={{ position: 'absolute', inset: -d * 0.06, borderRadius: '50%', border: `${Math.max(6, d * 0.012)}px dashed rgba(255,255,255,.75)`, transform: `rotate(${f * 0.6}deg)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', border: `${d * 0.025}px solid ${T.paper}`, boxSizing: 'border-box', background: '#ddd' }}>{first && <Photo src={first.src} fx={first.fx} fy={first.fy} scale={1.05 + f * 0.0012} />}</div>
        <div style={{ position: 'absolute', left: -d * 0.04, top: -d * 0.04, width: d * 0.3, height: d * 0.3, borderRadius: '50%', background: T.paper, border: `${d * 0.012}px solid ${T.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KID, fontSize: d * 0.2, color: col, transform: `scale(${pop(f, 16, 9)})` }}>{ci + 1}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- 사진 화면(1·2·3장) ---------------- */
const Page: React.FC<{ p: ElemProps; ci: number; idx: number[]; no: number; of: number }> = ({ p, ci, idx, no, of }) => {
  const T = useT();
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout(), c = p.chapters[ci], col = T.pal[ci % T.pal.length], ph = idx.map((i) => c.photos[i]);
  const label = (
    <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 0.9 : PAD * 0.6, display: 'flex', gap: 14, alignItems: 'center', transform: `translateY(${(1 - pop(f, 2)) * -50}px)` }}>
      <Pill text={`${ci + 1}`} bg={col} size={36} style={{ padding: '6px 20px' }} /><Pill text={c.title} bg={T.ink} color={T.paper} size={portrait ? 34 : 32} />
      <div style={{ fontFamily: KID, fontSize: 30, color: T.ink, opacity: 0.55 }}>{no}/{of}</div>
    </div>
  );
  const bug = <div style={{ position: 'absolute', right: PAD, bottom: PAD * 0.5, fontFamily: KID, fontSize: 28, color: T.ink, opacity: 0.5 }}>{p.school}</div>;
  const cap = (x: PhotoSpec) => x.cap?.title || '';
  let body: React.ReactNode;
  if (ph.length === 1) {
    const x = ph[0], a = x.aspect, text = x.cap?.title, sub = x.cap?.sub, chip = x.cap?.chip || x.time;
    if (!portrait) {
      const hasText = !!(text || sub), { iw, ih } = fit(a, a >= 1 ? (hasText ? 900 : 1100) : 600, 700), pw = iw + iw * 0.08;
      body = <>
        <Polaroid ph={x} iw={iw} ih={ih} rot={-2.4} f={f} delay={6} style={{ left: hasText ? PAD * 1.1 : (W - pw) / 2, top: (H - ih) / 2 - 10 }} tape={`${col}cc`} />
        {hasText && <div style={{ position: 'absolute', left: PAD * 1.1 + pw + 70, right: PAD, top: H * 0.34 }}>
          {chip && <div style={{ transform: `scale(${pop(f, 16)})`, transformOrigin: 'left' }}><Pill text={chip} bg={col} size={34} /></div>}
          {text && <div style={{ marginTop: 26, fontFamily: KID, color: T.ink, fontSize: Math.max(66, fitFont(text, 108, W - PAD * 2.2 - pw - 70, 0.9)), lineHeight: 1.2, transform: `translateY(${(1 - prog(f, 14, 16)) * 40}px)`, opacity: prog(f, 14, 12) }}>{text}</div>}
          {sub && <div style={{ marginTop: 18, fontFamily: BODY, fontWeight: 600, color: T.ink, opacity: 0.7 * prog(f, 22, 14), fontSize: 38, lineHeight: 1.4 }}>{sub}</div>}
        </div>}
      </>;
    } else {
      const { iw, ih } = fit(a, W - PAD * 2.4, H * 0.5);
      body = <>
        <Polaroid ph={x} iw={iw} ih={ih} rot={-2.4} f={f} delay={6} style={{ left: (W - iw * 1.08) / 2, top: H * 0.2 }} tape={`${col}cc`} />
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: H * 0.2 + ih + 130, textAlign: 'center' }}>
          {chip && <div style={{ transform: `scale(${pop(f, 16)})` }}><Pill text={chip} bg={col} size={34} /></div>}
          {text && <div style={{ marginTop: 24, fontFamily: KID, color: T.ink, fontSize: fitFont(text, 92, W - PAD * 2, 1.0), lineHeight: 1.2, opacity: prog(f, 14, 12) }}>{text}</div>}
          {sub && <div style={{ marginTop: 14, fontFamily: BODY, fontWeight: 600, color: T.ink, opacity: 0.7 * prog(f, 22, 14), fontSize: 36 }}>{sub}</div>}
        </div>
      </>;
    }
  } else if (ph.length === 2) {
    const [x, y] = ph;
    if (!portrait) {
      const A = fit(x.aspect, 800, 560), B = fit(y.aspect, 800, 560), gap = 70, total = A.iw * 1.08 + B.iw * 1.08 + gap, x0 = (W - total) / 2;
      body = <>
        <Polaroid ph={x} {...A} rot={-3.5} f={f} delay={6} cap={cap(x)} style={{ left: x0, top: H * 0.2 }} tape={`${col}cc`} />
        <Polaroid ph={y} {...B} rot={3} f={f} delay={16} cap={cap(y)} style={{ left: x0 + A.iw * 1.08 + gap, top: H * 0.27 }} tape="rgba(255,207,74,.9)" />
      </>;
    } else {
      const A = fit(x.aspect, W * 0.7, H * 0.28), B = fit(y.aspect, W * 0.7, H * 0.28);
      body = <>
        <Polaroid ph={x} {...A} rot={-3} f={f} delay={6} cap={cap(x)} style={{ left: PAD * 1.1, top: H * 0.15 }} tape={`${col}cc`} />
        <Polaroid ph={y} {...B} rot={3} f={f} delay={16} cap={cap(y)} style={{ right: PAD * 1.1, top: H * 0.5 }} tape="rgba(255,207,74,.9)" />
      </>;
    }
  } else {
    const [x, y, z] = ph;
    if (!portrait) {
      const A = fit(x.aspect, 900, 640), B = fit(y.aspect, 520, 300), C = fit(z.aspect, 520, 300);
      body = <>
        <Polaroid ph={x} {...A} rot={-2.5} f={f} delay={6} cap={cap(x)} style={{ left: PAD * 1.1, top: H * 0.17 }} tape={`${col}cc`} />
        <Polaroid ph={y} {...B} rot={4} f={f} delay={16} cap={cap(y)} style={{ left: PAD * 1.1 + A.iw * 1.08 + 80, top: H * 0.1 }} tape="rgba(255,207,74,.9)" />
        <Polaroid ph={z} {...C} rot={-3} f={f} delay={24} cap={cap(z)} style={{ left: PAD * 1.1 + A.iw * 1.08 + 130, top: H * 0.52 }} tape="rgba(61,155,255,.8)" />
      </>;
    } else {
      const A = fit(x.aspect, W * 0.8, H * 0.27), B = fit(y.aspect, W * 0.38, H * 0.2), C = fit(z.aspect, W * 0.38, H * 0.2);
      body = <>
        <Polaroid ph={x} {...A} rot={-2.5} f={f} delay={6} cap={cap(x)} style={{ left: (W - A.iw * 1.08) / 2, top: H * 0.13 }} tape={`${col}cc`} />
        <Polaroid ph={y} {...B} rot={4} f={f} delay={16} style={{ left: PAD * 0.9, top: H * 0.58 }} tape="rgba(255,207,74,.9)" />
        <Polaroid ph={z} {...C} rot={-4} f={f} delay={24} style={{ right: PAD * 0.9, top: H * 0.64 }} tape="rgba(61,155,255,.8)" />
      </>;
    }
  }
  return <AbsoluteFill style={{ backgroundColor: tint(col, T.paper), backgroundImage: 'radial-gradient(rgba(42,36,64,.08) 2.4px, transparent 2.8px)', backgroundSize: '40px 40px' }}>{body}{label}{bug}</AbsoluteFill>;
};

/* ---------------- 한마디 ---------------- */
const QuoteScene: React.FC<{ p: ElemProps; ci: number }> = ({ p, ci }) => {
  const T = useT();
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout(), c = p.chapters[ci], col = T.pal[ci % T.pal.length], q = c.quote!, last = c.photos[c.photos.length - 1] ?? c.photos[0];
  const d = portrait ? W * 0.5 : H * 0.5, bw = portrait ? W - PAD * 2 : W - PAD * 2 - d - 80, fs = fitFont(q.text.replace(/\n/g, ''), portrait ? 74 : 88, bw * 1.5, 0.9);
  return (
    <AbsoluteFill style={dots(T)}>
      <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.1 : (H - d) / 2, width: d, height: d, transform: `scale(${pop(f, 4, 10)})` }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', border: `10px solid #fff`, boxShadow: '0 20px 40px rgba(42,36,64,.2)', boxSizing: 'border-box' }}>{last && <Photo src={last.src} fx={last.fx} fy={last.fy} scale={1.06 + f * 0.0008} />}</div>
        <div style={{ position: 'absolute', right: -d * 0.04, bottom: d * 0.02 }}><Pill text={q.name} bg={col} size={portrait ? 36 : 34} /></div>
      </div>
      <div style={{ position: 'absolute', left: portrait ? PAD : PAD + d + 80, top: portrait ? H * 0.1 + d + 90 : H * 0.2, width: bw, transform: `scale(${pop(f, 14, 12)}) rotate(${(1 - pop(f, 14, 12)) * -4}deg)`, transformOrigin: portrait ? 'center top' : 'left center' }}>
        <div style={{ position: 'relative', background: '#fff', border: `6px solid ${T.ink}`, borderRadius: 64, padding: portrait ? '60px 56px' : '72px 80px', boxShadow: `12px 14px 0 ${col}` }}>
          <div style={{ position: 'absolute', left: 36, top: -34, fontFamily: KID, fontSize: 150, lineHeight: 1, color: col }}>“</div>
          <div style={{ fontFamily: KID, color: T.ink, fontSize: fs, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{q.text}</div>
          <div style={{ position: 'absolute', left: portrait ? '50%' : -34, top: portrait ? -30 : '50%', width: 56, height: 56, background: '#fff', borderLeft: `6px solid ${T.ink}`, borderBottom: `6px solid ${T.ink}`, transform: portrait ? 'translateX(-50%) rotate(135deg)' : 'translateY(-50%) rotate(45deg)' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- 오늘의 기록(숫자) ---------------- */
const Stats: React.FC<{ p: ElemProps }> = ({ p }) => {
  const T = useT();
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout(), items = p.stats ?? [];
  const cw = portrait ? W - PAD * 2 : Math.min(460, (W - PAD * 2 - 50 * (items.length - 1)) / items.length), ch = portrait ? H * 0.17 : 480;
  return (
    <AbsoluteFill style={{ background: T.sun }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(42,36,64,.12) 2.4px, transparent 2.8px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'absolute', left: PAD, top: portrait ? PAD * 1.4 : H * 0.12, fontFamily: KID, fontSize: portrait ? 120 : 130, color: T.ink, transform: `translateY(${(1 - pop(f, 2)) * 60}px)` }}>오늘의 기록</div>
      {items.map((it, i) => {
        const s = pop(f, 12 + i * 8, 10), v = Math.round(it.n * prog(f, 18 + i * 8, 34)), x = portrait ? PAD : (W - (cw * items.length + 50 * (items.length - 1))) / 2 + i * (cw + 50), y = portrait ? H * 0.3 + i * (ch + 36) : H * 0.42;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: cw, height: ch, background: '#fff', border: `6px solid ${T.ink}`, borderRadius: 56, boxShadow: `12px 14px 0 ${T.pal[i % T.pal.length]}`, display: 'flex', flexDirection: portrait ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: portrait ? 40 : 14, transform: `scale(${s}) rotate(${(i % 2 ? 2 : -2) * s}deg)`, opacity: clamp(s * 2, 0, 1) }}>
            <div style={{ fontFamily: KID, color: T.pal[i % T.pal.length], fontSize: portrait ? 130 : 170, lineHeight: 1 }}>{v}<span style={{ fontSize: portrait ? 60 : 70, color: T.ink }}>{it.unit}</span></div>
            <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: portrait ? 48 : 44, color: T.ink }}>{it.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------------- 마무리 ---------------- */
const Outro: React.FC<{ p: ElemProps }> = ({ p }) => {
  const T = useT();
  const f = useCurrentFrame(), { W, H, portrait, PAD } = useLayout(), all = p.chapters.flatMap((c) => c.photos);
  const pick = [0, Math.floor(all.length / 2), all.length - 1].map((i) => all[i]).filter(Boolean);
  const ls = lines(p.outro.title), fs = Math.min(...ls.map((t) => fitFont(t, portrait ? 190 : 170, portrait ? W - PAD * 2 : W * 0.52 - PAD, 0.98)));
  return (
    <AbsoluteFill style={{ background: T.sun }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(42,36,64,.12) 2.4px, transparent 2.8px)', backgroundSize: '40px 40px' }} />
      {Array.from({ length: 18 }, (_, i) => { const sp = 2.2 + (i % 5) * 0.7, x = ((i * 137) % 100) / 100 * W, y = ((f * sp + i * 173) % (H + 200)) - 100; return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 20 + (i % 3) * 8, height: i % 2 ? 20 + (i % 3) * 8 : 12, borderRadius: i % 2 ? '50%' : 4, background: T.pal[i % T.pal.length], transform: `rotate(${f * (2 + i % 4) + i * 40}deg)`, opacity: 0.9 }} />; })}
      <div style={{ position: 'absolute', left: PAD, top: portrait ? H * 0.08 : H * 0.12, width: portrait ? W - PAD * 2 : W * 0.52, display: 'flex', flexDirection: 'column', gap: portrait ? 44 : 36, alignItems: portrait ? 'center' : 'flex-start', textAlign: portrait ? 'center' : 'left' }}>
        <div style={{ fontFamily: KID, color: T.ink, fontSize: fs, lineHeight: 1.12 }}>
          {ls.map((t, i) => <div key={i} style={{ overflow: 'hidden', paddingBottom: 6 }}><div style={{ transform: `translateY(${(1 - prog(f, 4 + i * 5, 16)) * 110}%)` }}>{t}</div></div>)}
        </div>
        <div style={{ fontFamily: BODY, fontWeight: 800, color: T.ink, fontSize: portrait ? 48 : 42, lineHeight: 1.5, opacity: prog(f, 24, 16), whiteSpace: 'pre-wrap' }}>{p.outro.message}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: portrait ? 'center' : 'flex-start', gap: 16, opacity: prog(f, 34, 14) }}>
          <Pill text={p.klass ? `${p.school} ${p.klass}` : p.school} bg={T.ink} color={T.paper} size={portrait ? 38 : 34} /><Pill text={p.day} bg="#fff" color={T.ink} size={portrait ? 38 : 34} />
        </div>
      </div>
      {!portrait && pick.map((x, i) => { const a = fit(x.aspect, [520, 400, 400][i], [380, 300, 300][i]); return <Polaroid key={i} ph={x} iw={a.iw} ih={a.ih} rot={[-6, 5, -3][i]} f={f} delay={12 + i * 8} drift={0} style={{ left: [W * 0.58, W * 0.74, W * 0.6][i], top: [H * 0.08, H * 0.34, H * 0.58][i] }} tape={['rgba(255,107,87,.8)', 'rgba(61,155,255,.8)', 'rgba(143,107,255,.8)'][i]} />; })}
      {portrait && pick.map((x, i) => { const a = fit(x.aspect, [420, 360, 360][i], [300, 260, 260][i]); return <Polaroid key={i} ph={x} iw={a.iw} ih={a.ih} rot={[-5, 4, -3][i]} f={f} delay={12 + i * 8} drift={0} style={{ left: [PAD * 0.8, W * 0.46, W * 0.14][i], top: [H * 0.62, H * 0.68, H * 0.8][i] }} tape={['rgba(255,107,87,.8)', 'rgba(61,155,255,.8)', 'rgba(143,107,255,.8)'][i]} />; })}
    </AbsoluteFill>
  );
};

/** 초등학교 활동 기록 영상 */
export const ElemVideo: React.FC<ElemProps> = (p) => {
  const T = themeOf(p), { scenes } = React.useMemo(() => planElem(p), [p]);
  const pagesPer = (ci: number) => scenes.filter((s) => s.type === 'page' && s.ci === ci).length;
  const counters: Record<number, number> = {};
  return (
    <ThemeCtx.Provider value={T}><AbsoluteFill style={{ background: T.paper }}>
      <BgAudio audio={p.audio} />
      {scenes.map((s, k) => {
        const ci = 'ci' in s ? s.ci : 0, col = T.pal[ci % T.pal.length], no = s.type === 'page' ? (counters[ci] = (counters[ci] ?? 0) + 1) : 0;
        return (
          <Sequence key={k} from={s.from} durationInFrames={s.dur}>
            {s.type === 'intro' && <><Intro p={p} /><Swipe a={T.sun} /></>}
            {s.type === 'title' && <><TitleScene p={p} ci={s.ci} /><Swipe a={col} b={T.ink} /></>}
            {s.type === 'page' && <><Page p={p} ci={s.ci} idx={s.photos} no={no} of={pagesPer(s.ci)} /><Swipe a={col} /></>}
            {s.type === 'quote' && <><QuoteScene p={p} ci={s.ci} /><Swipe a={col} /></>}
            {s.type === 'stats' && <><Stats p={p} /><Swipe a={T.ink} b={T.sun} /></>}
            {s.type === 'outro' && <><Outro p={p} /><Swipe a={T.ink} b={T.sun} /></>}
          </Sequence>
        );
      })}
    </AbsoluteFill></ThemeCtx.Provider>
  );
};

export type { ElemChapter };
