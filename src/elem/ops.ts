import type { PhotoSpec } from '../analysis/videoData.ts';
import { THEMES, clampPace, type ElemProps } from './types.ts';
import { dedupeAndCull, fitLength, secondsOf } from './curate.ts';

/**
 * 자연어 수정 주문이 최종적으로 바뀌는 "안전한 작업" 목록. AI든 규칙이든 이 목록의 작업으로만 영상을 바꾼다(임의 JSON 수정 불가).
 * 인덱스는 0부터(화면에 보이는 "2번째 활동"은 index 1).
 */
export type Op =
  | { op: 'setTitle'; text: string } | { op: 'setKicker'; text: string }
  | { op: 'setOutro'; title?: string; message?: string }
  | { op: 'setInfo'; school?: string; klass?: string; day?: string; place?: string }
  | { op: 'setChapter'; index: number; title?: string; sub?: string }
  | { op: 'removeChapter'; index: number } | { op: 'moveChapter'; from: number; to: number } | { op: 'mergeChapters'; index: number }
  | { op: 'removePhotos'; chapter: number; which: 'blurry' | 'duplicates' | 'last' | 'first' | number[] }
  | { op: 'setCaption'; chapter: number; photo: number; text: string }
  | { op: 'setQuote'; chapter: number; text: string; name: string } | { op: 'removeQuote'; chapter: number }
  | { op: 'setLength'; seconds: number } | { op: 'setPace'; pace: number | 'faster' | 'slower' }
  | { op: 'setTheme'; theme: string }
  | { op: 'setStats'; show: boolean }
  | { op: 'setAspect'; aspect: '16:9' | '9:16' };

export type ApplyResult = { props: ElemProps; aspect?: '16:9' | '9:16'; done: string[]; skipped: string[] };

const str = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const ok = (i: unknown, len: number) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < len;
const withCap = (list: PhotoSpec[], i: number, text: string) => list.map((p, k) => (k === i ? { ...p, cap: { chip: p.cap?.chip ?? '', sub: p.cap?.sub ?? '', title: text } } : p));

export function applyOps(start: ElemProps, ops: Op[]): ApplyResult {
  let p = start, aspect: ApplyResult['aspect']; const done: string[] = [], skipped: string[] = [];
  const n = () => p.chapters.length, label = (i: number) => `${i + 1}번째 활동`;
  for (const o of ops) {
    try {
      switch (o.op) {
        case 'setTitle': { const t = String(o.text ?? '').split('\n').slice(0, 2).map((x) => str(x, 16)).filter(Boolean).join('\n'); if (!t) { skipped.push('제목이 비어 있어요'); break; } p = { ...p, title: t }; done.push(`제목을 “${t.replace('\n', ' ')}”로 바꿨어요`); break; }
        case 'setKicker': { const t = str(o.text, 14); if (!t) { skipped.push('상단 문구가 비어 있어요'); break; } p = { ...p, kicker: t }; done.push(`상단 문구를 “${t}”로 바꿨어요`); break; }
        case 'setOutro': { const out = { ...p.outro }; if (o.title) out.title = String(o.title).split('\n').slice(0, 2).map((x) => str(x, 12)).filter(Boolean).join('\n'); if (o.message) out.message = String(o.message).split('\n').slice(0, 3).map((x) => str(x, 40)).filter(Boolean).join('\n'); p = { ...p, outro: out }; done.push('마무리 문구를 바꿨어요'); break; }
        case 'setInfo': { const k = { ...p }; (['school', 'klass', 'day', 'place'] as const).forEach((f) => { if (o[f] !== undefined) k[f] = str(o[f], 40); }); p = k; done.push('학교·학급 정보를 바꿨어요'); break; }
        case 'setChapter': { if (!ok(o.index, n())) { skipped.push(`${(o.index as number) + 1}번째 활동이 없어요`); break; } p = { ...p, chapters: p.chapters.map((c, i) => (i === o.index ? { ...c, ...(o.title !== undefined ? { title: str(o.title, 16) || c.title } : {}), ...(o.sub !== undefined ? { sub: str(o.sub, 24) } : {}) } : c)) }; done.push(`${label(o.index)} ${o.title !== undefined ? `이름을 “${str(o.title, 16)}”로` : '부제를'} 바꿨어요`); break; }
        case 'removeChapter': { if (!ok(o.index, n())) { skipped.push(`${(o.index as number) + 1}번째 활동이 없어요`); break; } if (n() <= 1) { skipped.push('활동은 최소 1개가 있어야 해요'); break; } const t = p.chapters[o.index].title; p = { ...p, chapters: p.chapters.filter((_, i) => i !== o.index) }; done.push(`“${t}” 활동을 뺐어요`); break; }
        case 'moveChapter': { if (!ok(o.from, n()) || !ok(o.to, n())) { skipped.push('옮길 활동 번호가 맞지 않아요'); break; } const a = [...p.chapters], [m] = a.splice(o.from, 1); a.splice(o.to, 0, m); p = { ...p, chapters: a }; done.push(`“${m.title}” 활동을 ${o.to + 1}번째로 옮겼어요`); break; }
        case 'mergeChapters': { if (!ok(o.index, n()) || o.index === 0) { skipped.push('합칠 수 있는 활동이 아니에요(앞 활동과 합쳐요)'); break; } const a = p.chapters, m = { ...a[o.index - 1], photos: [...a[o.index - 1].photos, ...a[o.index].photos] }; p = { ...p, chapters: [...a.slice(0, o.index - 1), m, ...a.slice(o.index + 1)] }; done.push(`${label(o.index)}을 앞 활동에 합쳤어요`); break; }
        case 'removePhotos': {
          if (!ok(o.chapter, n())) { skipped.push(`${(o.chapter as number) + 1}번째 활동이 없어요`); break; }
          const c = p.chapters[o.chapter]; let keep = c.photos; const w = o.which;
          if (w === 'blurry' || w === 'duplicates') { const r = dedupeAndCull([c]); keep = (w === 'duplicates' ? dedupeAndCull([c]).chapters[0].photos : r.chapters[0].photos); }
          else if (w === 'last') keep = c.photos.slice(0, -1); else if (w === 'first') keep = c.photos.slice(1);
          else if (Array.isArray(w)) keep = c.photos.filter((_, i) => !w.includes(i));
          if (keep.length < 1) { skipped.push('사진을 모두 빼면 활동이 비어서 그대로 뒀어요'); break; }
          const removed = c.photos.length - keep.length; if (!removed) { skipped.push(`${label(o.chapter)}에서 뺄 사진을 찾지 못했어요`); break; }
          p = { ...p, chapters: p.chapters.map((x, i) => (i === o.chapter ? { ...x, photos: keep } : x)) }; done.push(`${label(o.chapter)}에서 사진 ${removed}장을 뺐어요`); break;
        }
        case 'setCaption': { if (!ok(o.chapter, n()) || !ok(o.photo, p.chapters[o.chapter].photos.length)) { skipped.push('자막을 넣을 사진을 찾지 못했어요'); break; } p = { ...p, chapters: p.chapters.map((c, i) => (i === o.chapter ? { ...c, photos: withCap(c.photos, o.photo, str(o.text, 24)) } : c)) }; done.push(`${label(o.chapter)} ${o.photo + 1}번째 사진에 자막을 넣었어요`); break; }
        case 'setQuote': { if (!ok(o.chapter, n())) { skipped.push('한마디를 넣을 활동을 찾지 못했어요'); break; } const t = String(o.text ?? '').trim().slice(0, 60); if (!t) { skipped.push('한마디 내용이 비어 있어요'); break; } p = { ...p, chapters: p.chapters.map((c, i) => (i === o.chapter ? { ...c, quote: { text: t, name: str(o.name, 12) } } : c)) }; done.push(`${label(o.chapter)}에 한마디를 넣었어요`); break; }
        case 'removeQuote': { if (!ok(o.chapter, n())) { skipped.push('활동을 찾지 못했어요'); break; } p = { ...p, chapters: p.chapters.map((c, i) => (i === o.chapter ? { ...c, quote: undefined } : c)) }; done.push(`${label(o.chapter)}의 한마디를 뺐어요`); break; }
        case 'setLength': { const s = Math.max(20, Math.min(180, Number(o.seconds) || 0)); if (!s) { skipped.push('길이를 알 수 없어요'); break; } const before = Math.round(secondsOf(p)), f = fitLength({ ...p, pace: 1 }, s); p = f.props; done.push(`영상 길이를 약 ${before}초에서 ${Math.round(secondsOf(p))}초로 맞췄어요${f.trimmed ? `(사진 ${f.trimmed}장 정리)` : ''}`); break; }
        case 'setPace': { const cur = p.pace ?? 1, v = o.pace === 'faster' ? cur * 0.85 : o.pace === 'slower' ? cur * 1.18 : Number(o.pace); p = { ...p, pace: clampPace(v) }; done.push(`${(p.pace ?? 1) < cur ? '더 빠르게' : '더 천천히'} 바꿨어요(약 ${Math.round(secondsOf(p))}초)`); break; }
        case 'setTheme': { if (!THEMES[o.theme]) { skipped.push(`알 수 없는 색 테마예요(${o.theme})`); break; } p = { ...p, theme: o.theme }; done.push(`색을 “${THEMES[o.theme].label}”로 바꿨어요`); break; }
        case 'setStats': { p = { ...p, stats: o.show ? (p.stats?.length ? p.stats : [{ label: '남긴 사진', n: p.chapters.reduce((a, c) => a + c.photos.length, 0), unit: '장' }, { label: '함께한 활동', n: p.chapters.length, unit: '가지' }]) : [] }; done.push(o.show ? '기록 숫자 장면을 넣었어요' : '기록 숫자 장면을 뺐어요'); break; }
        case 'setAspect': { aspect = o.aspect === '9:16' ? '9:16' : '16:9'; done.push(aspect === '9:16' ? '세로 영상(9:16)으로 바꿨어요' : '가로 영상(16:9)으로 바꿨어요'); break; }
        default: skipped.push(`알 수 없는 작업이에요`);
      }
    } catch { skipped.push('이 작업은 적용하지 못했어요'); }
  }
  return { props: p, aspect, done, skipped };
}

/** AI에 보내는 현재 상태 요약: 글과 숫자뿐(사진 없음) */
export function stateSummary(p: ElemProps, aspect: string) {
  return { title: p.title, kicker: p.kicker, theme: p.theme ?? 'sunny', pace: p.pace ?? 1, seconds: Math.round(secondsOf(p)), aspect, stats: !!p.stats?.length, info: { school: p.school, klass: p.klass, day: p.day, place: p.place }, outro: p.outro,
    chapters: p.chapters.map((c, i) => ({ index: i, title: c.title, sub: c.sub, photos: c.photos.length, quote: !!c.quote })) };
}
