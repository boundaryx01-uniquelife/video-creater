import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { OutroData } from '../analysis/videoData.ts';
import { FONT_UI, INK, PAPER, TNUM, easeInOut, easeOut, lerp, prog } from '../lib/common';
import { useLayout, wrapTitle } from '../lib/layout';

/** 아웃트로: 이 앨범의 숫자(총량, 시간대 분포, 가장 몰린 날, 기기)를 한 장에 요약하고 잉크색으로 마무리 */
export const Outro: React.FC<{ o: OutroData; accent: string }> = ({ o, accent }) => {
  const frame = useCurrentFrame(); const { W, H, PAD, portrait } = useLayout();
  const count = Math.round(o.photos * prog(frame, 4, 40, easeOut));
  const max = Math.max(...o.hours, 1);
  const hx0 = portrait ? PAD : Math.round(W * 0.52), hx1 = W - PAD, base = Math.round(H * (portrait ? 0.6 : 0.66)), hh = Math.round(H * (portrait ? 0.22 : 0.4));
  const tl = portrait ? wrapTitle([o.title], 9) : [o.title], tfs = portrait ? Math.min(Math.round(H * 0.085), ...tl.map((l) => Math.round((W - PAD * 2) / (Array.from(l).length * 0.62)))) : Math.round(H * 0.15);
  const bw = (hx1 - hx0) / 24;
  const fin = prog(frame, 118, 22, easeInOut), fin2 = prog(frame, 132, 16, easeOut);
  const rows = [{ k: '가장 많이 찍은 날', v: `${o.busiest} · ${o.busiestCount}장` }, { k: '가장 많이 쓴 기기', v: `${o.device} · ${o.deviceCount}장` }];

  return (
    <AbsoluteFill style={{ background: PAPER, color: INK, fontFamily: FONT_UI, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: PAD - 6, top: H * (portrait ? 0.07 : 0.1), ...TNUM }}>
        <div style={{ fontSize: Math.round(H * (portrait ? 0.17 : 0.3)), fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1 }}>{count}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 8, opacity: prog(frame, 22, 14) }}>
          <div style={{ width: lerp(0, 150, prog(frame, 22, 18, easeOut)), height: 10, background: accent }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em' }}>장의 사진</div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, opacity: 0.6 * prog(frame, 30, 14), marginTop: 22 }}>{o.days}일 · {o.regions}개 지역 · {o.chapters}개 챕터</div>
      </div>

      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <line x1={hx0} x2={hx1} y1={base} y2={base} stroke="rgba(17,17,17,.3)" strokeWidth={2} />
        {o.hours.map((n, i) => {
          const a = prog(frame, 16 + i * 1.3, 22, easeOut), h = (n / max) * hh * a, peak = i === o.peakHour;
          return <rect key={i} x={hx0 + i * bw + bw * 0.14} y={base - h} width={bw * 0.72} height={h} fill={peak ? accent : INK} opacity={peak ? 1 : 0.88} />;
        })}
        {[0, 6, 12, 18, 23].map((h) => <text key={h} x={hx0 + h * bw + bw * 0.5} y={base + 38} textAnchor="middle" fontSize={22} fontWeight={600} fill="rgba(17,17,17,.55)" style={TNUM}>{h}</text>)}
        {(() => { const a = prog(frame, 46, 14); const x = hx0 + o.peakHour * bw + bw * 0.5, y = base - (o.hours[o.peakHour] / max) * hh - 22; return <text x={Math.min(x, hx1 - 10)} y={y} textAnchor="middle" fontSize={30} fontWeight={800} fill={INK} opacity={a} style={TNUM}>{o.peakHour}시</text>; })()}
        <text x={hx0} y={base + 92} fontSize={portrait ? 28 : 26} fontWeight={600} fill="rgba(17,17,17,.6)" opacity={prog(frame, 40, 14)}>시간대별 촬영 수 · 가장 많이 찍은 시간 {o.peakHour}시</text>
      </svg>

      <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: H * (portrait ? 0.1 : 0.12), display: 'flex', gap: portrait ? 40 : 80, flexDirection: portrait ? 'column' : 'row' }}>
        {rows.map((r, i) => { const a = prog(frame, 56 + i * 8, 16, easeOut); return (
          <div key={i} style={{ opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
            <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.55 }}>{r.k}</div>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 6, ...TNUM }}>{r.v}</div>
          </div>); })}
      </div>

      {/* 마무리: 잉크색 패널이 아래에서 올라오며 타이틀로 닫힘 */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%', background: INK, transform: `translateY(${(1 - fin) * 100}%)` }}>
        <div style={{ position: 'absolute', left: PAD - 4, bottom: H * 0.13, color: '#fff', opacity: fin2, transform: `translateY(${(1 - fin2) * 30}px)` }}>
          {tl.map((l, i) => <div key={i} style={{ fontSize: tfs, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: portrait ? 1.04 : 1, ...TNUM }}>{l}</div>)}
          <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.65, marginTop: 20, ...TNUM }}>{o.range}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
