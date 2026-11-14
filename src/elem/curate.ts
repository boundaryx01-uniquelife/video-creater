import type { PhotoSpec } from '../analysis/videoData.ts';
import { clampPace, planElem, type ElemProps } from './types.ts';

export const hamming = (a?: string, b?: string) => { if (!a || !b || a.length !== b.length) return 64; let n = 0; for (let i = 0; i < a.length; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { n += x & 1; x >>= 1; } } return n; };
const q = (p: PhotoSpec) => p.q ?? 0.5;
export const secondsOf = (p: ElemProps) => planElem(p).total / 30;

export type CurateLog = { dup: number; blur: number; trimmed: number; pace: number; seconds: number };

/** 같은 장면(연사)은 가장 선명한 한 장만, 같은 활동의 다른 사진보다 품질 점수가 절반 이하인(심하게 흔들리거나 어두운) 사진은 뺀다. 활동마다 최소 2장은 남긴다 */
export function dedupeAndCull(chapters: ElemProps['chapters']): { chapters: ElemProps['chapters']; dup: number; blur: number } {
  let dup = 0, blur = 0;
  const out = chapters.map((c) => {
    const keep: PhotoSpec[] = [];
    for (const p of c.photos) {
      const i = keep.findIndex((k, idx) => idx >= keep.length - 3 && hamming(k.h, p.h) <= 8);
      if (i >= 0) { dup++; if (q(p) > q(keep[i])) keep[i] = { ...p, cap: keep[i].cap?.title ? keep[i].cap : p.cap }; } else keep.push(p);
    }
    const sorted = [...keep].map(q).sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] ?? 0.5;
    let kept = keep;
    if (keep.length > 2 && med > 0.3) { const bad = new Set(keep.filter((p) => q(p) < med * 0.45).slice(0, keep.length - 2)); kept = keep.filter((p) => !bad.has(p)); blur += keep.length - kept.length; }
    return { ...c, photos: kept };
  });
  return { chapters: out, dup, blur };
}

/**
 * 목표 길이(초)에 맞추기: 먼저 품질이 낮은 사진부터 줄이고(활동마다 대표 1장 + 1장은 보장),
 * 그래도 길면 장면을 조금 빠르게, 너무 짧으면 조금 느리게 한다. 사진을 더 만들어 낼 수는 없다.
 */
export function fitLength(p: ElemProps, target: number): { props: ElemProps; trimmed: number } {
  let cur = p, trimmed = 0;
  const goal = Math.max(20, target);
  for (let guard = 0; guard < 400 && secondsOf(cur) > goal * 1.06; guard++) {
    let best: { ci: number; pi: number; q: number } | null = null;
    cur.chapters.forEach((c, ci) => { if (c.photos.length <= 2) return; c.photos.forEach((ph, pi) => { if (pi === 0) return; if (!best || q(ph) < best.q) best = { ci, pi, q: q(ph) }; }); });
    if (!best) break;
    const b = best as { ci: number; pi: number };
    cur = { ...cur, chapters: cur.chapters.map((c, ci) => (ci === b.ci ? { ...c, photos: c.photos.filter((_, pi) => pi !== b.pi) } : c)) }; trimmed++;
  }
  const s = secondsOf(cur);
  if (s > goal * 1.06) cur = { ...cur, pace: clampPace((cur.pace ?? 1) * Math.max(0.75, (goal * 1.06) / s)) };
  else if (s < goal * 0.8) cur = { ...cur, pace: clampPace((cur.pace ?? 1) * Math.min(1.3, (goal * 0.9) / s)) };
  return { props: cur, trimmed };
}

/** 1차 자동 정리: 비슷한 사진·흐린 사진 정리 → 목표 길이에 맞춤 */
export function curate(p: ElemProps, targetSec = 60): { props: ElemProps; log: CurateLog } {
  const r = dedupeAndCull(p.chapters), base: ElemProps = { ...p, chapters: r.chapters, pace: 1 }, f = fitLength(base, targetSec);
  return { props: f.props, log: { dup: r.dup, blur: r.blur, trimmed: f.trimmed, pace: f.props.pace ?? 1, seconds: Math.round(secondsOf(f.props)) } };
}
