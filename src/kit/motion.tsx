import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame } from 'remotion';
import { Photo, clamp, easeInOut, fitFont, prog } from '../lib/common';
import { useLayout } from '../lib/layout';
import type { KPhoto, TransitionKind } from './schema.ts';

/* 모든 계열이 함께 쓰는 움직임 도구. 장면은 프레임의 순수 함수여야 한다(Math.random·Date 금지) */
export { clamp, easeInOut, fitFont, prog, useLayout };
/** 통통 튀는 등장(0→1). damping이 클수록 덜 튄다 */
export const pop = (f: number, delay = 0, damping = 11, stiffness = 150) => spring({ frame: f - delay, fps: 30, config: { damping, stiffness, mass: 0.7 } });
/** 부드러운 등장(튀지 않음) */
export const glide = (f: number, delay = 0, dur = 18) => prog(f, delay, dur, easeInOut);
/** 계속 살아 있는 작은 흔들림 */
export const wob = (f: number, seed: number, amp = 1) => Math.sin((f + seed * 41) / 26) * amp;
/** 장면 진행률 0→1 */
export const life = (f: number, dur: number, from = 0) => clamp((f - from) / Math.max(1, dur - from), 0, 1);
export const easeIn = (t: number) => t * t * t;
/** 확대한 만큼만 옮기기(사진 가장자리가 드러나지 않게) */
export const pan = (t: number, z: number) => { const m = Math.max(0, ((z - 1) / 2) * 100 - 0.4); return clamp(t, -m, m); };
/** 사진 비율을 상자 안에 맞춘 크기 */
export const fit = (aspect: number, maxW: number, maxH: number) => { const a = clamp(aspect || 1.5, 0.6, 2.2), w = Math.min(maxW, maxH * a); return { w: Math.round(w), h: Math.round(w / a) }; };

/**
 * 살아 있는 사진: 상자를 꽉 채우고, 장면 동안 천천히 확대하며 피사체 쪽으로 다가간다(켄 번스).
 * strength 0이면 정지, 1이 기본(장면 동안 약 13% 확대). dir로 가로 이동 방향을 바꾼다
 */
export const LivePhoto: React.FC<{ ph: KPhoto; dur: number; from?: number; strength?: number; dir?: 1 | -1; style?: React.CSSProperties }> = ({ ph, dur, from = 0, strength = 1, dir = 1, style }) => {
  const f = useCurrentFrame(), L = life(f, dur, from) * strength, z = 1.04 + 0.13 * L, fx = ph.fx ?? 0.5, fy = ph.fy ?? 0.45;
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}><Photo src={ph.src} fx={fx} fy={fy} scale={z} tx={pan((0.5 - fx) * 7 * L + dir * 1.5 * L, z)} ty={pan((0.45 - fy) * 7 * L, z)} /></div>;
};

/** 장면 시작 전환(장면 첫 22프레임 동안 덮개가 걷힘). cut은 아무것도 그리지 않는다 */
export const Transition: React.FC<{ kind: TransitionKind; a: string; b: string }> = ({ kind, a, b }) => {
  const f = useCurrentFrame(), { W, H } = useLayout(), t1 = prog(f, 2, 17, easeInOut), t2 = prog(f, 0, 17, easeInOut);
  if (kind === 'cut' || f > 22) return null;
  if (kind === 'fade') return <AbsoluteFill style={{ background: a, opacity: 1 - prog(f, 0, 14), zIndex: 60 }} />;
  if (kind === 'iris') { const D = Math.hypot(W, H), r = t1 * D * 0.56; return <div style={{ position: 'absolute', left: W / 2 - r, top: H / 2 - r, width: r * 2, height: r * 2, borderRadius: '50%', boxShadow: `0 0 0 ${D}px ${a}`, border: `${Math.max(0, 26 * (1 - t1))}px solid ${b}`, boxSizing: 'border-box', zIndex: 61 }} />; }
  if (kind === 'blinds') return <>{Array.from({ length: 6 }, (_, i) => { const t = prog(f, i * 1.6, 15, easeInOut); return <div key={i} style={{ position: 'absolute', top: 0, height: '100%', left: `${(i * 100) / 6}%`, width: `${100 / 6 + 0.2}%`, background: i % 2 ? b : a, transform: `translateY(${t * 101}%)`, zIndex: 61 }} />; })}</>;
  if (kind === 'wipe') { const t = prog(f, 0, 16, easeInOut); return <AbsoluteFill style={{ background: a, clipPath: `polygon(${t * 130 - 30}% 0, 100% 0, 100% 100%, ${t * 130}% 100%)`, zIndex: 61 }} />; }
  const axis = kind === 'up' ? 'Y' : 'X', sign = kind === 'up' ? -1 : 1;
  return <>
    <div style={{ position: 'absolute', inset: 0, background: b, transform: `translate${axis}(${sign * t2 * 100}%)`, zIndex: 60 }} />
    <div style={{ position: 'absolute', inset: 0, background: a, transform: `translate${axis}(${sign * t1 * 100}%)`, zIndex: 61 }} />
  </>;
};
