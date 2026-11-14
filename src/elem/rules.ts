import type { Op } from './ops.ts';
import { THEMES } from './types.ts';

/** AI가 없어도 동작하는 규칙 기반 해석기: 목적 문장 → 영상 구성, 수정 주문 → 작업(Op). 자주 쓰는 표현만 이해하고 나머지는 "이해하지 못했어요"로 돌려준다 */

export type Brief = { kind: string; tone: 'warm' | 'lively' | 'calm'; targetSec: number; aspect: '16:9' | '9:16'; school: string; klass: string; theme: string };

const Q = /[“"'‘]([^”"'’]+)[”"'’]/;
const num = (s?: string) => (s ? Number(s) : NaN);

export function parseGoal(goal: string): Brief {
  const g = goal.replace(/\s+/g, ' ');
  const kind = /체험|소풍|견학|수학여행|나들이|캠프/.test(g) ? 'field' : /운동회|체육대회|달리기|줄다리기/.test(g) ? 'sports' : /학예회|발표회|공연|합창|재롱|연극/.test(g) ? 'talent' : /공개수업|참관|수업 공개/.test(g) ? 'open' : /추억|한 해|1년|학년 말|종업식|졸업/.test(g) ? 'year' : /학급|우리 반|생일|파티|행사/.test(g) ? 'class' : 'other';
  const tone = /발랄|밝|신나|활기|경쾌/.test(g) ? 'lively' : /차분|담백|단정|잔잔|조용/.test(g) ? 'calm' : 'warm';
  const m1 = g.match(/(\d+)\s*분\s*(\d+)\s*초/), m2 = g.match(/(\d+)\s*초/), m3 = g.match(/(\d+)\s*분/);
  const targetSec = m1 ? num(m1[1]) * 60 + num(m1[2]) : m2 ? num(m2[1]) : m3 ? num(m3[1]) * 60 : /짧게|간단|하이라이트|요약/.test(g) ? 40 : 60;
  const aspect = /세로|릴스|쇼츠|9:16|모바일|스마트폰/.test(g) ? '9:16' : '16:9';
  const school = (g.match(/([가-힣]{2,8}초등학교)/) ?? [])[1] ?? '', k = g.match(/([1-6])\s*학년\s*(\d{1,2})\s*반/);
  const month = Number((g.match(/(\d{1,2})\s*월/) ?? [])[1]) || 0;
  const theme = kind === 'sports' ? 'sunny' : kind === 'talent' ? 'berry' : kind === 'open' ? 'sky' : month >= 3 && month <= 5 ? 'mint' : month >= 6 && month <= 8 ? 'sky' : month >= 9 && month <= 11 ? 'autumn' : 'sunny';
  return { kind, tone, targetSec: Math.max(20, Math.min(180, targetSec)), aspect, school, klass: k ? `${k[1]}학년 ${k[2]}반` : '', theme };
}

type Sum = { title: string; seconds: number; theme: string; chapters: { index: number; title: string }[] };
const THEME_WORDS: [RegExp, string][] = [[/초록|민트|새싹|연두|봄/, 'mint'], [/파랑|파란|하늘|시원|여름|바다/, 'sky'], [/분홍|핑크|딸기|보라|사랑스/, 'berry'], [/주황|단풍|가을|갈색|따뜻한 색/, 'autumn'], [/노랑|노란|해님|밝은 색|기본 색/, 'sunny']];
const ORD: Record<string, number> = { 첫: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8 };
const ordIn = (s: string) => { const a = s.match(/(\d+)\s*번째/); if (a) return Number(a[1]); const b = s.match(/(첫|두|세|네|다섯|여섯|일곱|여덟)\s*(?:번째)/); return b ? ORD[b[1]] : 0; };
const STOP = new Set(['활동', '부분', '사진', '장면', '챕터', '시간']);
/** 문장이 가리키는 활동 찾기: 번호("2번째") → 제목 전체 → 제목과 겹치는 두 글자 조각이 가장 많은 활동 */
const findCh = (s: string, sum: Sum) => {
  const o = ordIn(s); if (o) return o - 1;
  if (/마지막/.test(s) && /활동|챕터/.test(s)) return sum.chapters.length - 1;
  const m = sum.chapters.find((c) => c.title.length >= 2 && s.includes(c.title)); if (m) return m.index;
  let best = -1, score = 0;
  for (const c of sum.chapters) { const t = c.title.replace(/[\s!?.,]/g, ''); let n = 0; for (let i = 0; i < t.length - 1; i++) { const bi = t.slice(i, i + 2); if (!STOP.has(bi) && s.includes(bi)) n++; } if (n > score) { score = n; best = c.index; } }
  return best;
};

export function parseEdit(text: string, sum: Sum): { ops: Op[]; unmatched: string[] } {
  const ops: Op[] = [], unmatched: string[] = [];
  const parts = text.split(/(?<=[.!?])\s+|\n|\s+그리고\s+|\s+그다음\s+|\s*(?:,|，)\s+(?=\d+\s*번째|제목|마지막|세로|가로|더|색)/).map((x) => x.trim()).filter(Boolean);
  for (const raw of parts) {
    const s = raw.replace(/[.!]+$/, ''), before = ops.length, quote = (s.match(Q) ?? [])[1];
    // 화면 비율
    if (/세로/.test(s) && !/사진/.test(s)) ops.push({ op: 'setAspect', aspect: '9:16' }); else if (/가로/.test(s) && !/사진/.test(s)) ops.push({ op: 'setAspect', aspect: '16:9' });
    // 제목
    const t1 = s.match(/제목(?:을|은|를)?\s*[:：]\s*(.+)$/) ?? s.match(/제목(?:을|은|를)?\s*[“"'‘]?(.+?)[”"'’]?\s*(?:으로|로)\s*(?:바꿔|바꾸|변경|수정|해|고쳐|고치)/);
    if (t1 && !/\d+\s*번째|활동/.test(s.split('제목')[0] ?? '')) ops.push({ op: 'setTitle', text: t1[1].replace(/\\n/g, '\n').trim() });
    // 활동 이름 바꾸기: "2번째 활동 이름을 'X'로" / "'A'를 'B'로 바꿔"
    else if (/(바꿔|바꾸|변경|수정|고쳐|고치)/.test(s) && /(활동|챕터|이름|제목)/.test(s) && ordIn(s)) { const nm = quote ?? (s.match(/(?:이름|제목)(?:을|은|를)?\s*(.+?)\s*(?:으로|로)\s*(?:바꿔|바꾸|변경|수정|고쳐|고치)/) ?? [])[1]; if (nm) ops.push({ op: 'setChapter', index: ordIn(s) - 1, title: nm.trim() }); }
    else { const sw = s.match(/[“"'‘]([^”"'’]+)[”"'’]\s*(?:을|를|은|는)?\s*[“"'‘]([^”"'’]+)[”"'’]\s*(?:으로|로)\s*(?:바꿔|바꾸|변경|수정|고쳐|고치)/); if (sw) { const ci = sum.chapters.find((c) => c.title.includes(sw[1]) || sw[1].includes(c.title)); if (ci) ops.push({ op: 'setChapter', index: ci.index, title: sw[2] }); else if (sum.title.includes(sw[1])) ops.push({ op: 'setTitle', text: sw[2] }); } }
    // 마무리 문구
    if (/마무리|엔딩|끝/.test(s) && quote && /(문구|인사|멘트|메시지|말)/.test(s)) ops.push({ op: 'setOutro', message: quote });
    // 한마디
    if (/한마디|인용/.test(s)) { if (/(빼|삭제|없애|지워)/.test(s)) sum.chapters.forEach((c) => ops.push({ op: 'removeQuote', chapter: c.index })); else if (quote) { const ci = findCh(s, sum); ops.push({ op: 'setQuote', chapter: ci >= 0 ? ci : sum.chapters.length - 1, text: quote, name: (s.match(/([가-힣]{2,4})(?:이|가)\s*(?:한|쓴)?/) ?? [])[1] ?? '' }); } }
    // 활동 삭제 / 합치기 / 이동
    if (/(빼|삭제|지워|없애)/.test(s) && !/사진|한마디|숫자|기록/.test(s)) { const ci = findCh(s, sum); if (ci >= 0) ops.push({ op: 'removeChapter', index: ci }); }
    if (/(합쳐|합치)/.test(s)) { const ci = findCh(s, sum); if (ci > 0) ops.push({ op: 'mergeChapters', index: ci }); }
    if (/(옮겨|이동|순서)/.test(s)) { const nums = [...s.matchAll(/(\d+)\s*번째/g)].map((m) => Number(m[1]) - 1); if (nums.length >= 2) ops.push({ op: 'moveChapter', from: nums[0], to: nums[1] }); else if (nums.length === 1 && /맨 앞/.test(s)) ops.push({ op: 'moveChapter', from: nums[0], to: 0 }); else if (nums.length === 1 && /맨 뒤|마지막으로/.test(s)) ops.push({ op: 'moveChapter', from: nums[0], to: sum.chapters.length - 1 }); }
    // 사진 정리
    if (/사진|컷/.test(s) && /(빼|삭제|지워|정리|줄여)/.test(s)) {
      if (/흔들|흐린|어두|비슷|중복|겹치/.test(s)) sum.chapters.forEach((c) => ops.push({ op: 'removePhotos', chapter: c.index, which: /비슷|중복|겹치/.test(s) ? 'duplicates' : 'blurry' }));
      else { const ci = findCh(s, sum), pn = (s.match(/(\d+)\s*번째\s*사진/) ?? [])[1]; if (ci >= 0 && /마지막\s*사진/.test(s)) ops.push({ op: 'removePhotos', chapter: ci, which: 'last' }); else if (ci >= 0 && pn) ops.push({ op: 'removePhotos', chapter: ci, which: [Number(pn) - 1] }); else if (ci >= 0 && /첫\s*사진|첫 번째 사진/.test(s)) ops.push({ op: 'removePhotos', chapter: ci, which: 'first' }); }
    }
    if (/(사진).*(자막|설명)/.test(s) && quote) { const ci = findCh(s, sum), pn = Number((s.match(/(\d+)\s*번째\s*사진/) ?? [])[1]); if (ci >= 0 && pn) ops.push({ op: 'setCaption', chapter: ci, photo: pn - 1, text: quote }); }
    // 길이·속도
    const sec = (() => { const a = s.match(/(\d+)\s*분\s*(\d+)\s*초/), b = s.match(/(\d+)\s*초/), c = s.match(/(\d+)\s*분/); return a ? num(a[1]) * 60 + num(a[2]) : b ? num(b[1]) : c ? num(c[1]) * 60 : NaN; })();
    if (Number.isFinite(sec) && /(길이|맞춰|로 해|내외|정도|줄여|늘려|짧게|길게|이내)/.test(s) && !/번째|사진 \d/.test(s)) ops.push({ op: 'setLength', seconds: sec });
    else if (/(더\s*)?(짧게|줄여|간단|요약)/.test(s) && !/사진|제목|한마디|문구/.test(s)) ops.push({ op: 'setLength', seconds: Math.round(sum.seconds * 0.75) });
    else if (/(더\s*)?(길게|늘려)/.test(s) && !/사진|제목|한마디|문구/.test(s)) ops.push({ op: 'setLength', seconds: Math.round(sum.seconds * 1.3) });
    if (/빠르게|경쾌|템포|속도.*(올|높)/.test(s) && !/길이/.test(s)) ops.push({ op: 'setPace', pace: 'faster' }); else if (/천천히|느리게|여유|속도.*(낮|줄)/.test(s)) ops.push({ op: 'setPace', pace: 'slower' });
    // 색
    if (/색|컬러|분위기|테마|밝게|차분|화사/.test(s) && !/사진/.test(s)) { const w = THEME_WORDS.find(([re]) => re.test(s)); if (w) ops.push({ op: 'setTheme', theme: w[1] }); else if (/밝게|화사/.test(s)) ops.push({ op: 'setTheme', theme: 'sunny' }); else if (/차분/.test(s)) ops.push({ op: 'setTheme', theme: 'sky' }); else if (/(바꿔|다른)/.test(s)) { const names = Object.keys(THEMES), i = names.indexOf(sum.theme); ops.push({ op: 'setTheme', theme: names[(i + 1) % names.length] }); } }
    // 숫자 장면
    if (/(숫자|기록)\s*(장면|화면)?/.test(s) && /(빼|없애|삭제|지워)/.test(s) && !/사진/.test(s)) ops.push({ op: 'setStats', show: false }); else if (/(숫자|기록)\s*(장면|화면)/.test(s) && /(넣|추가|보여)/.test(s)) ops.push({ op: 'setStats', show: true });
    // 정보
    const sch = s.match(/([가-힣]{2,8}초등학교)/); if (sch && /(학교)/.test(s) && /(바꿔|수정|로 해|입니다|이야)/.test(s)) ops.push({ op: 'setInfo', school: sch[1] });
    const kl = s.match(/([1-6])\s*학년\s*(\d{1,2})\s*반/); if (kl && /(바꿔|수정|로 해|입니다)/.test(s)) ops.push({ op: 'setInfo', klass: `${kl[1]}학년 ${kl[2]}반` });
    const pl = s.match(/장소(?:를|는|은)?\s*[“"'‘]?(.+?)[”"'’]?\s*(?:으로|로)\s*(?:바꿔|수정|해|고쳐)/); if (pl) ops.push({ op: 'setInfo', place: pl[1].trim() });
    if (ops.length === before) unmatched.push(s);
  }
  return { ops, unmatched };
}
