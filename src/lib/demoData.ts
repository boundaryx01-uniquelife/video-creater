import type { DataIntroProps } from '../analysis/introData.ts';
import { samplePhotos } from './samplePhotos';
import { themeById } from './themes';

function rnd(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** 개인정보 없는 가상의 데이터 (저장소/미리보기용) */
export function demoDataIntro(): DataIntroProps {
  const r = rnd(7); const span = 400; const pts: DataIntroProps['points'] = []; const cols = ['#e2553a', '#2f6ca3', '#d8b778', '#6c8f3d', '#b9577f', '#3d8f8a', '#7a5ab0'];
  const hot = [40, 95, 140, 210, 255, 330, 372];
  const add = (day: number, n: number, h0: number, h1: number) => { for (let k = 0; k < n; k++) pts.push({ day, h: h0 + r() * (h1 - h0), hex: cols[Math.floor(r() * cols.length)], s: r(), i: 0 }); };
  hot.forEach((d, i) => add(d, 16 + Math.floor(r() * 34), 8 + i % 3, 17 + i % 4));
  for (let d = 0; d <= span; d += 3 + Math.floor(r() * 9)) add(d, 1 + Math.floor(r() * 3), 7, 22);
  pts.sort((a, b) => a.day - b.day || a.h - b.h).forEach((p, i) => (p.i = i));
  const months: DataIntroProps['startMonth'] = []; for (let m = 0; m < 14; m++) { const y = 2023 + Math.floor((m + 2) / 12), mm = ((m + 2) % 12) + 1; months.push({ y, m: mm, day: Math.round(m * 30.4) }); }
  return {
    title: '100일의 기록', subtitle: '', range: '2023.03 — 2024.04', mode: 'light', accent: '#e2553a', spanDays: span, startMonth: months.filter((m) => m.day <= span), points: pts,
    chapters: hot.map((d, i) => ({ from: d, to: d + (i % 2), accent: cols[i % cols.length], photos: 20 + i * 3, suggested: true })),
    busiest: { day: hot[1], hour: 12, count: 40, label: '06.20' }, stats: [{ n: pts.length, label: '장의 사진' }, { n: 4, label: '곳의 장소' }],
    hero: { src: samplePhotos(themeById('summer'))[1], fx: 0.5, fy: 0.45, day: 210, h: 14.5, label: '2026.02.07 · 14:30' },
  };
}
