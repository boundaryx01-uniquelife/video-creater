/** 챕터 목록(추가·복제·삭제·순서)과 데이터 장면(추가·종류 변경·삭제), 오프닝·마무리 장면 편집 UI */
import React from 'react';
import { Field } from './Editor';
import type { Ctx } from './Editor';
import { BEAT_META, BeatKind, convertBeat, defaultBeat, kindLabel, kindsFor, pickPhotos } from './beats.ts';
import { addChapter, delChapter, dupChapter, moveChapter } from './chapters.ts';
import { labelOf } from './labels.ts';
import type { Path } from './util.ts';

const SKIP = new Set(['beat', 'beatPhotos']);

/** 종류 선택 상자: 현재 모드에서 쓸 수 있는 종류만 보여 준다(현재 종류는 항상 포함) */
const KindSelect: React.FC<{ modeId: string; value: string; onPick: (k: BeatKind) => void; placeholder?: string; label: string }> = ({ modeId, value, onPick, placeholder, label }) => {
  const kinds = kindsFor(modeId); if (value && !kinds.includes(value as BeatKind)) kinds.push(value as BeatKind);
  return (
    <select aria-label={label} value={value} onChange={(e) => e.target.value && onPick(e.target.value as BeatKind)}>
      {placeholder && <option value="">{placeholder}</option>}
      {kinds.map((k) => <option key={k} value={k}>{kindLabel(k)} — {BEAT_META[k]?.desc}</option>)}
    </select>
  );
};

/** 한 장면(beat + 사진)의 종류 선택·삭제·내용 편집. item은 beat/beatPhotos(챕터) 또는 beat/photos(오프닝·마무리)를 가진 객체 */
const SceneBody: React.FC<{ item: any; path: Path; photosKey: 'beatPhotos' | 'photos'; pool: any[]; ctx: Ctx; depth: number; optional?: boolean }> = ({ item, path, photosKey, pool, ctx, depth, optional }) => {
  const modeId = ctx.modeId ?? '', beat = item.beat, put = (b: any, ph: string[] | undefined) => { const n = { ...item, beat: b }; if (ph) n[photosKey] = ph; else delete n[photosKey]; if (!b) delete n.beat; ctx.onChange(path, n); };
  const pick = (k: BeatKind) => put(convertBeat(beat, k), pickPhotos(k, pool) ?? undefined);
  if (!beat) return (
    <div className="sceneslot empty"><KindSelect modeId={modeId} value="" onPick={(k) => put(defaultBeat(k), pickPhotos(k, pool))} placeholder="＋ 데이터 장면 추가…" label="데이터 장면 추가" /></div>);
  return (
    <div className="sceneslot">
      <div className="scenehead"><b>데이터 장면</b>
        <KindSelect modeId={modeId} value={beat.kind} onPick={pick} label="데이터 장면 종류" />
        {optional && <button type="button" className="danger" onClick={() => put(undefined, undefined)} aria-label="데이터 장면 삭제">장면 삭제</button>}
      </div>
      {Object.entries(beat).map(([k, x]) => <Field key={k} k={k} v={x} path={[...path, 'beat', k]} ctx={ctx} depth={depth} />)}
      {item[photosKey] && <Field k={photosKey} v={item[photosKey]} path={[...path, photosKey]} ctx={ctx} depth={depth} />}
    </div>);
};

const Tools: React.FC<{ i: number; n: number; onMove: (d: number) => void; onDup: () => void; onDel: () => void; what: string; allowEmpty?: boolean }> = ({ i, n, onMove, onDup, onDel, what, allowEmpty }) => {
  const stop = (f: () => void) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); f(); };
  return (
    <span className="itemtools">
      <button type="button" className="x" disabled={i === 0} onClick={stop(() => onMove(-1))} aria-label={`${what} ${i + 1} 위로`} title="위로">↑</button>
      <button type="button" className="x" disabled={i === n - 1} onClick={stop(() => onMove(1))} aria-label={`${what} ${i + 1} 아래로`} title="아래로">↓</button>
      <button type="button" className="x" onClick={stop(onDup)} aria-label={`${what} ${i + 1} 복제`} title="복제">⧉</button>
      <button type="button" className="x" disabled={n <= 1 && !allowEmpty} onClick={stop(onDel)} aria-label={`${what} ${i + 1} 삭제`} title="삭제">✕</button>
    </span>);
};

export const ChapterList: React.FC<{ chapters: any[]; path: Path; ctx: Ctx; depth: number }> = ({ chapters, path, ctx, depth }) => {
  const set = (list: any[]) => ctx.onChange(path, list);
  return (
    <div className="group chapters"><div className="glabel">{labelOf('chapters')} <small>{chapters.length}개</small></div>
      {chapters.map((c, i) => (
        <details className="item" key={i}>
          <summary><b>{i + 1}.</b> {c.card?.big || `챕터 ${i + 1}`}
            <Tools i={i} n={chapters.length} what="챕터" onMove={(d) => set(moveChapter(chapters, i, d))} onDup={() => set(dupChapter(chapters, i))} onDel={() => set(delChapter(chapters, i))} /></summary>
          <div className="body">
            {Object.entries(c).filter(([k]) => !SKIP.has(k)).map(([k, x]) => <Field key={k} k={k} v={x} path={[...path, i, k]} ctx={ctx} depth={depth + 1} />)}
            <SceneBody item={c} path={[...path, i]} photosKey="beatPhotos" pool={c.photos ?? []} ctx={ctx} depth={depth + 1} optional />
          </div>
        </details>))}
      <button type="button" className="addrow" onClick={() => set(addChapter(chapters))}>＋ 챕터 추가</button>
    </div>);
};

/** 오프닝(인트로 직후) 또는 마무리(아웃트로 직전) 장면 목록 */
export const ExtraList: React.FC<{ k: 'opening' | 'closing'; list: any[]; path: Path; ctx: Ctx; depth: number }> = ({ k, list, path, ctx, depth }) => {
  const chapters: any[] = ctx.root?.chapters ?? [], pool = (k === 'opening' ? chapters[0] : chapters[chapters.length - 1])?.photos ?? [];
  const set = (l: any[]) => ctx.onChange(path, l), modeId = ctx.modeId ?? '';
  const move = (i: number, d: number) => { const j = i + d, l = [...list]; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; set(l); };
  const add = (kind: BeatKind) => { const ph = pickPhotos(kind, pool), dur = kind === 'names' ? 178 : kind === 'timeline' ? 128 : undefined; set([...list, { beat: defaultBeat(kind), ...(ph ? { photos: ph } : {}), ...(dur ? { dur } : {}) }]); };
  return (
    <div className="group extras"><div className="glabel">{labelOf(k)} <small>{list.length}개 · {k === 'opening' ? '인트로 바로 뒤' : '아웃트로 바로 앞'}</small></div>
      {list.map((it, i) => (
        <details className="item" key={i}>
          <summary><b>{i + 1}.</b> {kindLabel(it.beat?.kind)} <small className="mut">{it.beat?.title || it.beat?.kicker || it.beat?.name || it.beat?.text?.split('\n')[0] || ''}</small>
            <Tools i={i} n={list.length} allowEmpty what={labelOf(k)} onMove={(d) => move(i, d)} onDup={() => set([...list.slice(0, i + 1), JSON.parse(JSON.stringify(it)), ...list.slice(i + 1)])} onDel={() => set(list.filter((_, j) => j !== i))} /></summary>
          <div className="body">
            <SceneBody item={it} path={[...path, i]} photosKey="photos" pool={pool} ctx={ctx} depth={depth + 1} />
            <Field k="dur" v={it.dur ?? 104} path={[...path, i, 'dur']} ctx={ctx} depth={depth + 1} />
          </div>
        </details>))}
      <div className="sceneslot empty"><KindSelect modeId={modeId} value="" onPick={add} placeholder={`＋ ${labelOf(k)} 추가…`} label={`${labelOf(k)} 추가`} /></div>
    </div>);
};
