/** 데이터 장면(Beat) 템플릿: 종류별 이름·기본값·필요한 사진, 모드별로 쓸 수 있는 종류 */
import type { PhotoSpec } from '../analysis/videoData.ts';
import type { Beat } from '../modes/config.ts';

export type BeatKind = Exclude<Beat['kind'], 'route'>; // route(이동 경로)는 여행 모드 전용이라 ModeVideo 모드에서는 쓰지 않는다
type Orient = 'L' | 'P';
export type BeatMeta = { label: string; desc: string; photos: Orient[]; modes: string[] | 'all' };

export const BEAT_META: Record<BeatKind, BeatMeta> = {
  lower: { label: '자막 컷', desc: '사진 위에 큰 제목과 설명', photos: ['L'], modes: 'all' },
  spec: { label: '스펙 표', desc: '항목·값 목록(면적, 소재, 결과 등)', photos: ['P'], modes: 'all' },
  stats: { label: '숫자 요약', desc: '큰 숫자 4개가 올라가는 장면', photos: ['P'], modes: 'all' },
  quote: { label: '인용문', desc: '한마디와 이름·직함', photos: ['P'], modes: 'all' },
  schedule: { label: '일정표', desc: '날짜와 내용 목록, 강조 표시', photos: [], modes: 'all' },
  caption: { label: '설명 + 요점', desc: '단계 번호, 인용, 요점 목록', photos: ['L'], modes: 'all' },
  beforeafter: { label: 'Before / After', desc: '두 사진을 가르는 비교', photos: ['L', 'L'], modes: ['site', 'store'] },
  callout: { label: '사진 설명선', desc: '사진 위 지점에 설명선과 컬러 옵션', photos: ['L'], modes: ['product', 'store'] },
  names: { label: '명단 롤링', desc: '이름이 올라가는 명단', photos: [], modes: ['grad'] },
  timeline: { label: '월별 타임라인', desc: '월별 사진 수 막대와 구간', photos: [], modes: ['grad'] },
};
export const kindsFor = (modeId: string): BeatKind[] => (Object.keys(BEAT_META) as BeatKind[]).filter((k) => BEAT_META[k].modes === 'all' || (BEAT_META[k].modes as string[]).includes(modeId));
export const kindLabel = (k: string) => BEAT_META[k as BeatKind]?.label ?? k;

export function defaultBeat(kind: BeatKind): Beat {
  switch (kind) {
    case 'lower': return { kind, chip: '12:00', title: '장면 제목', sub: '짧은 설명' };
    case 'spec': return { kind, title: '항목 이름', en: 'Details', rows: [{ k: '항목 1', v: '값 1' }, { k: '항목 2', v: '값 2' }, { k: '항목 3', v: '값 3' }] };
    case 'stats': return { kind, kicker: 'IN NUMBERS', items: [{ n: 100, l: '항목 1', unit: '개' }, { n: 50, l: '항목 2', unit: '명' }, { n: 12, l: '항목 3', unit: '회' }, { n: 4.5, l: '항목 4', unit: '점', dec: 1 }] };
    case 'quote': return { kind, text: '여기에 한마디를\n적어 주세요.', name: '이름', role: '소속 · 직함' };
    case 'schedule': return { kind, kicker: 'SCHEDULE', title: '일정', rows: [{ d: '01.01', t: '첫 번째 일정', s: '장소 · 시간', hi: true }, { d: '01.15', t: '두 번째 일정' }, { d: '02.01', t: '세 번째 일정' }] };
    case 'caption': return { kind, step: '01', title: '제목', quote: '"핵심 문장을 적어 주세요"', points: ['요점 1', '요점 2', '요점 3'] };
    case 'beforeafter': return { kind, chip: '위치 · 설명', before: 'BEFORE', after: 'AFTER' };
    case 'callout': return { kind, name: '이름', points: [{ x: 0.3, y: 0.35, t: '설명 1', s: '세부' }, { x: 0.6, y: 0.55, t: '설명 2', s: '세부' }, { x: 0.5, y: 0.75, t: '설명 3', s: '세부' }], swatches: [{ c: '#1b1d20', n: 'Black' }, { c: '#d9d9d9', n: 'Silver' }, { c: '#3f6df6', n: 'Blue' }] };
    case 'names': return { kind, kicker: 'THANK YOU', title: '명단', sub: '함께한 사람들', names: Array.from({ length: 24 }, (_, i) => `이름 ${i + 1}`) };
    case 'timeline': return { kind, kicker: 'TIMELINE', title: '기록', unit: '장', counts: [12, 30, 22, 48, 36, 18, 40, 64, 28, 20, 34, 52], bands: [{ label: '전반', from: 0, to: 5 }, { label: '후반', from: 6, to: 11 }], marks: [{ i: 0, label: '시작' }, { i: 11, label: '마무리' }] };
  }
}

const shape = (v: any): string => (Array.isArray(v) ? '[' + (v.length ? shape(v[0]) : '') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().join(',') + '}' : typeof v);
/** 종류를 바꿀 때 같은 이름·같은 모양의 값(제목, 칩 등)은 이어받는다 */
export function convertBeat(old: Beat | undefined, kind: BeatKind): Beat {
  const def: any = defaultBeat(kind); if (!old) return def; const o: any = old, out: any = { ...def };
  for (const k of Object.keys(def)) if (k !== 'kind' && k in o && shape(o[k]) === shape(def[k]) && (typeof def[k] !== 'string' || o[k] !== '')) out[k] = o[k];
  if (kind === 'quote' && o.title && !('text' in o)) out.text = o.title; // 제목 → 인용문 본문
  if (kind === 'lower' && o.kicker && !('chip' in o)) out.chip = o.kicker;
  return out;
}

/** 장면에 필요한 사진을 사진 목록에서 방향에 맞게 고른다(없으면 undefined → 모드 기본 사진) */
export function pickPhotos(kind: BeatKind, pool: PhotoSpec[]): string[] | undefined {
  const need = BEAT_META[kind].photos; if (!need.length || !pool.length) return undefined;
  const used = new Set<number>(), out: string[] = [];
  for (const o of need) {
    let i = pool.findIndex((p, j) => !used.has(j) && (o === 'L' ? p.aspect >= 1.2 : p.aspect < 1));
    if (i < 0) i = pool.findIndex((_, j) => !used.has(j)); if (i < 0) i = 0;
    used.add(i); out.push(pool[i].src);
  }
  return out;
}
