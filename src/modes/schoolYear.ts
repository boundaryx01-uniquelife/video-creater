/**
 * 졸업 영상 자동 구성 (순수 함수, React·DOM 의존 없음)
 *
 * 입력: 사진 목록(촬영 시각 ts), 입학일, 졸업일, 행사 목록.
 * 출력: 학년 분류 · 학년별 요약 · D+n · 월별 사진 수(counts) · 타임라인 bands/marks · 학년별 대표 사진 선정 · 자막 · 아웃트로 통계.
 *
 * 규칙(요약, 자세한 내용은 docs/grad-auto.md)
 * - 학제: 한국 학제, 3월 1일에 학년이 바뀐다. 2월 말일(윤년은 29일)까지가 이전 학년.
 * - 입학 학년도 = 입학일의 달력 연도(2월 입학 오리엔테이션도 그해 3월 학년도에 속함).
 * - 범위 = 입학일 ~ 졸업일(양 끝 포함, 날짜 단위). 졸업일이 마지막 학년 말(2월 말일)을 넘으면 그 말일까지만 쓰고 경고한다.
 * - 범위 밖 사진(입학 전·졸업 후)과 촬영 시각이 없는 사진은 "기타"로 분리해 개수만 알리고 영상·통계에서 제외한다.
 * - 날짜는 촬영 시각의 "현지 달력 날짜"(브라우저/EXIF와 같은 기준)로 계산한다. D+1 = 입학일 당일.
 */

export type GradEvent = { date: string; label: string; to?: string; kind?: 'major' | 'normal' };
export type GradPhotoMeta = { ts?: number | null; aspect?: number; score?: number };
export type GradInput = {
  photos: GradPhotoMeta[]; enroll: string; graduate: string; events?: GradEvent[];
  graduates?: number; years?: number; perGrade?: number; windowDays?: number;
};

export type Ymd = { y: number; m: number; d: number };
const z2 = (n: number) => String(n).padStart(2, '0');
const DAY = 86400000;

/** 'YYYY-MM-DD' · 'YYYY.MM.DD' · 'YYYY/M/D' 를 읽는다. 존재하지 않는 날짜(2월 30일 등)는 null */
export function parseYmd(s: string | undefined | null): Ymd | null {
  const m = /^\s*(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\s*$/.exec(String(s ?? '')); if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, m: mo, d } : null;
}
/** 1970-01-01 기준 일 번호(시간대·서머타임 영향 없음) */
export const dayNo = (v: Ymd) => Math.round(Date.UTC(v.y, v.m - 1, v.d) / DAY);
export const ymdOfDay = (n: number): Ymd => { const t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
/** 촬영 시각(epoch ms)의 현지 달력 날짜 */
export const ymdOfTs = (ts: number): Ymd => { const t = new Date(ts); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
export const fmtYmd = (v: Ymd) => `${v.y}.${z2(v.m)}.${z2(v.d)}`;
export const fmtDay = (n: number) => fmtYmd(ymdOfDay(n));
/** 3월 1일 기준 학년도 (2025-02-28 → 2024, 2025-03-01 → 2025) */
export const schoolYearOf = (v: Ymd) => (v.m >= 3 ? v.y : v.y - 1);
export const schoolYearStartDay = (sy: number) => dayNo({ y: sy, m: 3, d: 1 });
/** 학년도 마지막 날 = 다음 해 2월 말일(윤년 29일) */
export const schoolYearEndDay = (sy: number) => Math.round(Date.UTC(sy + 1, 2, 0) / DAY);
export const comma = (n: number) => Math.round(n).toLocaleString('en-US');

export type Ev = { label: string; kind: 'major' | 'normal'; from: number; to: number; order: number; grade: number; month: number; photos: number };
export type GradeInfo = {
  grade: number; label: string; schoolYear: number; from: number; to: number; fromD: number; toD: number;
  count: number; photos: number[]; events: string[]; exists: boolean;
};
export type Pick = { index: number; ts: number; chip: string; title: string; sub: string; event?: string; hero?: boolean };
export type GradPlan = {
  ok: true; years: number; start: number; end: number; totalDays: number; graduates?: number;
  grades: GradeInfo[]; inRange: number;
  other: { before: number[]; after: number[]; noTime: number[] };
  months: string[]; counts: number[];
  bands: { label: string; from: number; to: number }[]; marks: { i: number; label: string }[]; droppedMarks: string[];
  events: Ev[]; skippedEvents: string[];
  picks: Pick[][]; // grades[k] 와 같은 순서. 첫 원소가 챕터 대표
  warnings: string[];
};
export type GradPlanFail = { ok: false; errors: string[] };

/** 같은 달·인접 달 행사 라벨이 겹치지 않게 타임라인 마크를 고르는 데 쓰는 화면 상수(1920px 기준, ModeScenes timeline) */
const LABEL_PX = 30, SCREEN_W = 1920, SCREEN_PAD = 120;

/** 한 장의 "쓸 만함" 점수. 품질 점수가 있으면 그것이 주(+행사 보너스), 없으면 가로형·행사일 근처 우선 */
export function photoScore(p: GradPhotoMeta, nearEvent: number): number {
  const land = p.aspect != null ? (p.aspect >= 1.2 ? 1 : p.aspect >= 0.9 ? 0.4 : 0) : 0.5;
  return p.score != null ? p.score + 0.15 * nearEvent + 0.1 * land : 0.4 + 0.3 * land + 0.3 * nearEvent;
}

export function planGrad(input: GradInput): GradPlan | GradPlanFail {
  const errors: string[] = [], warnings: string[] = [];
  const en = parseYmd(input.enroll), gr = parseYmd(input.graduate), years = Math.max(1, Math.min(6, Math.round(input.years ?? 3)));
  if (!en) errors.push('입학일을 YYYY-MM-DD 형식으로 입력해 주세요.');
  if (!gr) errors.push('졸업일을 YYYY-MM-DD 형식으로 입력해 주세요.');
  if (!en || !gr) return { ok: false, errors };
  const start = dayNo(en), eSY = en.y, lastEnd = schoolYearEndDay(eSY + years - 1);
  let end = dayNo(gr);
  if (end < start) return { ok: false, errors: ['졸업일이 입학일보다 앞섭니다.'] };
  if (end > lastEnd) { warnings.push(`졸업일이 ${years}학년 말(${fmtDay(lastEnd)})을 넘어 그날까지만 사용합니다.`); end = lastEnd; }
  const perGrade = Math.max(1, Math.round(input.perGrade ?? 10)), win = Math.max(0, Math.round(input.windowDays ?? 1));

  // 학년 구간
  const grades: GradeInfo[] = [];
  for (let g = 1; g <= years; g++) {
    const sy = eSY + g - 1, from = g === 1 ? start : Math.max(start, schoolYearStartDay(sy)), to = Math.min(end, schoolYearEndDay(sy));
    grades.push({ grade: g, label: `${g}학년`, schoolYear: sy, from, to, fromD: from - start + 1, toD: to - start + 1, count: 0, photos: [], events: [], exists: from <= to });
  }
  // 사진 분류
  const other = { before: [] as number[], after: [] as number[], noTime: [] as number[] }, dayOf: (number | null)[] = [];
  input.photos.forEach((p, i) => {
    if (p.ts == null || !Number.isFinite(p.ts)) { other.noTime.push(i); dayOf.push(null); return; }
    const d = dayNo(ymdOfTs(p.ts)); dayOf.push(d);
    if (d < start) other.before.push(i); else if (d > end) other.after.push(i);
    else { const g = grades.find((x) => x.exists && d >= x.from && d <= x.to); if (g) g.photos.push(i); else other.after.push(i); }
  });
  grades.forEach((g) => (g.count = g.photos.length));
  const inRange = grades.reduce((a, g) => a + g.count, 0);

  // 월 축(입학 월 ~ 졸업 월)
  const e0 = ymdOfDay(start), e1 = ymdOfDay(end), nMonths = (e1.y - e0.y) * 12 + (e1.m - e0.m) + 1;
  const monthIdx = (day: number) => { const v = ymdOfDay(day); return (v.y - e0.y) * 12 + (v.m - e0.m); };
  const months = Array.from({ length: nMonths }, (_, i) => { const t = e0.m - 1 + i; return `${e0.y + Math.floor(t / 12)}.${z2((t % 12) + 1)}`; });
  const counts = new Array<number>(nMonths).fill(0);
  grades.forEach((g) => g.photos.forEach((i) => { counts[monthIdx(dayOf[i]!)]++; }));
  const bands = grades.filter((g) => g.exists).map((g) => ({ label: `${g.grade}학년 · ${g.schoolYear}`, from: monthIdx(g.from), to: monthIdx(g.to) }));

  // 행사
  const events: Ev[] = [], skippedEvents: string[] = [];
  (input.events ?? []).forEach((e, order) => {
    const label = (e.label ?? '').trim(), a = parseYmd(e.date); if (!label && !e.date) return;
    if (!a) { skippedEvents.push(`${label || '(이름 없음)'} — 날짜 형식 오류`); return; }
    let b = e.to ? parseYmd(e.to) : null; const fa = dayNo(a); let fb = b ? dayNo(b) : fa; if (fb < fa) fb = fa;
    if (!label) { skippedEvents.push(`${e.date} — 행사 이름 없음`); return; }
    if (fa < start || fa > end) { skippedEvents.push(`${label} (${fmtDay(fa)}) — 입학~졸업 범위 밖`); return; }
    const g = grades.find((x) => x.exists && fa >= x.from && fa <= x.to)!;
    events.push({ label, kind: e.kind === 'major' ? 'major' : 'normal', from: fa, to: Math.min(fb, end), order, grade: g.grade, month: monthIdx(fa), photos: 0 });
  });
  const distTo = (ev: Ev, day: number) => (day >= ev.from && day <= ev.to ? 0 : Math.min(Math.abs(day - ev.from), Math.abs(day - ev.to)));
  /** 사진이 가장 가까운 행사(창 안일 때만). 동률이면 입력 순서가 빠른 행사 */
  const nearest = (day: number): { ev: number; dist: number } | null => {
    let best: { ev: number; dist: number } | null = null;
    events.forEach((ev, k) => { const d = distTo(ev, day); if (d <= win && (!best || d < best.dist)) best = { ev: k, dist: d }; });
    return best;
  };
  const gradeOf = new Map<number, number>(); grades.forEach((g) => g.photos.forEach((i) => gradeOf.set(i, g.grade)));
  const near: ({ ev: number; dist: number } | null)[] = input.photos.map((_, i) => (gradeOf.has(i) ? nearest(dayOf[i]!) : null));
  near.forEach((n) => { if (n) events[n.ev].photos++; });

  // 학년별 대표 행사(사진이 실제 있는 행사 중 주요 → 사진 많은 순 2개, 표시는 시간순)
  grades.forEach((g) => {
    const evs = events.filter((e) => e.grade === g.grade && e.photos > 0).sort((a, b) => (+(b.kind === 'major') - +(a.kind === 'major')) || b.photos - a.photos || a.order - b.order).slice(0, 2);
    g.events = evs.sort((a, b) => a.from - b.from).map((e) => e.label);
  });

  // 타임라인 마크: 우선순위(주요 → 사진 많은 순)로 고르되 라벨이 가로로 겹치면 뺀다
  const bw = (SCREEN_W - 2 * SCREEN_PAD) / nMonths, mx = Math.max(...counts, 1), MH = 367; // MH: timeline 막대 최대 높이(H*0.34)
  const extent = (m: number, label: string) => { const x = m * bw + bw / 2, w = label.length * LABEL_PX; return m < 2 ? [x, x + w] : m > nMonths - 3 ? [x - w, x] : [x - w / 2, x + w / 2]; };
  /** 렌더러와 같은 규칙(배열 순서가 홀수면 라벨이 위로 더 올라감)으로 위치를 계산해 두 라벨 상자가 겹치는지 본다 */
  const clashes = (list: number[]) => {
    const sorted = [...list].sort((p, q) => events[p].month - events[q].month);
    const box = sorted.map((k, j) => { const [x0, x1] = extent(events[k].month, events[k].label), y = (counts[events[k].month] / mx) * MH + (j % 2 ? 58 : 22); return { x0, x1, y }; });
    return box.some((p, i) => box.some((q, j) => j > i && p.x0 < q.x1 + 8 && q.x0 < p.x1 + 8 && Math.abs(p.y - q.y) < 32));
  };
  const prio = [...events.keys()].sort((a, b) => (+(events[b].kind === 'major') - +(events[a].kind === 'major')) || events[b].photos - events[a].photos || events[a].order - events[b].order);
  const chosen: number[] = [], droppedMarks: string[] = [], seenMonth = new Set<number>();
  for (const k of prio) { if (seenMonth.has(events[k].month) || clashes([...chosen, k])) droppedMarks.push(events[k].label); else { chosen.push(k); seenMonth.add(events[k].month); } }
  const marks = chosen.map((k) => ({ i: events[k].month, label: events[k].label })).sort((a, b) => a.i - b.i);

  // 학년별 대표 사진
  const picks: Pick[][] = grades.map((g) => (g.count ? choose(g, input.photos, dayOf, near, events, perGrade, start) : []));

  // 경고
  if (other.noTime.length) warnings.push(`촬영 시각이 없는 사진 ${other.noTime.length}장은 날짜를 알 수 없어 제외합니다.`);
  if (other.before.length) warnings.push(`입학일(${fmtDay(start)}) 이전에 찍은 사진 ${other.before.length}장은 범위 밖으로 제외합니다.`);
  if (other.after.length) warnings.push(`졸업일(${fmtDay(end)}) 이후에 찍은 사진 ${other.after.length}장은 범위 밖으로 제외합니다.`);
  const empty = grades.filter((g) => g.exists && !g.count).map((g) => g.label);
  if (inRange && empty.length) warnings.push(`${empty.join('·')}에는 사진이 없어 해당 챕터는 만들지 않습니다.`);
  if (!inRange) warnings.push('입학~졸업 범위 안에 촬영 시각이 있는 사진이 없습니다. 입학·졸업일을 확인해 주세요.');
  if (skippedEvents.length) warnings.push(`반영하지 않은 행사 ${skippedEvents.length}개: ${skippedEvents.slice(0, 3).join(', ')}${skippedEvents.length > 3 ? ' 외' : ''}`);
  if (droppedMarks.length) warnings.push(`타임라인에서 라벨이 겹치는 행사 ${droppedMarks.length}개는 표시하지 않습니다: ${droppedMarks.join(', ')}`);

  return { ok: true, years, start, end, totalDays: end - start + 1, graduates: input.graduates, grades, inRange, other, months, counts, bands, marks, droppedMarks, events, skippedEvents, picks, warnings };
}

/** 한 학년에서 perGrade 장을 고른다: 행사별 최고 1장 → 남는 자리는 학년 기간을 균등 분할해 구간별 최고 1장씩 */
function choose(g: GradeInfo, photos: GradPhotoMeta[], dayOf: (number | null)[], near: ({ ev: number; dist: number } | null)[], events: Ev[], perGrade: number, start: number): Pick[] {
  const want = Math.min(perGrade, g.count), nearV = (i: number) => { const n = near[i]; return n ? 1 - n.dist / (1 + (n.dist > 0 ? n.dist : 0)) * 0.5 : 0; };
  const sc = (i: number) => photoScore(photos[i], near[i] ? nearV(i) : 0);
  const better = (a: number, b: number) => sc(a) > sc(b) || (sc(a) === sc(b) && photos[a].ts! < photos[b].ts!) ? a : b;
  const picked: number[] = [], evPick = new Map<number, number>();
  const minGap = (i: number) => picked.every((p) => Math.abs(photos[p].ts! - photos[i].ts!) >= 10 * 60000);
  // 1) 행사별 대표
  const evs = events.map((e, k) => ({ e, k })).filter((x) => x.e.grade === g.grade && x.e.photos > 0)
    .sort((a, b) => (+(b.e.kind === 'major') - +(a.e.kind === 'major')) || b.e.photos - a.e.photos || a.e.order - b.e.order).slice(0, Math.max(1, Math.ceil(want * 0.6)));
  for (const { k } of evs) {
    const cand = g.photos.filter((i) => near[i]?.ev === k && !picked.includes(i)); if (!cand.length) continue;
    const ok = cand.filter(minGap), pool = ok.length ? ok : cand; const best = pool.reduce(better); picked.push(best); evPick.set(k, best);
  }
  // 2) 기간 균등 분할 채우기
  const rest = () => want - picked.length;
  if (rest() > 0) {
    const n = rest(), span = g.to - g.from + 1;
    for (let s = 0; s < n && rest() > 0; s++) {
      const lo = g.from + (span * s) / n, hi = g.from + (span * (s + 1)) / n;
      const pool = g.photos.filter((i) => !picked.includes(i) && dayOf[i]! >= lo && dayOf[i]! < hi && minGap(i));
      if (!pool.length) continue;
      const adj = (i: number) => sc(i) - (picked.some((p) => dayOf[p] === dayOf[i]) ? 0.2 : 0);
      picked.push(pool.reduce((a, b) => (adj(a) > adj(b) || (adj(a) === adj(b) && photos[a].ts! < photos[b].ts!) ? a : b)));
    }
    // 구간이 비어 모자라면 남은 사진 중 점수순(시간 간격 우선, 안 되면 무시)
    for (const strict of [true, false]) {
      while (rest() > 0) { const pool = g.photos.filter((i) => !picked.includes(i) && (!strict || minGap(i))); if (!pool.length) break; picked.push(pool.reduce(better)); }
    }
  }
  // 3) 대표(첫 장): 가로형 + 점수 최고. 나머지는 시간순
  const heroScore = (i: number) => sc(i) + (photos[i].aspect != null && photos[i].aspect! >= 1.2 ? 0.3 : 0);
  const hero = picked.reduce((a, b) => (heroScore(a) > heroScore(b) || (heroScore(a) === heroScore(b) && photos[a].ts! < photos[b].ts!) ? a : b));
  const ordered = [hero, ...picked.filter((i) => i !== hero).sort((a, b) => photos[a].ts! - photos[b].ts!)];
  // 4) 자막: 날짜 칩은 모두, 행사명·D+n 은 행사당 1장(행사 대표, 없으면 그 행사에 든 첫 장)
  const captioned = new Set<number>(); const capFor = new Map<number, number>();
  for (const i of ordered) { const n = near[i]; if (!n) continue; if (evPick.has(n.ev)) { if (evPick.get(n.ev) === i) capFor.set(i, n.ev); } else if (!captioned.has(n.ev)) { captioned.add(n.ev); capFor.set(i, n.ev); } }
  return ordered.map((i, k) => {
    const ts = photos[i].ts!, day = dayOf[i]!, ev = capFor.get(i), chip = fmtDay(day);
    return { index: i, ts, chip, title: ev != null ? events[ev].label : '', sub: ev != null ? `D+${comma(day - start + 1)}` : '', event: ev != null ? events[ev].label : undefined, hero: k === 0 };
  });
}
