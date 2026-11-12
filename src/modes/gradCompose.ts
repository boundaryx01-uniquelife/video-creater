/** 자동 구성 결과(GradPlan)를 졸업 영상 props(ModeVideoProps)에 반영한다. 순수 함수. 사진 파일 처리는 호출자가 한다 */
import type { PhotoSpec } from '../analysis/videoData.ts';
import type { ModeChapter, ModeVideoProps } from './video.ts';
import { comma, fmtDay, type GradPlan } from './schoolYear.ts';

const z2 = (n: number) => String(n).padStart(2, '0');

/** 선택된 사진의 인덱스(입력 사진 배열 기준) 목록: 호출자가 이 인덱스의 사진만 서버에 올리면 된다 */
export const pickedIndexes = (plan: GradPlan): number[] => plan.picks.flat().map((p) => p.index);

/**
 * 반영 대상: 챕터(사진이 있는 학년만) · 오프닝 타임라인(counts/bands/marks) · 카드 meta · 인트로 칩(입학/졸업/졸업생) · 아웃트로 rows/stats · 명단 장면 부제.
 * 사진이 없는 학년의 챕터는 만들지 않는다. 모든 학년이 비면(또는 사진을 하나도 못 읽으면) Error.
 * 학년별 기존 챕터가 있으면 그 컷 속도(style)와 데이터 장면(beat, beatPhotos)을 이어 쓴다.
 */
export function composeGrad(base: ModeVideoProps, plan: GradPlan, photoOf: (index: number) => PhotoSpec | undefined): ModeVideoProps {
  if (!plan.picks.some((p) => p.length)) throw new Error('입학~졸업 범위 안에 촬영 시각이 있는 사진이 없어 구성할 수 없습니다.');
  const labels = plan.grades.map((g) => g.label);
  const old = (g: number): ModeChapter | undefined => base.chapters.find((c) => c.card.rail.type === 'segments' && c.card.rail.active === g - 1) ?? (base.chapters.length === plan.years ? base.chapters[g - 1] : undefined);
  const chapters: ModeChapter[] = [];
  plan.grades.forEach((g, k) => {
    if (!plan.picks[k].length) return;
    // 사진을 읽지 못해 photoOf 가 undefined 를 주면 그 사진은 뺀다(대표는 남은 첫 장이 이어받음)
    const prev = old(g.grade), spec = plan.picks[k].flatMap((pk): PhotoSpec[] => { const p = photoOf(pk.index); return p ? [{ ...p, cap: { chip: pk.chip, title: pk.title, sub: pk.sub } }] : []; });
    if (!spec.length) return;
    chapters.push({
      style: prev?.style ?? 'steady', beat: prev?.beat, beatPhotos: prev?.beatPhotos,
      card: { index: `${z2(g.grade)} / ${z2(plan.years)}`, big: g.label, small: `${g.schoolYear}학년도`,
        meta: [{ v: `${comma(g.count)}장`, l: '사진' }, { v: g.events.join(' · ') || '—', l: '주요 행사' }, { v: `D+${comma(g.fromD)} – D+${comma(g.toD)}`, l: '함께한 날' }],
        rail: { type: 'segments', labels, active: g.grade - 1 } },
      photos: spec,
    });
  });
  if (!chapters.length) throw new Error('사진을 하나도 읽지 못해 구성할 수 없습니다.');
  const tl = { kind: 'timeline' as const, kicker: 'THREE YEARS', title: '3년의 기록', unit: '장', counts: plan.counts, bands: plan.bands, marks: plan.marks };
  let opening = base.opening ?? [];
  if (opening.some((x) => x.beat.kind === 'timeline')) opening = opening.map((x) => (x.beat.kind === 'timeline' ? { ...x, beat: { ...x.beat, counts: plan.counts, bands: plan.bands, marks: plan.marks } } : x));
  else opening = [{ dur: 128, beat: tl }, ...opening];
  const start = fmtDay(plan.start), end = fmtDay(plan.end), grads = plan.graduates;
  const setBy = <T extends Record<string, string>>(list: T[], key: string, name: string, patch: Partial<T>): T[] => (list.some((x) => x[key] === name) ? list.map((x) => (x[key] === name ? { ...x, ...patch } : x)) : list);
  let chips = base.intro.chips; chips = setBy(chips, 'k', '입학', { v: start }); chips = setBy(chips, 'k', '졸업', { v: end }); if (grads != null) chips = setBy(chips, 'k', '졸업생', { v: `${comma(grads)}명` });
  let rows = base.outro.rows; rows = setBy(rows, 'k', '입학', { v: start }); rows = setBy(rows, 'k', '졸업', { v: end });
  const stats = [...(base.outro.stats ?? [])]; const put = (l: string, n: string) => { const i = stats.findIndex((s) => s.l === l); if (i >= 0) stats[i] = { ...stats[i], n }; else stats.push({ n, l }); };
  if (grads != null) put('졸업생', comma(grads)); put('함께한 날', comma(plan.totalDays)); put('장의 사진', comma(plan.inRange));
  const closing = grads == null ? base.closing : base.closing?.map((x) => (x.beat.kind === 'names' ? { ...x, beat: { ...x.beat, sub: x.beat.sub.replace(/\d[\d,]*명/, `${comma(grads)}명`) } } : x));
  return { ...base, intro: { ...base.intro, chips }, opening, chapters, closing, outro: { ...base.outro, rows, stats } };
}
