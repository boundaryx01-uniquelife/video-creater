// 초등 영상 수정 주문(규칙 해석기)·작업 적용·자동 정리 검증. 사용: node --experimental-strip-types --no-warnings scripts/test-elem-edit.ts
import { parseGoal, parseEdit } from '../src/elem/rules.ts';
import { applyOps, stateSummary } from '../src/elem/ops.ts';
import { curate, hamming, secondsOf } from '../src/elem/curate.ts';
import { elemSample } from '../src/elem/sample.ts';
import { planElem, type ElemProps } from '../src/elem/types.ts';

let pass = 0, fail = 0; const ok = (n: string, c: boolean, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); };
const base = (): ElemProps => elemSample();
const run = (text: string, p = base()) => { const sum = stateSummary(p, '16:9'); const r = parseEdit(text, sum as any); return { ...r, res: applyOps(p, r.ops), p }; };

// 목적 문장
let b = parseGoal('새싹초등학교 3학년 2반 5월 박물관 현장체험학습 영상, 학부모 공유용, 밝고 발랄하게 1분 내외');
ok('목적: 체험학습·발랄·60초·가로·학교·학급·봄 색', b.kind === 'field' && b.tone === 'lively' && b.targetSec === 60 && b.aspect === '16:9' && b.school === '새싹초등학교' && b.klass === '3학년 2반' && b.theme === 'mint', JSON.stringify(b));
b = parseGoal('운동회 영상 세로로 40초'); ok('목적: 운동회·세로·40초', b.kind === 'sports' && b.aspect === '9:16' && b.targetSec === 40, JSON.stringify(b));
b = parseGoal('학예회 합창 영상'); ok('목적: 학예회·딸기색', b.kind === 'talent' && b.theme === 'berry');
b = parseGoal('그냥 만들어 줘'); ok('목적: 단서 없으면 기본값(60초·따뜻·가로)', b.kind === 'other' && b.targetSec === 60 && b.tone === 'warm' && b.aspect === '16:9');

// 수정 주문
let r = run('제목을 "우리들의 박물관 나들이"로 바꿔줘'); ok('제목 바꾸기', r.res.props.title === '우리들의 박물관 나들이', r.res.props.title);
r = run('제목: 즐거운 소풍'); ok('제목: 콜론 형식', r.res.props.title === '즐거운 소풍');
r = run('2번째 활동 이름을 "맛있는 도시락"으로 바꿔줘'); ok('N번째 활동 이름', r.res.props.chapters[1].title === '맛있는 도시락', r.res.props.chapters[1].title);
r = run('"냠냠 점심시간"을 "도시락 시간"으로 바꿔줘'); ok('이름으로 활동 찾아 바꾸기', r.res.props.chapters[1].title === '도시락 시간', r.res.props.chapters[1].title);
r = run('점심 부분 빼줘'); ok('이름 일부로 활동 삭제', r.res.props.chapters.length === 2 && !r.res.props.chapters.some((c) => /점심/.test(c.title)), String(r.res.props.chapters.length));
r = run('3번째 활동 삭제해줘'); ok('N번째 활동 삭제', r.res.props.chapters.length === 2 && r.res.props.chapters[1].title === '냠냠 점심시간');
r = run('더 짧게 해줘'); ok('더 짧게 → 길이 감소', secondsOf(r.res.props) < secondsOf(base()) * 0.9, `${Math.round(secondsOf(base()))}→${Math.round(secondsOf(r.res.props))}`);
r = run('40초로 줄여줘'); ok('40초 맞추기(±10%)', Math.abs(secondsOf(r.res.props) - 40) <= 5, String(Math.round(secondsOf(r.res.props))));
r = run('좀 더 길게'); ok('더 길게 → 길이 증가(또는 불가 안내)', secondsOf(r.res.props) >= secondsOf(base()) - 0.5);
r = run('세로 영상으로 바꿔줘'); ok('세로', r.res.aspect === '9:16');
r = run('가로로 해줘'); ok('가로', r.res.aspect === '16:9');
r = run('색을 파란색으로 바꿔줘'); ok('색 → sky', r.res.props.theme === 'sky');
r = run('좀 더 차분하게'); ok('차분하게 → sky', r.res.props.theme === 'sky');
r = run('색 다른 걸로 바꿔줘'); ok('색 다음 테마로', r.res.props.theme && r.res.props.theme !== 'sunny', String(r.res.props.theme));
r = run('빠르게 해줘'); ok('빠르게 → pace<1', (r.res.props.pace ?? 1) < 1);
r = run('천천히 보여줘'); ok('천천히 → pace>1', (r.res.props.pace ?? 1) > 1);
r = run('마무리 문구를 "모두 고마워요"로 바꿔줘'); ok('마무리 문구', r.res.props.outro.message === '모두 고마워요', r.res.props.outro.message);
r = run('1번째 활동 한마디를 "금관이 반짝였어요"로 넣어줘'); ok('한마디 넣기(교사 입력)', r.res.props.chapters[0].quote?.text === '금관이 반짝였어요', JSON.stringify(r.res.props.chapters[0].quote));
r = run('한마디 장면은 다 빼줘'); ok('한마디 모두 빼기', r.res.props.chapters.every((c) => !c.quote));
r = run('숫자 장면 빼줘'); ok('숫자 장면 빼기', (r.res.props.stats ?? []).length === 0);
r = run('1번째 활동의 마지막 사진 빼줘'); ok('마지막 사진 빼기', r.res.props.chapters[0].photos.length === base().chapters[0].photos.length - 1);
r = run('2번째 활동 1번째 사진 빼줘'); ok('N번째 사진 빼기', r.res.props.chapters[1].photos.length === base().chapters[1].photos.length - 1, JSON.stringify(r.ops));
r = run('1번째 활동 2번째 사진 자막을 "두근두근"으로'); ok('사진 자막', r.res.props.chapters[0].photos[1].cap?.title === '두근두근', JSON.stringify(r.ops));
r = run('3번째 활동을 맨 앞으로 옮겨줘'); ok('활동 순서 이동', r.res.props.chapters[0].title === base().chapters[2].title);
r = run('2번째 활동을 앞 활동이랑 합쳐줘'); ok('활동 합치기', r.res.props.chapters.length === 2 && r.res.props.chapters[0].photos.length === base().chapters[0].photos.length + base().chapters[1].photos.length);
r = run('제목을 "A"로 바꾸고. 세로로 해줘. 40초로 맞춰줘'); ok('여러 주문 한 번에', r.res.props.title === 'A' && r.res.aspect === '9:16' && Math.abs(secondsOf(r.res.props) - 40) <= 5, `${r.res.props.title} ${r.res.aspect} ${Math.round(secondsOf(r.res.props))}`);
r = run('오늘 날씨가 좋네요'); ok('이해 못 하는 문장은 그대로 알림(변경 없음)', r.ops.length === 0 && r.unmatched.length === 1 && JSON.stringify(r.res.props) === JSON.stringify(base()));
r = run('5번째 활동 삭제'); ok('없는 활동 번호는 건너뜀', r.res.props.chapters.length === 3 && r.res.skipped.length === 1, r.res.skipped.join('|'));
{ const p = base(); p.chapters = [p.chapters[0]]; const x = applyOps(p, [{ op: 'removeChapter', index: 0 }]); ok('마지막 활동은 지울 수 없음', x.props.chapters.length === 1 && x.skipped.length === 1); }
{ const x = applyOps(base(), [{ op: 'removePhotos', chapter: 0, which: [0, 1, 2, 3, 4, 5, 6, 7] }]); ok('사진을 모두 빼는 주문은 거절', x.props.chapters[0].photos.length === 7); }
{ const x = applyOps(base(), [{ op: 'setTheme', theme: 'evil' } as any, { op: 'hack', x: 1 } as any, { op: 'setPace', pace: 99 }]); ok('알 수 없는 테마·작업 무시, 속도는 범위 제한', x.props.theme === undefined && (x.props.pace ?? 1) <= 1.5 && x.skipped.length === 2, x.skipped.join('|')); }
{ const x = applyOps(base(), [{ op: 'setTitle', text: 'x'.repeat(200) + '\n' + 'y'.repeat(200) + '\nz' }]); ok('제목 길이·줄 수 제한', x.props.title.split('\n').length === 2 && x.props.title.split('\n').every((l) => [...l].length <= 16)); }

// 자동 정리
{ const p = base(); const dupHash = 'ffff0000ffff0000';
  p.chapters = p.chapters.map((c, ci) => ({ ...c, photos: c.photos.map((ph, i) => ({ ...ph, h: i % 3 === 1 ? dupHash : (ci * 7 + i).toString(16).padStart(16, 'a'), q: i === 4 ? 0.05 : 0.6 })) }));
  const n0 = p.chapters.reduce((a, c) => a + c.photos.length, 0), c = curate(p, 45), n1 = c.props.chapters.reduce((a, x) => a + x.photos.length, 0);
  ok('자동 정리: 비슷한 사진·흐린 사진 정리', c.log.dup + c.log.blur > 0 && n1 < n0, JSON.stringify(c.log));
  ok('자동 정리: 목표 45초에 근접(±15%)', Math.abs(c.log.seconds - 45) <= 7, String(c.log.seconds));
  ok('자동 정리: 모든 활동에 사진이 남음', c.props.chapters.every((x) => x.photos.length >= 2)); }
ok('hamming', hamming('0000000000000000', 'ffffffffffffffff') === 64 && hamming('00ff', '00ff') === 0 && hamming('00ff', '00fe') === 1);
{ const p = base(), pl = planElem({ ...p, pace: 0.7 }), pl2 = planElem(p); ok('pace가 길이에 반영', pl.total < pl2.total); }
console.log(`\n통과 ${pass} / 실패 ${fail}`); process.exit(fail ? 1 : 0);
