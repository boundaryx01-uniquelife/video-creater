import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import type { ChapterSpec } from '../analysis/videoData.ts';
import type { DataIntroProps } from '../analysis/introData.ts';
import { CARD } from '../analysis/videoData.ts';
import { FONT_UI, INK, PAPER, Photo, TNUM, clamp, easeInOut, easeOut, lerp, prog } from '../lib/common';
import { useLayout } from '../lib/layout';

/** 챕터 타이틀 카드: 큰 날짜 + 촬영 통계 + 연간 바코드 띠(현재 챕터 하이라이트) + 오른쪽 대표 사진 패널(풀스크린으로 매치컷) */
export const ChapterCard: React.FC<{ ch: ChapterSpec; intro: DataIntroProps }> = ({ ch, intro }) => {
  const frame = useCurrentFrame();
  const { W, H, PAD, portrait } = useLayout();
  const PW = Math.round(H * 0.75), LW = W - PW;
  const hero = ch.photos[0];

  const reveal = prog(frame, 2, 22, easeInOut);
  const exit = prog(frame, CARD - 22, 20, easeInOut);
  const expand = ch.matchCut ? exit : 0;
  const textOut = prog(frame, CARD - 24, 14, easeInOut);
  const clip = `inset(${lerp((1 - reveal) * 100, 0, 1)}% ${lerp(0, 0, expand)}px 0 ${lerp(LW, 0, expand)}px)`;

  const bigFs = Math.min(Math.round(H * 0.3), Math.round((LW - PAD * 1.4) / (Math.max(3, Array.from(ch.big).length) * 0.62)));
  const stripL = PAD, stripR = LW - PAD, stripT = H - 300, stripB = H - 150;
  const sx = (d: number) => stripL + (d / intro.spanDays) * (stripR - stripL);
  const sy = (h: number) => stripT + ((clamp(h, 5, 24) - 5) / 19) * (stripB - stripT);
  const inCh = (d: number) => d >= ch.fromDay && d <= ch.toDay;
  const dots = useMemo(() => intro.points, [intro.points]);
  const bandP = prog(frame, 14, 18, easeOut);
  const bx0 = sx(ch.fromDay) - 8, bx1 = sx(ch.toDay) + 8;

  if (portrait) {
    // 세로: 위쪽에 글자·통계·바코드 띠, 아래쪽 밴드에 대표 사진(매치컷이면 전체 화면으로 펼쳐짐)
    const PT = Math.round(H * 0.55), top = lerp(H - (H - PT) * reveal, 0, expand);
    const bigFs2 = Math.min(Math.round(H * 0.11), Math.round((W - PAD * 2) / (Math.max(3, Array.from(ch.big).length) * 0.62)));
    const y0 = Math.round(H * 0.075), sw = W - PAD * 2, stT = PT - 215, stB = PT - 85;
    const sx2 = (d: number) => PAD + (d / intro.spanDays) * sw, sy2 = (h: number) => stT + ((clamp(h, 5, 24) - 5) / 19) * (stB - stT);
    const bx0p = sx2(ch.fromDay) - 8, bx1p = sx2(ch.toDay) + 8;
    return (
      <AbsoluteFill style={{ background: PAPER, fontFamily: FONT_UI, color: INK, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: PAD, top: PAD * 0.9, fontSize: 30, fontWeight: 700, opacity: prog(frame, 0, 10) * (1 - textOut), ...TNUM }}>
          {String(ch.index + 1).padStart(2, '0')} <span style={{ opacity: 0.4 }}>/ {String(ch.total).padStart(2, '0')}</span>
        </div>
        <div style={{ opacity: 1 - textOut, transform: `translateY(${-textOut * 40}px)` }}>
          <div style={{ position: 'absolute', left: PAD - 8, top: y0 + 60, overflow: 'hidden', paddingBottom: '0.06em' }}>
            <div style={{ fontSize: bigFs2, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1, whiteSpace: 'nowrap', transform: `translateY(${(1 - prog(frame, 8, 24, easeOut)) * 105}%)`, ...TNUM }}>{ch.big}</div>
          </div>
          <div style={{ position: 'absolute', left: PAD, right: PAD, top: y0 + 60 + bigFs2 * 1.1, opacity: prog(frame, 20, 14), display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: lerp(0, 120, prog(frame, 18, 18, easeOut)), height: 10, background: ch.accent, flex: 'none' }} />
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em' }}>{ch.small}</div>
          </div>
          <div style={{ position: 'absolute', left: PAD, right: PAD, top: y0 + 60 + bigFs2 * 1.1 + 110, display: 'flex', flexWrap: 'wrap', gap: '24px 48px' }}>
            {ch.meta.map((m, i) => { const a = prog(frame, 24 + i * 5, 16, easeOut); return (
              <div key={i} style={{ opacity: a, transform: `translateY(${(1 - a) * 22}px)` }}>
                <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, ...TNUM }}>{m.v}</div>
                <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.55, marginTop: 6 }}>{m.l}</div>
              </div>); })}
          </div>
          <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: prog(frame, 6, 12) }}>
            <rect x={bx0p} y={stT - 26} width={Math.max(16, (bx1p - bx0p) * bandP)} height={stB - stT + 52} fill={ch.accent} opacity={0.18} />
            {dots.map((d, i) => { const on = inCh(d.day); return <circle key={i} cx={sx2(d.day)} cy={sy2(d.h)} r={on ? 4.6 : 2.4} fill={on ? d.hex : `rgba(17,17,17,.32)`} />; })}
            {intro.startMonth.map((m, i) => <text key={i} x={sx2(m.day)} y={stB + 52} fontSize={20} fontWeight={600} fill="rgba(17,17,17,.55)" style={TNUM}>{m.m === 1 || i === 0 ? `${m.y}.${m.m}` : m.m}</text>)}
            <polygon points={`${(bx0p + bx1p) / 2 - 9},${stT - 44} ${(bx0p + bx1p) / 2 + 9},${stT - 44} ${(bx0p + bx1p) / 2},${stT - 30}`} fill={INK} opacity={bandP} />
          </svg>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top, overflow: 'hidden', background: '#000' }}>
          <Photo src={hero.src} fy={hero.fy} fx={hero.fx} scale={interpolate(frame, [0, CARD], [1.16, 1.04])} />
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: PAPER, fontFamily: FONT_UI, color: INK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD * 0.62, fontSize: 28, fontWeight: 700, opacity: prog(frame, 0, 10) * (1 - textOut), ...TNUM }}>
        {String(ch.index + 1).padStart(2, '0')} <span style={{ opacity: 0.4 }}>/ {String(ch.total).padStart(2, '0')}</span>
      </div>

      <div style={{ position: 'absolute', left: PAD - 8, top: H * 0.2, overflow: 'hidden', paddingBottom: '0.06em', opacity: 1 - textOut, transform: `translateY(${-textOut * 40}px)` }}>
        <div style={{ fontSize: bigFs, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1, whiteSpace: 'nowrap', transform: `translateY(${(1 - prog(frame, 8, 24, easeOut)) * 105}%)`, ...TNUM }}>{ch.big}</div>
      </div>
      <div style={{ position: 'absolute', left: PAD, top: H * 0.2 + bigFs * 1.04, opacity: (1 - textOut) * prog(frame, 20, 14), display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: lerp(0, 150, prog(frame, 18, 18, easeOut)), height: 10, background: ch.accent }} />
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em' }}>{ch.small}</div>
      </div>

      <div style={{ position: 'absolute', left: PAD, top: H * 0.2 + bigFs * 1.04 + 110, display: 'flex', gap: 64, opacity: 1 - textOut }}>
        {ch.meta.map((m, i) => { const a = prog(frame, 24 + i * 5, 16, easeOut); return (
          <div key={i} style={{ opacity: a, transform: `translateY(${(1 - a) * 22}px)` }}>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, ...TNUM }}>{m.v}</div>
            <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.55, marginTop: 6 }}>{m.l}</div>
          </div>); })}
      </div>

      {/* 연간 바코드 띠 */}
      <svg width={LW} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: (1 - textOut) * prog(frame, 6, 12) }}>
        <rect x={bx0} y={stripT - 26} width={Math.max(16, (bx1 - bx0) * bandP)} height={stripB - stripT + 52} fill={ch.accent} opacity={0.18} />
        {dots.map((d, i) => { const on = inCh(d.day); return <circle key={i} cx={sx(d.day)} cy={sy(d.h)} r={on ? 4.6 : 2.4} fill={on ? d.hex : `rgba(17,17,17,.32)`} />; })}
        {intro.startMonth.map((m, i) => <text key={i} x={sx(m.day)} y={stripB + 54} fontSize={19} fontWeight={600} fill="rgba(17,17,17,.55)" style={TNUM}>{m.m === 1 || i === 0 ? `${m.y}.${m.m}` : m.m}</text>)}
        <polygon points={`${(bx0 + bx1) / 2 - 9},${stripT - 44} ${(bx0 + bx1) / 2 + 9},${stripT - 44} ${(bx0 + bx1) / 2},${stripT - 30}`} fill={INK} opacity={bandP} />
      </svg>

      {/* 대표 사진 패널 → 풀스크린 매치컷 */}
      <div style={{ position: 'absolute', inset: 0, clipPath: clip, overflow: 'hidden', background: '#000' }}>
        <div style={{ position: 'absolute', left: lerp(LW, 0, expand), top: 0, right: 0, bottom: 0 }}>
          <Photo src={hero.src} fy={hero.fy} fx={hero.fx} scale={interpolate(frame, [0, CARD], [1.16, 1.04])} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0 }} />
    </AbsoluteFill>
  );
};
