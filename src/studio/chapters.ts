/** 챕터 추가·복제·삭제·이동. 번호 표시("공정 02 / 03")와 막대형 레일 라벨을 함께 맞춘다 */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** card.index의 "i / n" 부분을 현재 순서와 개수로 다시 쓴다 */
export function renumber(chapters: any[]): any[] {
  const n = chapters.length;
  return chapters.map((c, i) => {
    const idx: string = c.card?.index ?? ''; const m = idx.match(/(\d+)(\s*\/\s*)(\d+)/); if (!m) return c;
    const next = idx.replace(m[0], pad(i + 1, m[1].length) + m[2] + pad(n, m[3].length));
    return next === idx ? c : { ...c, card: { ...c.card, index: next } };
  });
}
const linked = (chapters: any[]) => chapters.length > 0 && chapters.every((c) => c.card?.rail?.type === 'segments' && c.card.rail.labels.length === chapters.length);
/** 막대형 레일의 라벨이 챕터와 1:1이면, 라벨 목록을 같이 바꾸고 현재 위치를 맞춘다 */
function withLabels(chapters: any[], before: any[], edit: (labels: string[]) => string[]): any[] {
  if (!linked(before)) return chapters;
  const labels = edit([...before[0].card.rail.labels]);
  return chapters.map((c, i) => ({ ...c, card: { ...c.card, rail: { ...c.card.rail, labels, active: Math.min(i, labels.length - 1) } } }));
}
const shiftRail = (rail: any) => (rail?.type === 'segments' || rail?.type === 'progress' ? { ...rail, active: Math.min(rail.active + 1, (rail.labels ?? rail.marks ?? []).length - 1) } : rail);

/** 새 챕터: 마지막 챕터 모양을 바탕으로 문구를 비우고 사진 몇 장만 가져온다 */
export function blankChapter(base: any): any {
  const { beat, beatPhotos, ...c } = clone(base);
  return { ...c, card: { ...c.card, big: '새 챕터', small: '설명을 적어 주세요', meta: c.card.meta.map((m: any) => ({ ...m, v: '-' })), rail: shiftRail(c.card.rail) },
    photos: c.photos.slice(0, 3).map((p: any) => ({ ...p, cap: { chip: '', title: '', sub: '' } })) };
}

export function addChapter(chapters: any[]): any[] {
  const nc = blankChapter(chapters[chapters.length - 1]), out = [...chapters, nc];
  return renumber(withLabels(out, chapters, (l) => [...l, nc.card.big]));
}
export function dupChapter(chapters: any[], i: number): any[] {
  const out = [...chapters.slice(0, i + 1), clone(chapters[i]), ...chapters.slice(i + 1)];
  return renumber(withLabels(out, chapters, (l) => [...l.slice(0, i + 1), l[i], ...l.slice(i + 1)]));
}
export function delChapter(chapters: any[], i: number): any[] {
  if (chapters.length <= 1) return chapters;
  return renumber(withLabels(chapters.filter((_, j) => j !== i), chapters, (l) => l.filter((_, j) => j !== i)));
}
export function moveChapter(chapters: any[], i: number, d: number): any[] {
  const j = i + d; if (j < 0 || j >= chapters.length) return chapters;
  const out = [...chapters]; [out[i], out[j]] = [out[j], out[i]];
  return renumber(withLabels(out, chapters, (l) => { const m = [...l]; [m[i], m[j]] = [m[j], m[i]]; return m; }));
}
