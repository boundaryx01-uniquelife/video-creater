import React, { useRef, useState } from 'react';
import type { PhotoSpec } from '../analysis/videoData.ts';
import { HIDE, MIN1, labelOf } from './labels.ts';
import { Path, byTime, importPhoto, importPhotos, urlOf } from './util.ts';

type Ctx = { onChange: (path: Path, v: any) => void; chip: 'time' | 'date' | 'none'; busy: (s: string) => void };
const isColor = (v: any) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const isPhotoKey = (k: string) => /photo$/i.test(k);
const prim = (v: any) => v == null || typeof v !== 'object';
const titleOf = (it: any, i: number) => it?.card?.big || it?.title || it?.name || it?.big || it?.beat?.title || it?.beat?.kicker || it?.t || it?.k || `${i + 1}`;
const blankLike = (v: any): any => (Array.isArray(v) ? v.map(blankLike) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankLike(x)])) : v);

/** 이미지 1장 선택 */
const ImagePick: React.FC<{ src: string; onPick: (src: string) => void; ctx: Ctx }> = ({ src, onPick, ctx }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="imgpick">
      <img src={urlOf(src)} alt="" />
      <button type="button" onClick={() => ref.current?.click()}>사진 변경</button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; ctx.busy('사진 처리 중…'); try { onPick((await importPhoto(f, 'none')).src); } finally { ctx.busy(''); } }} />
    </span>
  );
};

/** 챕터 사진 줄: 추가, 순서 변경, 삭제, 자막 편집. 첫 사진이 챕터 대표 사진이다 */
const PhotoStrip: React.FC<{ photos: PhotoSpec[]; path: Path; ctx: Ctx }> = ({ photos, path, ctx }) => {
  const [sel, setSel] = useState(0), ref = useRef<HTMLInputElement>(null), cur = photos[Math.min(sel, photos.length - 1)], si = Math.min(sel, photos.length - 1);
  const set = (list: PhotoSpec[]) => ctx.onChange(path, list);
  const move = (d: number) => { const j = si + d; if (j < 0 || j >= photos.length) return; const l = [...photos]; [l[si], l[j]] = [l[j], l[si]]; set(l); setSel(j); };
  const cap = (k: 'chip' | 'title' | 'sub', v: string) => set(photos.map((p, i) => (i === si ? { ...p, cap: { chip: '', title: '', sub: '', ...p.cap, [k]: v } } : p)));
  return (
    <div className="strip">
      <div className="thumbs">
        {photos.map((p, i) => (<button type="button" key={i} className={i === si ? 'on' : ''} onClick={() => setSel(i)} title={p.cap?.chip || ''}><img src={urlOf(p.src)} alt="" />{i === 0 && <em>대표</em>}</button>))}
        <button type="button" className="add" onClick={() => ref.current?.click()}>＋ 사진</button>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={async (e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ''; if (!fs.length) return;
          const r = await importPhotos(fs, ctx.chip, (d, t) => ctx.busy(`사진 처리 중… ${d}/${t}`)); ctx.busy(r.failed.length ? `읽지 못한 파일 ${r.failed.length}개: ${r.failed.slice(0, 3).join(', ')}` : ''); if (r.photos.length) set([...photos, ...r.photos]); }} />
      </div>
      {cur && (
        <div className="capedit">
          <div className="row3">
            <label>칩<input value={cur.cap?.chip ?? ''} onChange={(e) => cap('chip', e.target.value)} placeholder="예: 14:30" /></label>
            <label>자막 제목<input value={cur.cap?.title ?? ''} onChange={(e) => cap('title', e.target.value)} placeholder="비우면 칩만 표시" /></label>
            <label>자막 설명<input value={cur.cap?.sub ?? ''} onChange={(e) => cap('sub', e.target.value)} /></label>
          </div>
          <div className="btns">
            <button type="button" onClick={() => move(-1)} disabled={si === 0}>← 앞으로</button><button type="button" onClick={() => move(1)} disabled={si === photos.length - 1}>뒤로 →</button>
            <button type="button" onClick={() => set([...photos].sort(byTime))} title="촬영 시각이 있는 사진 기준">촬영 시각순 정렬</button>
            <button type="button" className="danger" disabled={photos.length <= 1} onClick={() => { set(photos.filter((_, i) => i !== si)); setSel(Math.max(0, si - 1)); }}>삭제</button>
            <span className="hint">{cur.date ? `촬영 ${cur.date} ${cur.time}` : '촬영 시각 정보 없음'} · {cur.aspect < 0.9 ? '세로' : '가로'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Prim: React.FC<{ k: string; v: any; path: Path; ctx: Ctx; bare?: boolean }> = ({ k, v, path, ctx, bare }) => {
  const on = (x: any) => ctx.onChange(path, x); let input: React.ReactNode;
  if (typeof v === 'boolean') input = <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} />;
  else if (typeof v === 'number') input = <input type="number" value={Number.isFinite(v) ? v : 0} step="any" onChange={(e) => on(e.target.value === '' ? 0 : Number(e.target.value))} />;
  else if (isPhotoKey(k)) input = <ImagePick src={v} onPick={on} ctx={ctx} />;
  else if (isColor(v)) input = <span className="color"><input type="color" value={v} onChange={(e) => on(e.target.value)} /><input value={v} onChange={(e) => on(e.target.value)} /></span>;
  else if (k === 'style') input = <select value={v} onChange={(e) => on(e.target.value)}><option value="fast">빠르게</option><option value="steady">보통</option><option value="slow">느리게</option></select>;
  else if (String(v).includes('\n') || ['text', 'quote'].includes(k) || (k === 'title' && path.length <= 2)) input = <textarea rows={2} value={v ?? ''} onChange={(e) => on(e.target.value)} />;
  else input = <input value={v ?? ''} onChange={(e) => on(e.target.value)} />;
  return bare ? <>{input}</> : <label className={typeof v === 'boolean' ? 'check' : ''}>{labelOf(k)}{input}</label>;
};

export const Field: React.FC<{ k: string; v: any; path: Path; ctx: Ctx; depth?: number }> = ({ k, v, path, ctx, depth = 0 }) => {
  if (HIDE.has(k) || v === undefined) return null;
  if (Array.isArray(v)) {
    if (k === 'photos' && v.length && typeof v[0] === 'object') return <div className="group"><div className="glabel">{labelOf(k)} <small>{v.length}장 · 첫 사진이 대표</small></div><PhotoStrip photos={v} path={path} ctx={ctx} /></div>;
    if (k === 'names') return <label>{labelOf(k)}<textarea rows={6} value={v.join('\n')} onChange={(e) => ctx.onChange(path, e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></label>;
    if (k === 'counts') return <label>{labelOf(k)}<textarea rows={3} value={v.join(', ')} onChange={(e) => ctx.onChange(path, e.target.value.split(/[,\s]+/).map(Number).filter((x) => Number.isFinite(x)))} /></label>;
    if (v.every((x) => typeof x === 'string')) return (
      <div className="group"><div className="glabel">{labelOf(k)}</div>
        {v.map((x, i) => (<div className="line" key={i}>{/photos?$/i.test(k) ? <ImagePick src={x} onPick={(s) => ctx.onChange([...path, i], s)} ctx={ctx} /> : <input value={x} onChange={(e) => ctx.onChange([...path, i], e.target.value)} />}<button type="button" className="x" onClick={() => ctx.onChange(path, v.filter((_, j) => j !== i))}>✕</button></div>))}
        {!/photos?$/i.test(k) && <button type="button" className="addrow" onClick={() => ctx.onChange(path, [...v, ''])}>＋ 추가</button>}
      </div>);
    const compact = v.every((it) => it && typeof it === 'object' && Object.entries(it).filter(([kk]) => !HIDE.has(kk)).every(([, x]) => prim(x)) && Object.keys(it).filter((kk) => !HIDE.has(kk)).length <= 5);
    const canDel = !(MIN1.has(k) && v.length <= 1), add = () => ctx.onChange(path, [...v, blankLike(v[v.length - 1])]);
    return (
      <div className="group"><div className="glabel">{labelOf(k)} <small>{v.length}개</small></div>
        {v.map((it, i) => compact ? (
          <div className="line" key={i}>{Object.entries(it).filter(([kk]) => !HIDE.has(kk)).map(([kk, x]) => (<span className={`cell ${typeof x === 'boolean' ? 'chk' : ''}`} key={kk} title={labelOf(kk)}><i>{labelOf(kk)}</i><Prim k={kk} v={x} path={[...path, i, kk]} ctx={ctx} bare /></span>))}
            <button type="button" className="x" disabled={!canDel} onClick={() => ctx.onChange(path, v.filter((_, j) => j !== i))}>✕</button></div>
        ) : (
          <details className="item" key={i} open={depth > 0 && v.length <= 2}><summary><b>{i + 1}.</b> {titleOf(it, i)}<button type="button" className="x" disabled={!canDel} onClick={(e) => { e.preventDefault(); ctx.onChange(path, v.filter((_, j) => j !== i)); }}>✕</button></summary>
            <div className="body">{Object.entries(it).map(([kk, x]) => <Field key={kk} k={kk} v={x} path={[...path, i, kk]} ctx={ctx} depth={depth + 1} />)}</div></details>
        ))}
        <button type="button" className="addrow" onClick={add}>＋ {labelOf(k)} 추가</button>
      </div>);
  }
  if (v && typeof v === 'object') return <div className="group"><div className="glabel">{labelOf(k)}</div><div className="body">{Object.entries(v).map(([kk, x]) => <Field key={kk} k={kk} v={x} path={[...path, kk]} ctx={ctx} depth={depth + 1} />)}</div></div>;
  return <Prim k={k} v={v} path={path} ctx={ctx} />;
};
