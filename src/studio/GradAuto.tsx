import React, { useEffect, useMemo, useRef, useState } from 'react';
import exifr from 'exifr';
import { importPhoto } from './util.ts';
import { planGrad, comma, fmtDay, type GradEvent } from '../modes/schoolYear.ts';
import { composeGrad, pickedIndexes } from '../modes/gradCompose.ts';
import type { PhotoSpec } from '../analysis/videoData.ts';
import './gradAuto.css';

type Item = { file: File; ts?: number; aspect?: number };
type Cfg = { enroll: string; graduate: string; graduates: string; perGrade: string; events: (GradEvent & { to: string })[] };
const KEY = 'studio:grad-auto:v1';
const DEFAULT: Cfg = {
  enroll: '2024-03-04', graduate: '2027-02-12', graduates: '248', perGrade: '10',
  events: [
    { date: '2024-03-04', to: '', label: '입학식', kind: 'major' }, { date: '2024-05-17', to: '', label: '체육대회' }, { date: '2025-04-23', to: '2025-04-25', label: '수학여행' },
    { date: '2025-10-17', to: '', label: '한빛제' }, { date: '2026-10-08', to: '', label: '졸업 사진 촬영' }, { date: '2027-02-12', to: '', label: '졸업식', kind: 'major' },
  ],
};
const loadCfg = (): Cfg => { try { const s = localStorage.getItem(KEY); if (s) return { ...DEFAULT, ...JSON.parse(s) }; } catch { /* 무시 */ } return DEFAULT; };

/** 사진 파일에서 촬영 시각·가로세로비만 읽는다(업로드·리사이즈 없음). 크기는 EXIF 값으로 먼저 보고, 없으면 작게 디코딩해서 확인 */
async function readMeta(file: File): Promise<Item> {
  let ts: number | undefined, aspect: number | undefined;
  try {
    const ex: any = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate', 'ExifImageWidth', 'ExifImageHeight'] } as any), d = ex?.DateTimeOriginal ?? ex?.CreateDate;
    if (d instanceof Date && !isNaN(+d)) ts = +d;
    if (ex?.ExifImageWidth > 0 && ex?.ExifImageHeight > 0) { aspect = ex.ExifImageWidth / ex.ExifImageHeight; const o = (await exifr.orientation(file).catch(() => 1)) ?? 1; if (o >= 5) aspect = 1 / aspect; }
  } catch { /* EXIF 없음 */ }
  if (aspect == null) { try { const b = await createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth: 96 } as ImageBitmapOptions); aspect = b.width / b.height; b.close(); } catch { /* 디코딩 실패: 비율 모름 */ } }
  return { file, ts, aspect };
}

type Props = { props: any; setProps: (p: any) => void; setNote: (s: string) => void };
export const GradAuto: React.FC<Props> = ({ props, setProps, setNote }) => {
  const [cfg, setCfg] = useState<Cfg>(loadCfg), [items, setItems] = useState<Item[]>([]), [msg, setMsg] = useState(''), [working, setWorking] = useState(false);
  const [undo, setUndo] = useState<{ before: any; after: string } | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* 무시 */ } }, [cfg]);
  const up = (patch: Partial<Cfg>) => setCfg((c) => ({ ...c, ...patch }));
  const setEv = (i: number, patch: Partial<Cfg['events'][number]>) => up({ events: cfg.events.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const gradsN = cfg.graduates.trim() === '' ? undefined : Math.max(0, Math.round(Number(cfg.graduates)));

  const plan = useMemo(() => planGrad({ photos: items, enroll: cfg.enroll, graduate: cfg.graduate, graduates: Number.isFinite(gradsN) ? gradsN : undefined, perGrade: Number(cfg.perGrade) || 10, events: cfg.events.map((e) => ({ ...e, to: e.to || undefined })) }), [items, cfg, gradsN]);

  const choose = async (files: File[]) => {
    if (!files.length) return; setWorking(true); const out: Item[] = new Array(files.length); let done = 0, next = 0;
    await Promise.all(Array.from({ length: Math.min(4, files.length) }, async () => { for (;;) { const i = next++; if (i >= files.length) return; out[i] = await readMeta(files[i]); setMsg(`촬영 날짜 읽는 중… ${++done}/${files.length}`); } }));
    setItems(out); setMsg(`${files.length}장의 촬영 날짜를 읽었습니다.`); setWorking(false);
  };

  const run = async () => {
    if (!plan.ok || working) return; setWorking(true);
    try {
      const idx = pickedIndexes(plan), got = new Map<number, PhotoSpec>(), failed: string[] = [];
      for (const [n, i] of idx.entries()) { setMsg(`선택한 사진 올리는 중… ${n + 1}/${idx.length}`); try { got.set(i, await importPhoto(items[i].file, 'date')); } catch { failed.push(items[i].file.name); } }
      const next = composeGrad(props, plan, (i) => got.get(i));
      setUndo({ before: props, after: JSON.stringify(next) }); setProps(next);
      const n = next.chapters.length;
      setMsg(''); setNote(`자동 구성 완료: 챕터 ${n}개 · 범위 내 ${comma(plan.inRange)}장 / 범위 밖·시각 없음 ${comma(plan.other.before.length + plan.other.after.length + plan.other.noTime.length)}장${failed.length ? ` · 읽지 못한 파일 ${failed.length}개` : ''}`);
    } catch (e) { setMsg(''); setNote(`자동 구성 실패: ${(e as Error).message}`); }
    setWorking(false);
  };
  const cancel = () => {
    if (!undo) return;
    if (JSON.stringify(props) !== undo.after && !confirm('자동 구성 이후에 직접 수정한 내용도 함께 사라집니다. 취소할까요?')) return;
    setProps(undo.before); setUndo(null); setNote('자동 구성을 취소하고 이전 상태로 되돌렸습니다.');
  };

  return (
    <details className="sec gradauto" open>
      <summary>촬영 날짜로 자동 구성</summary>
      <div className="body">
        <p className="hint">사진의 촬영 날짜로 학년(3월 1일 기준)을 나누고, 월별 타임라인·학년 카드·행사 자막·마지막 숫자를 채웁니다.</p>
        <div className="ga2"><label>입학일<input type="date" value={cfg.enroll} onChange={(e) => up({ enroll: e.target.value })} /></label><label>졸업일<input type="date" value={cfg.graduate} onChange={(e) => up({ graduate: e.target.value })} /></label></div>
        <div className="ga2"><label>졸업생 수(명)<input type="number" min="0" value={cfg.graduates} onChange={(e) => up({ graduates: e.target.value })} /></label><label>학년당 사진 수<input type="number" min="3" max="40" value={cfg.perGrade} onChange={(e) => up({ perGrade: e.target.value })} /></label></div>
        <div className="glabel" style={{ marginTop: 10 }}>행사 <small>{cfg.events.length}개 · 별표는 주요 행사(타임라인·대표 행사 우선)</small></div>
        {cfg.events.map((e, i) => (
          <div className="line gaev" key={i}>
            <button type="button" className={`star ${e.kind === 'major' ? 'on' : ''}`} title="주요 행사" onClick={() => setEv(i, { kind: e.kind === 'major' ? 'normal' : 'major' })}>★</button>
            <span className="cell"><i>날짜</i><input type="date" value={e.date} onChange={(ev) => setEv(i, { date: ev.target.value })} /></span>
            <span className="cell"><i>끝날(선택)</i><input type="date" value={e.to} onChange={(ev) => setEv(i, { to: ev.target.value })} /></span>
            <span className="cell"><i>행사 이름</i><input value={e.label} onChange={(ev) => setEv(i, { label: ev.target.value })} /></span>
            <button type="button" className="x" onClick={() => up({ events: cfg.events.filter((_, j) => j !== i) })}>✕</button>
          </div>))}
        <button type="button" className="addrow" onClick={() => up({ events: [...cfg.events, { date: '', to: '', label: '' }] })}>＋ 행사 추가</button>

        <div className="btns" style={{ marginTop: 12 }}>
          <button type="button" onClick={() => pick.current?.click()} disabled={working}>사진 선택{items.length ? ` (${items.length}장 선택됨)` : ''}</button>
          <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; choose(f); }} />
          <button type="button" className="primary" onClick={run} disabled={working || !plan.ok || !plan.ok || (plan.ok && plan.inRange === 0)}>자동 구성 실행</button>
          <button type="button" onClick={cancel} disabled={!undo || working}>자동 구성 취소</button>
        </div>
        {msg && <div className="hint" style={{ marginTop: 6 }}>{msg}</div>}

        {!plan.ok ? <div className="note warn" style={{ marginTop: 8 }}>{plan.errors.join(' ')}</div> : items.length > 0 && (
          <div className="gasum">
            <div className="gahead">촬영 {fmtDay(plan.start)} ~ {fmtDay(plan.end)} · 함께한 날 {comma(plan.totalDays)}일 · 범위 내 {comma(plan.inRange)}장</div>
            {plan.grades.filter((g) => g.exists).map((g, k) => (
              <div key={g.grade} className={`garow ${g.count ? '' : 'none'}`}>
                <b>{g.label}</b><span>{g.count ? `${comma(g.count)}장` : '사진 없음 · 챕터 생략'}</span>
                <small>D+{comma(g.fromD)} – D+{comma(g.toD)}{g.events.length ? ` · ${g.events.join(' · ')}` : ''}{plan.picks[k].length ? ` · 영상에 ${plan.picks[k].length}장` : ''}</small>
              </div>))}
            <div className={`garow ${plan.other.before.length + plan.other.after.length + plan.other.noTime.length ? 'warn' : 'none'}`}>
              <b>범위 밖</b><span>{comma(plan.other.before.length + plan.other.after.length + plan.other.noTime.length)}장</span>
              <small>입학 전 {plan.other.before.length} · 졸업 후 {plan.other.after.length} · 촬영 시각 없음 {plan.other.noTime.length} (영상에서 제외)</small>
            </div>
            {plan.warnings.filter((w) => !/이전|이후|촬영 시각이 없는/.test(w)).map((w, i) => <div className="hint" key={i}>• {w}</div>)}
          </div>)}
      </div>
    </details>
  );
};
