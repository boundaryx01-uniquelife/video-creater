/** MP4 렌더 대기열: 작업 추가, 진행률·남은 시간, 취소, 완료 목록(내려받기·삭제), 실패 요약, 저장 공간 정리 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { referencedUploads } from './storage.ts';
import { countBlobs, retryUnsaved } from './uploads.ts';
import './polish.css';

export type RJob = {
  id: string; comp: string; name: string; scale: string; seconds: number; status: 'queued' | 'running' | 'done' | 'error' | 'canceled'; stage: string; progress: number;
  createdAt: number; finishedAt?: number; frames?: number; url?: string; size?: number; error?: string; hint?: string; detail?: string; log: string[]; etaSec: number | null; queuePos: number; durationSec?: number;
};
type Storage = { uploads: { count: number; bytes: number }; renders: { count: number; bytes: number }; disk: { free: number; total: number } | null; settings: { rendersDays: number; uploadsDays: number; autoClean: boolean }; dir: string };

export const fmtBytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}MB` : `${Math.max(0, Math.round(n / 1e3))}KB`);
export const fmtSec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}분 ${String(Math.round(s % 60)).padStart(2, '0')}초` : `${Math.max(0, Math.round(s))}초`);
const api = async (url: string, init?: RequestInit) => { const r = await fetch(url, init), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `요청 실패(${r.status})`); return j; };
const post = (url: string, body: unknown = {}) => api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const STATUS: Record<RJob['status'], string> = { queued: '대기 중', running: '렌더 중', done: '완료', error: '실패', canceled: '취소됨' };

const JobRow: React.FC<{ j: RJob; onCancel: () => void; onDelete: () => void }> = ({ j, onCancel, onDelete }) => {
  const mode = j.comp.replace('-video-sample', '');
  return (
    <li className={`job-row ${j.status}`} data-status={j.status} data-id={j.id}>
      <div className="jtop"><b>{j.name}</b><span className={`badge ${j.status}`}>{STATUS[j.status]}{j.status === 'queued' && j.queuePos ? ` ${j.queuePos}번째` : ''}</span>
        <span className="jbtns">
          {(j.status === 'queued' || j.status === 'running') && <button type="button" onClick={onCancel}>취소</button>}
          {j.status === 'done' && <a className="dl" href={`${j.url}?name=${mode}-video.mp4`} download>내려받기</a>}
          {j.status !== 'queued' && j.status !== 'running' && <button type="button" className="danger" onClick={onDelete} aria-label={`${j.name} 삭제`}>삭제</button>}
        </span></div>
      {j.status === 'running' && <div className="jrun"><div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(j.progress * 100)}><i style={{ width: `${Math.round(j.progress * 100)}%` }} /></div>
        <span>{j.stage} {Math.round(j.progress * 100)}%{j.etaSec != null ? ` · 남은 시간 약 ${fmtSec(j.etaSec)}` : ''}</span></div>}
      {j.status === 'done' && <div className="hint">{j.size ? fmtBytes(j.size) : ''}{j.durationSec ? ` · ${j.durationSec.toFixed(1)}초` : ''} · {j.scale}p · {new Date(j.finishedAt ?? j.createdAt).toLocaleString('ko-KR')}</div>}
      {j.status === 'error' && <div className="jerr"><span className="err">실패: {j.error}</span>{j.hint && <div className="hint">{j.hint}</div>}
        {(j.log.length > 0 || j.detail) && <details><summary>자세히 보기</summary><pre>{[...j.log, j.detail && j.detail !== j.error ? '\n' + j.detail : ''].join('\n').trim()}</pre></details>}</div>}
    </li>);
};

export const RenderPanel: React.FC<{ modeId: string; modeName: string; comp: string; props: any; planErr: string; server: boolean | null; needLicense?: boolean; audioLicensed?: boolean }> = ({ modeId, modeName, comp, props, planErr, server, needLicense = false, audioLicensed = false }) => {
  const [jobs, setJobs] = useState<RJob[]>([]), [st, setSt] = useState<Storage | null>(null), [seconds, setSeconds] = useState('8'), [scale, setScale] = useState('720'), [msg, setMsg] = useState('');
  const [cfg, setCfg] = useState({ rendersDays: 14, uploadsDays: 60, autoClean: true }), autoDone = useRef(false), timer = useRef<number>(0);
  const keepList = useCallback(() => [...new Set([...referencedUploads(), ...(JSON.stringify(props).match(/\/?uploads\/[\w.-]+/g) ?? []).map((x) => (x.startsWith('/') ? x : '/' + x))])], [props]);

  const refresh = useCallback(async () => {
    try { const j = await api('/api/renders'); setJobs(j.jobs); setSt(j.storage); return j.jobs as RJob[]; } catch { return null; }
  }, []);
  useEffect(() => { if (st && !autoDone.current) { autoDone.current = true; setCfg(st.settings); if (st.settings.autoClean) post('/api/cleanup', { keep: keepList() }).then((r) => { if (r.uploads || r.renders) setMsg(`오래된 파일을 정리했습니다(업로드 ${r.uploads}개, 렌더 ${r.renders}개, ${fmtBytes(r.bytes)})`); refresh(); }).catch(() => {}); } }, [st, keepList, refresh]);
  useEffect(() => {
    if (server === false) return; let dead = false;
    const tick = async () => { const l = await refresh(); if (dead) return; const active = l?.some((x) => x.status === 'queued' || x.status === 'running'); timer.current = window.setTimeout(tick, active ? 1000 : 5000); };
    tick(); return () => { dead = true; clearTimeout(timer.current); };
  }, [server, refresh]);

  const enqueue = async () => {
    setMsg(''); const label = seconds === '0' ? '전체 길이' : `처음 ${seconds}초`;
    try { await post('/api/render', { comp, props, scale, seconds: Number(seconds), audioLicensed, name: `${modeName} · ${label} · ${scale}p` }); await refresh(); } catch (e) { setMsg(`대기열에 추가하지 못했습니다: ${(e as Error).message}`); }
  };
  const act = async (f: () => Promise<unknown>) => { try { await f(); } catch (e) { setMsg((e as Error).message); } await refresh(); };
  const mine = jobs, active = jobs.filter((j) => j.status === 'queued' || j.status === 'running').length;

  return (
    <section className="render rq" aria-label="MP4 렌더">
      <label>범위<select value={seconds} onChange={(e) => setSeconds(e.target.value)}><option value="8">처음 8초 (빠른 확인)</option><option value="0">전체 길이</option></select></label>
      <label>화질<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="720">720p</option><option value="1080">1080p</option></select></label>
      <button className="primary" onClick={enqueue} disabled={!server || !!planErr || needLicense} title={needLicense ? '음원 사용 권한을 확인해야 합니다' : undefined}>{seconds === '0' ? '전체 길이 MP4 만들기' : '8초 미리 렌더'}{active ? ` (대기열 ${active})` : ''}</button>
      {needLicense && <span className="hint" data-testid="lic-hint">음악이 있어 MP4는 "상업적 이용 권한이 있는 음원입니다"를 체크해야 만들 수 있습니다. 미리보기는 가능합니다.</span>}
      {server === false && <span className="hint">렌더 서버가 없습니다. <code>npm run dev</code>로 실행한 화면에서만 MP4를 만들 수 있습니다.</span>}
      {msg && <div className="hint warnline" role="status">{msg}</div>}
      {mine.length > 0 && <ul className="jobs" aria-live="polite">{mine.map((j) => <JobRow key={j.id} j={j} onCancel={() => act(() => post(`/api/render/${j.id}/cancel`))} onDelete={() => act(() => api(`/api/render/${j.id}`, { method: 'DELETE' }))} />)}</ul>}
      {server && st && (
        <details className="storage"><summary>저장 공간 · 업로드 {fmtBytes(st.uploads.bytes)} · 렌더 {fmtBytes(st.renders.bytes)}{st.disk ? ` · 디스크 여유 ${fmtBytes(st.disk.free)}` : ''}</summary>
          <div className="srow"><span>업로드 사진 {st.uploads.count}개 ({fmtBytes(st.uploads.bytes)}) · 완성 영상 {st.renders.count}개 ({fmtBytes(st.renders.bytes)})</span>
            {st.disk && <span className="meter" title={`디스크 전체 ${fmtBytes(st.disk.total)}`}><i style={{ width: `${Math.round((1 - st.disk.free / st.disk.total) * 100)}%` }} /></span>}</div>
          <div className="srow"><label>완성 영상 보관(일)<input type="number" min={0} max={3650} value={cfg.rendersDays} onChange={(e) => setCfg({ ...cfg, rendersDays: Number(e.target.value) })} /></label>
            <label>업로드 사진 보관(일)<input type="number" min={0} max={3650} value={cfg.uploadsDays} onChange={(e) => setCfg({ ...cfg, uploadsDays: Number(e.target.value) })} /></label>
            <label className="check"><input type="checkbox" checked={cfg.autoClean} onChange={(e) => setCfg({ ...cfg, autoClean: e.target.checked })} />열 때 자동 정리</label></div>
          <div className="hint">0일은 "삭제하지 않음"입니다. 마지막으로 사용한 지 오래된 파일만 지우며, 지금 편집 중인 모든 모드의 사진은 보호됩니다.</div>
          <div className="btns"><button type="button" onClick={() => act(async () => { await post('/api/settings', cfg); setMsg('정리 설정을 저장했습니다.'); })}>설정 저장</button>
            <button type="button" onClick={() => act(async () => { await post('/api/settings', cfg); const r = await post('/api/cleanup', { keep: keepList(), ...cfg }); setMsg(`정리했습니다: 업로드 ${r.uploads}개, 렌더 ${r.renders}개 (${fmtBytes(r.bytes)})`); })}>지금 정리</button></div>
        </details>)}
    </section>);
};

/** 서버에 저장되지 않은 사진(blob:)이 있으면 알리고 다시 올리게 한다 */
export const UnsavedBar: React.FC<{ props: any; server: boolean | null; onFixed: (p: any) => void }> = ({ props, server, onFixed }) => {
  const n = countBlobs(props), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  if (!n && !msg) return null;
  const go = async () => { setBusy(true); setMsg('다시 올리는 중…'); const r = await retryUnsaved(props, (d, t) => setMsg(`다시 올리는 중… ${d}/${t}`)); setBusy(false); if (r.ok) onFixed(r.props); setMsg(r.fail ? `${r.ok}장 저장, ${r.fail}장은 아직 실패했습니다. 서버 상태를 확인하고 다시 시도하세요.` : `${r.ok}장을 서버에 저장했습니다.`); };
  return (
    <div className="note warn unsaved" role="status">{n > 0 && <>서버에 저장되지 않은 사진 {n}장이 있어 MP4에는 나오지 않고 새로고침하면 사라집니다. </>}{msg}
      {n > 0 && server !== false && <button type="button" onClick={go} disabled={busy}>서버에 다시 올리기</button>}
      {n > 0 && server === false && <span className="hint"> 렌더 서버가 꺼져 있습니다.</span>}</div>);
};
