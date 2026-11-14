import type { PhotoSpec } from '../analysis/videoData.ts';

type P = Pick<PhotoSpec, 'ts' | 'time'>;
/**
 * 촬영 시각이 20분 이상 비는 곳을 경계로 활동을 나눈다(최대 6개). 사진이 1장뿐인 활동은 시간 간격이 더 짧은 이웃에 합친다.
 * 시각이 없는 사진이 있거나 2장 미만이면 null(호출하는 쪽이 장수로 나눈다).
 */
export function splitByGaps<T extends P>(photos: T[], minGapMin = 20, max = 6): T[][] | null {
  const sorted = [...photos].sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity));
  if (sorted.length < 2 || sorted.some((p) => p.ts == null)) return null;
  const MIN = minGapMin * 60e3;
  const cuts = sorted.slice(1).map((p, i) => ({ i: i + 1, g: p.ts! - sorted[i].ts! })).filter((x) => x.g >= MIN).sort((a, b) => b.g - a.g).slice(0, max - 1).map((x) => x.i).sort((a, b) => a - b);
  const groups: T[][] = []; let st = 0; for (const c of [...cuts, sorted.length]) { groups.push(sorted.slice(st, c)); st = c; }
  const gap = (a: T[], b: T[]) => b[0].ts! - a[a.length - 1].ts!;
  while (groups.length > 1) {
    const k = groups.findIndex((g) => g.length < 2); if (k < 0) break;
    const before = k > 0 ? gap(groups[k - 1], groups[k]) : Infinity, after = k < groups.length - 1 ? gap(groups[k], groups[k + 1]) : Infinity;
    if (before <= after) { groups[k - 1] = [...groups[k - 1], ...groups[k]]; groups.splice(k, 1); } else { groups[k + 1] = [...groups[k], ...groups[k + 1]]; groups.splice(k, 1); }
  }
  return groups;
}
/** 활동의 촬영 시각 범위 표시(예: 10:05 – 11:10) */
export const rangeOf = (g: P[]) => { const t = g.map((x) => x.time).filter(Boolean).sort(); return t.length ? (t[0] === t[t.length - 1] ? t[0] : `${t[0]} – ${t[t.length - 1]}`) : ''; };
/** AI가 이름을 정하지 않았을 때: 지어내지 않고 촬영 시각으로만 이름을 붙인다 */
export function timeNames(groups: P[][]): string[] {
  const part = (g: P[]) => { const t = g.map((p) => p.time).filter((x) => /^\d{1,2}:\d{2}$/.test(x)).sort()[0]; if (!t) return '활동'; const h = Number(t.split(':')[0]) + Number(t.split(':')[1]) / 60; return h < 11.5 ? '오전 활동' : h < 13.5 ? '점심 무렵' : h < 17 ? '오후 활동' : '저녁 활동'; };
  const names = groups.map(part), count: Record<string, number> = {}, seen: Record<string, number> = {};
  names.forEach((n) => { count[n] = (count[n] ?? 0) + 1; });
  return names.map((n) => (count[n] > 1 ? `${n} ${(seen[n] = (seen[n] ?? 0) + 1)}` : n));
}
