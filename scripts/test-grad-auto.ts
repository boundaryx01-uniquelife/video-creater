// 사용: node --experimental-strip-types scripts/test-grad-auto.ts   (TZ=UTC 등으로 시간대를 바꿔도 같은 결과여야 한다)
import { planGrad, parseYmd, schoolYearOf, schoolYearEndDay, fmtDay, dayNo, type GradPlan, type GradInput } from '../src/modes/schoolYear.ts';
import { composeGrad } from '../src/modes/gradCompose.ts';
import { gradSample } from '../src/modes/samples.ts';

let pass = 0, fail = 0;
const eq = (name: string, got: unknown, want: unknown) => { const a = JSON.stringify(got), b = JSON.stringify(want); if (a === b) { pass++; console.log('  ok  ', name, '=>', a.length > 90 ? a.slice(0, 90) + '…' : a); } else { fail++; console.log('  FAIL', name, '\n     got ', a, '\n     want', b); } };
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime(); // 현지 시각
const ph = (ts: number | null, aspect = 1.5) => ({ ts: ts ?? undefined, aspect });
const ok = (p: ReturnType<typeof planGrad>): GradPlan => { if (!p.ok) throw new Error(p.errors.join()); return p; };
const base = { enroll: '2024-03-04', graduate: '2027-02-12' };

console.log('[1] 경계일: 2월 말일 / 3월 1일');
eq('2025-02-28 → 2024학년도', schoolYearOf({ y: 2025, m: 2, d: 28 }), 2024);
eq('2025-03-01 → 2025학년도', schoolYearOf({ y: 2025, m: 3, d: 1 }), 2025);
{
  const p = ok(planGrad({ ...base, photos: [ph(at(2025, 2, 28, 23)), ph(at(2025, 3, 1, 0)), ph(at(2026, 2, 28, 23)), ph(at(2026, 3, 1, 0)), ph(at(2024, 3, 4, 0)), ph(at(2027, 2, 12, 23))] }));
  eq('학년별 장수', p.grades.map((g) => g.count), [2, 2, 2]);
  eq('1학년 사진 인덱스(2024.03.04, 2025.02.28)', p.grades[0].photos, [0, 4]);
  eq('2학년 사진 인덱스(2025.03.01, 2026.02.28)', p.grades[1].photos, [1, 2]);
  eq('3학년 사진 인덱스(2026.03.01, 2027.02.12)', p.grades[2].photos, [3, 5]);
  eq('1학년 D+ 범위', [p.grades[0].fromD, p.grades[0].toD], [1, 362]); // 2024-03-04 ~ 2025-02-28
  eq('2학년 D+ 범위', [p.grades[1].fromD, p.grades[1].toD], [363, 727]);
  eq('3학년 D+ 범위', [p.grades[2].fromD, p.grades[2].toD], [728, 1076]);
  eq('총 일수(D+1=입학일)', p.totalDays, 1076);
}

console.log('[2] 윤년');
eq('2028-02-29 존재', parseYmd('2028-02-29'), { y: 2028, m: 2, d: 29 });
eq('2027-02-29 없음', parseYmd('2027-02-29'), null);
eq('2027학년도 마지막 날(2028 윤년) = 2028.02.29', fmtDay(schoolYearEndDay(2027)), '2028.02.29');
eq('2024학년도 마지막 날 = 2025.02.28', fmtDay(schoolYearEndDay(2024)), '2025.02.28');
{
  const p = ok(planGrad({ enroll: '2027-03-02', graduate: '2030-02-08', photos: [ph(at(2028, 2, 29, 23)), ph(at(2028, 3, 1, 0)), ph(at(2030, 2, 8, 12))] }));
  eq('윤일(2028-02-29)은 1학년, 3-01은 2학년', p.grades.map((g) => g.count), [1, 1, 1]);
  eq('1학년 끝 D+ = 윤일 포함 365+... (2027-03-02→2028-02-29)', p.grades[0].toD, dayNo({ y: 2028, m: 2, d: 29 }) - dayNo({ y: 2027, m: 3, d: 2 }) + 1);
  eq('1학년 일수 = 365 (평년이면 364)', p.grades[0].toD, 365);
  eq('총 일수(2027-03-02~2030-02-08, 윤일 1일 포함)', p.totalDays, dayNo({ y: 2030, m: 2, d: 8 }) - dayNo({ y: 2027, m: 3, d: 2 }) + 1);
  eq('월 수 = 36', p.counts.length, 36);
}

console.log('[3] 사진 없는 달 / 월별 counts');
{
  const p = ok(planGrad({ ...base, photos: [ph(at(2024, 3, 5)), ph(at(2024, 3, 6)), ph(at(2024, 6, 1)), ph(at(2027, 2, 12))] }));
  eq('길이 36(입학 월~졸업 월)', p.counts.length, 36);
  eq('첫 달=2, 4월·5월=0, 6월=1, 마지막 달=1', [p.counts[0], p.counts[1], p.counts[2], p.counts[3], p.counts[35]], [2, 0, 0, 1, 1]);
  eq('합계 = 범위 내 사진 수', [p.counts.reduce((a, b) => a + b, 0), p.inRange], [4, 4]);
  eq('months 처음/끝', [p.months[0], p.months[35]], ['2024.03', '2027.02']);
  eq('bands', p.bands, [{ label: '1학년 · 2024', from: 0, to: 11 }, { label: '2학년 · 2025', from: 12, to: 23 }, { label: '3학년 · 2026', from: 24, to: 35 }]);
}

console.log('[4] 입학 전 · 졸업 후 · 촬영 시각 없는 사진');
{
  const p = ok(planGrad({ ...base, photos: [ph(at(2024, 3, 3, 23)), ph(at(2024, 3, 4, 0)), ph(at(2027, 2, 12, 23)), ph(at(2027, 2, 13, 0)), ph(null), ph(null), ph(at(2023, 12, 1))] }));
  eq('before', p.other.before, [0, 6]);
  eq('after', p.other.after, [3]);
  eq('noTime', p.other.noTime, [4, 5]);
  eq('범위 내', p.inRange, 2);
  eq('경고 문구 3종', p.warnings.filter((w) => /이전|이후|촬영 시각이 없는/.test(w)).length, 3);
  eq('NaN ts 도 noTime', ok(planGrad({ ...base, photos: [{ ts: NaN }] })).other.noTime, [0]);
}

console.log('[5] 한 학년에만 몰린 사진 (3학년만)');
{
  const photos = Array.from({ length: 30 }, (_, i) => ph(at(2026, 3 + (i % 10), 1 + i % 25, 9 + (i % 8))));
  const p = ok(planGrad({ ...base, photos }));
  eq('학년별 장수', p.grades.map((g) => g.count), [0, 0, 30]);
  eq('picks 길이(빈 학년은 [])', p.picks.map((x) => x.length), [0, 0, 10]);
  eq('빈 학년 경고', p.warnings.some((w) => w.includes('1학년·2학년')), true);
  const c = composeGrad(gradSample(), p, (i) => ({ src: `x${i}.jpg`, aspect: 1.5, time: '', date: '', wd: '', hex: '#888', exif: '', model: '', fy: 0.4, fx: 0.5 }));
  eq('챕터 1개(3학년), 카드 index', [c.chapters.length, c.chapters[0].card.big, c.chapters[0].card.index, c.chapters[0].card.rail.type === 'segments' && c.chapters[0].card.rail.active], [1, '3학년', '03 / 03', 2]);
  eq('3학년 챕터에 기존 beat(인용문) 유지', c.chapters[0].beat?.kind, 'quote');
  let threw = ''; try { composeGrad(gradSample(), ok(planGrad({ ...base, photos: [ph(null)] })), () => null as never); } catch (e) { threw = (e as Error).message; }
  eq('범위 내 0장이면 Error', threw.includes('구성할 수 없습니다'), true);
}

console.log('[6] 행사: D+n · 자막 · 마크 · 대표 사진');
{
  const events = [{ date: '2024-03-04', label: '입학식', kind: 'major' as const }, { date: '2024-07-10', label: '체육대회' }, { date: '2025-04-23', to: '2025-04-25', label: '수학여행' }, { date: '2027-02-12', label: '졸업식', kind: 'major' as const }, { date: '2023-01-01', label: '범위밖행사' }, { date: '2024-13-40', label: '잘못된날짜' }];
  const photos = [ph(at(2024, 3, 4, 9), 0.75), ph(at(2024, 3, 4, 10), 1.5), ph(at(2024, 3, 4, 11), 1.5), ph(at(2024, 7, 11, 10)), ph(at(2025, 4, 24, 10)), ph(at(2025, 4, 24, 10)), ph(at(2027, 2, 12, 10)), ph(at(2024, 9, 9, 10)), ph(at(2025, 9, 9, 10), 0.75)];
  const p = ok(planGrad({ ...base, photos, events, perGrade: 4, graduates: 248 }));
  eq('범위 밖/오류 행사 분리', p.skippedEvents.length, 2);
  eq('입학식 D+1 자막(1학년 picks 중)', p.picks[0].filter((x) => x.event === '입학식').map((x) => [x.chip, x.title, x.sub]), [['2024.03.04', '입학식', 'D+1']]);
  eq('체육대회 창(±1일) 자막 D+n', p.picks[0].find((x) => x.event === '체육대회')?.sub, `D+${dayNo({ y: 2024, m: 7, d: 11 }) - dayNo({ y: 2024, m: 3, d: 4 }) + 1}`);
  eq('수학여행(기간 이벤트) 2학년 자막', p.picks[1].find((x) => x.event === '수학여행')?.chip, '2025.04.24');
  eq('졸업식 D+1,076', p.picks[2].find((x) => x.event === '졸업식')?.sub, 'D+1,076');
  eq('대표(첫 장)는 가로형 + 행사 사진', [p.picks[0][0].hero, photos[p.picks[0][0].index].aspect], [true, 1.5]);
  eq('행사 라벨은 행사당 1장만', p.picks[0].filter((x) => x.title === '입학식').length, 1);
  eq('나머지는 시간순', p.picks[0].slice(1).every((x, i, a) => i === 0 || a[i - 1].ts <= x.ts), true);
  eq('마크 위치/라벨', p.marks.map((m) => `${m.i}:${m.label}`), ['0:입학식', '4:체육대회', '13:수학여행', '35:졸업식']);
  eq('1학년 대표 행사', p.grades[0].events, ['입학식', '체육대회']);
  const c = composeGrad(gradSample(), p, (i) => ({ src: `x${i}.jpg`, aspect: photos[i].aspect!, time: '', date: '', wd: '', hex: '#888', exif: '', model: '', fy: 0.4, fx: 0.5 }));
  const o = c.outro.stats!;
  eq('아웃트로 통계(졸업생 입력 / 일수 / 사진 수)', o.map((s) => `${s.n} ${s.l}`), ['248 졸업생', '1,076 함께한 날', `${p.inRange} 장의 사진`]);
  const tl = c.opening![0].beat; eq('타임라인 합계 = inRange', tl.kind === 'timeline' && tl.counts.reduce((a, b) => a + b, 0), p.inRange);
  eq('카드 meta 사진 수', c.chapters[0].card.meta[0].v, `${p.grades[0].count}장`);
  eq('인트로 칩 갱신', c.intro.chips.map((x) => x.v), ['2024.03.04', '2027.02.12', '248명']);
}

console.log('[7] 마크 충돌 제거 · 오류 입력');
{
  const events = [1, 2, 3, 4].map((k) => ({ date: `2024-0${2 + k}-10`, label: `행사${k}` })); // 3~6월 연속
  const p = ok(planGrad({ ...base, photos: [ph(at(2024, 3, 10)), ph(at(2024, 4, 10)), ph(at(2024, 5, 10)), ph(at(2024, 6, 10))], events }));
  eq('연속 달 라벨 겹침 → 일부만 표시', [p.marks.length < 4, p.marks.length + p.droppedMarks.length], [true, 4]);
  eq('졸업일 < 입학일', planGrad({ enroll: '2027-01-01', graduate: '2026-01-01', photos: [] }).ok, false);
  eq('날짜 형식 오류', planGrad({ enroll: 'abc', graduate: '2027-02-12', photos: [] }).ok, false);
  const long = ok(planGrad({ enroll: '2024-03-04', graduate: '2027-03-20', photos: [ph(at(2027, 3, 10))] }));
  eq('졸업일이 학제 초과 → 2027.02.28 로 제한 + 경고', [fmtDay(long.end), long.other.after, long.warnings.length > 0], ['2027.02.28', [0], true]);
  const feb = ok(planGrad({ enroll: '2024-02-20', graduate: '2027-02-12', photos: [ph(at(2024, 2, 25)), ph(at(2024, 3, 2))] }));
  eq('2월 입학: 2월 사진도 1학년', feb.grades[0].count, 2);
}

console.log('[8] 대표 사진 선정: 점수 없음 → 가로형·행사 우선, 점수 있음 → 점수 우선');
{
  const photos = [ph(at(2024, 5, 1, 9), 0.75), ph(at(2024, 5, 1, 10), 1.5), ph(at(2024, 6, 1, 10), 1.5), ph(at(2024, 7, 1, 10), 0.75)];
  const p = ok(planGrad({ ...base, photos, perGrade: 1 }));
  eq('1장만 → 가로형', photos[p.picks[0][0].index].aspect, 1.5);
  const sc = [{ ts: at(2024, 5, 1), aspect: 1.5, score: 0.2 }, { ts: at(2024, 6, 1), aspect: 0.75, score: 0.9 }];
  eq('점수 높은 세로형이 이김', ok(planGrad({ ...base, photos: sc, perGrade: 1 })).picks[0][0].index, 1);
  const many = Array.from({ length: 500 }, (_, i) => ph(at(2024, 3 + (i % 12), 1 + (i % 27), 8 + (i % 9))));
  const t0 = Date.now(), pm = ok(planGrad({ ...base, photos: many })); eq('500장 처리 시간 < 1000ms', Date.now() - t0 < 1000, true);
  eq('500장 학년 합 = inRange', pm.grades.reduce((a, g) => a + g.count, 0), pm.inRange);
  eq('picks 중복 없음', new Set(pm.picks.flat().map((x) => x.index)).size, pm.picks.flat().length);
}
console.log(`\nTZ=${process.env.TZ ?? '(기본)'}  통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
