import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { STUDIO_MODES } from './registry.ts';
import { Field } from './Editor';
import { labelOf } from './labels.ts';
import { Path, assignByAgenda, assignEvenly, importPhotos, setIn } from './util.ts';

const KEY = (id: string) => `studio:v1:${id}`;
const load = (id: string, fallback: () => any) => { try { const s = localStorage.getItem(KEY(id)); if (s) return JSON.parse(s); } catch { /* 무시 */ } return fallback(); };

class Boundary extends React.Component<{ k: string; children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: String((e as Error)?.message ?? e) }; }
  componentDidUpdate(prev: { k: string }) { if (prev.k !== this.props.k && this.state.err) this.setState({ err: null }); }
  render() { return this.state.err ? <div className="perr">미리보기를 그릴 수 없습니다. 방금 바꾼 값을 확인해 주세요.<small>{this.state.err}</small></div> : this.props.children; }
}
type Job = { id: string; status: string; stage: string; progress: number; url?: string; error?: string };

export const StudioApp: React.FC = () => {
  const [modeId, setModeId] = useState(() => localStorage.getItem('studio:mode') ?? 'event');
  const mode = STUDIO_MODES.find((m) => m.id === modeId) ?? STUDIO_MODES[0];
  const [props, setProps] = useState<any>(() => load(mode.id, mode.sample));
  const [busy, setBusy] = useState(''), [note, setNote] = useState(''), [job, setJob] = useState<Job | null>(null), [server, setServer] = useState<boolean | null>(null);
  const [scale, setScale] = useState('720'), [seconds, setSeconds] = useState('8');
  const player = useRef<PlayerRef>(null), bulkRef = useRef<HTMLInputElement>(null), importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch('/api/health').then((r) => setServer(r.ok)).catch(() => setServer(false)); }, []);
  useEffect(() => { localStorage.setItem('studio:mode', mode.id); setProps(load(mode.id, mode.sample)); setNote(''); setJob(null); }, [mode.id]);
  useEffect(() => { const t = setTimeout(() => { try { localStorage.setItem(KEY(mode.id), JSON.stringify(props)); } catch { /* 저장 공간 부족 */ } }, 400); return () => clearTimeout(t); }, [props, mode.id]);

  const plan = useMemo(() => { try { return { ...mode.plan(props), err: '' }; } catch (e) { return { total: 30, scenes: [], err: String((e as Error).message) }; } }, [props, mode]);
  const onChange = (path: Path, v: any) => setProps((p: any) => {
    let n = setIn(p, path, v);
    if (mode.id === 'event') n = { ...n, sessions: n.sessions.map((s: any) => ({ ...s, agenda: Math.max(0, Math.min(n.agenda.length - 1, Math.round(Number(s.agenda) || 0))) })) };
    return n;
  });
  const ctx = { onChange, chip: mode.chip, busy: setBusy };

  const bulk = async (files: File[]) => {
    if (!files.length) return; const r = await importPhotos(files, mode.chip, (d, t) => setBusy(`사진 처리 중… ${d}/${t}`)); setBusy('');
    if (!r.photos.length) { setNote('가져온 사진이 없습니다.'); return; }
    const res = mode.bulk === 'agenda' ? assignByAgenda(props, r.photos) : assignEvenly(props, r.photos); setProps(res.props);
    setNote(res.msg + (r.failed.length ? ` · 읽지 못한 파일 ${r.failed.length}개` : ''));
  };
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(props, null, 1)], { type: 'application/json' })); a.download = `${mode.id}-props.json`; a.click(); };
  const render = async () => {
    setJob({ id: '', status: 'running', stage: '요청 중', progress: 0 });
    try {
      const r = await fetch('/api/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ comp: mode.comp, props, scale, seconds: Number(seconds) }) }), j = await r.json();
      if (!r.ok) throw new Error(j.error); const id = j.id as string;
      for (;;) { await new Promise((ok) => setTimeout(ok, 1200)); const s: Job = await (await fetch(`/api/render/${id}`)).json(); setJob(s); if (s.status !== 'running') break; }
    } catch (e) { setJob({ id: '', status: 'error', stage: '', progress: 0, error: String((e as Error).message) }); }
  };
  const hasBlob = JSON.stringify(props).includes('"blob:');

  return (
    <div className="studio">
      <header>
        <h1>Photo Reel Studio</h1>
        <nav>{STUDIO_MODES.map((m) => <button key={m.id} className={m.id === mode.id ? 'on' : ''} onClick={() => setModeId(m.id)} title={m.desc}>{m.name}</button>)}</nav>
      </header>
      <div className="cols">
        <aside className="form">
          <div className="tools">
            {mode.bulk !== 'none' && <button onClick={() => bulkRef.current?.click()} title={mode.bulk === 'agenda' ? '촬영 시각이 세션 시간에 드는 사진을 그 세션에 넣습니다' : '촬영 시각순으로 정렬해 챕터에 고르게 나눕니다'}>사진 일괄 넣기 <small>{mode.bulk === 'agenda' ? '시각으로 세션 자동 배정' : '시각순으로 챕터에 배분'}</small></button>}
            <input ref={bulkRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; bulk(f); }} />
            <button onClick={exportJson}>설정 내보내기</button>
            <button onClick={() => importRef.current?.click()}>불러오기</button>
            <input ref={importRef} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const j = JSON.parse(await f.text()); mode.plan(j); setProps(j); setNote('설정을 불러왔습니다.'); } catch { setNote('이 모드에 맞지 않는 설정 파일입니다.'); } }} />
            <button className="ghost" onClick={() => { if (confirm('이 모드의 입력 내용을 샘플로 되돌릴까요?')) { setProps(mode.sample()); setNote('샘플로 되돌렸습니다.'); } }}>초기화</button>
          </div>
          {(busy || note) && <div className="note">{busy || note}</div>}
          {mode.note && <div className="note warn">{mode.note}</div>}
          {mode.sections.filter((k) => props[k] !== undefined).map((k, i) => (
            <details className="sec" key={mode.id + k} open={i === 0}><summary>{labelOf(k)}</summary><div className="body">{props[k] && typeof props[k] === 'object' && !Array.isArray(props[k]) ? Object.entries(props[k]).map(([kk, x]) => <Field key={kk} k={kk} v={x} path={[k, kk]} ctx={ctx} depth={1} />) : <Field k={k} v={props[k]} path={[k]} ctx={ctx} />}</div></details>
          ))}
        </aside>
        <main>
          <div className="player">
            <Boundary k={JSON.stringify(props).length + ':' + plan.total}>
              {plan.err ? <div className="perr">입력 값으로 영상을 구성할 수 없습니다.<small>{plan.err}</small></div> :
                <Player ref={player} key={mode.id} component={mode.Component} inputProps={props} durationInFrames={Math.max(1, plan.total)} fps={30} compositionWidth={1920} compositionHeight={1080} initialFrame={Math.min(75, Math.max(0, plan.total - 1))} controls loop style={{ width: '100%' }} acknowledgeRemotionLicense />}
            </Boundary>
          </div>
          <div className="scenes">{plan.scenes.map((s, i) => <button key={i} onClick={() => { player.current?.pause(); player.current?.seekTo(Math.min(plan.total - 1, s.from + 40)); }}>{s.label}</button>)}<span>{(plan.total / 30).toFixed(1)}초</span></div>
          <div className="render">
            <label>범위<select value={seconds} onChange={(e) => setSeconds(e.target.value)}><option value="8">처음 8초 (빠른 확인)</option><option value="0">전체</option></select></label>
            <label>화질<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="720">720p</option><option value="1080">1080p</option></select></label>
            <button className="primary" onClick={render} disabled={!server || job?.status === 'running' || !!plan.err}>MP4 만들기</button>
            {server === false && <span className="hint">렌더 서버가 없습니다. <code>npm run dev</code>로 실행한 화면에서만 MP4를 만들 수 있습니다.</span>}
            {hasBlob && <span className="hint">서버에 저장되지 않은 사진이 있어 MP4에는 나오지 않습니다.</span>}
            {job && <div className="job">
              {job.status === 'running' && <><div className="bar"><i style={{ width: `${Math.round(job.progress * 100)}%` }} /></div><span>{job.stage} {Math.round(job.progress * 100)}%</span></>}
              {job.status === 'done' && <a href={`${job.url}?name=${mode.id}-video.mp4`}>완성된 MP4 내려받기</a>}
              {job.status === 'error' && <span className="err">실패: {job.error}</span>}
            </div>}
          </div>
        </main>
      </div>
    </div>
  );
};
