import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { STUDIO_MODES } from './registry.ts';
import { Field } from './Editor';
import { labelOf } from './labels.ts';
import { GradAuto } from './GradAuto';
import { MusicPanel, useAudioLicense } from './MusicPanel';
import type { AudioSpec } from '../audio/spec.ts';
import { TravelPanel } from './TravelPanel';
import { Path, assignByGaps, assignByAgenda, assignEvenly, importPhotos, importSummary, setIn } from './util.ts';
import { useHistory, useUndoKeys } from './history.ts';
import { ACCEPT } from './image.ts';
import { SaveResult, loadProps, saveProps } from './storage.ts';
import { RenderPanel, UnsavedBar } from './RenderPanel';
import { useFileDrop } from './dnd.ts';
import './polish.css';
import { Aspect, SIZES } from '../lib/layout';
import { ElemMaker } from './ElemMaker';


class Boundary extends React.Component<{ k: string; children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: String((e as Error)?.message ?? e) }; }
  componentDidUpdate(prev: { k: string }) { if (prev.k !== this.props.k && this.state.err) this.setState({ err: null }); }
  render() { return this.state.err ? <div className="perr">미리보기를 그릴 수 없습니다. 방금 바꾼 값을 확인해 주세요.<small>{this.state.err}</small></div> : this.props.children; }
}

export const StudioApp: React.FC = () => {
  const [modeId, setModeId] = useState(() => localStorage.getItem('studio:mode') ?? 'elem');
  const mode = STUDIO_MODES.find((m) => m.id === modeId) ?? STUDIO_MODES[0];
  const deadNote = useRef('');
  const H = useHistory<any>(mode.id, (id) => { const m = STUDIO_MODES.find((x) => x.id === id) ?? STUDIO_MODES[0], r = loadProps(id, m.sample); if (r.dead) deadNote.current = `이전에 서버에 저장되지 않은 사진 ${r.dead}장은 샘플 사진으로 바꿨습니다.`; return r.props; });
  const props = H.value, setProps = (p: any) => H.set(p);
  const [busy, setBusy] = useState(''), [note, setNote] = useState(''), [server, setServer] = useState<boolean | null>(null), [stored, setStored] = useState<SaveResult>('ok');
  const [licensed, setLicensed] = useAudioLicense(props.audio?.src);
  const [aspect, setAspect] = useState<Aspect>(() => { try { return localStorage.getItem('studio:aspect') === '9:16' ? '9:16' : '16:9'; } catch { return '16:9'; } });
  const size = SIZES.find((z) => z.label === aspect) ?? SIZES[0], vertical = size.height > size.width;
  useEffect(() => { try { localStorage.setItem('studio:aspect', aspect); } catch { /* 무시 */ } }, [aspect]);
  const player = useRef<PlayerRef>(null), bulkRef = useRef<HTMLInputElement>(null), importRef = useRef<HTMLInputElement>(null);
  useUndoKeys(H.undo, H.redo);
  const fallbackSrc = useMemo(() => JSON.stringify(mode.sample()).match(/media\/[\w.-]+/)?.[0] ?? '', [mode.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch('/api/health').then((r) => setServer(r.ok)).catch(() => setServer(false)); }, []);
  useEffect(() => { try { localStorage.setItem('studio:mode', mode.id); } catch { /* 저장 불가 */ } setNote(deadNote.current); deadNote.current = ''; }, [mode.id]);
  useEffect(() => { const t = setTimeout(() => setStored(saveProps(mode.id, props, fallbackSrc)), 400); return () => clearTimeout(t); }, [props, mode.id]);

  const plan = useMemo(() => { try { return { ...mode.plan(props), err: '' }; } catch (e) { return { total: 30, scenes: [], err: String((e as Error).message) }; } }, [props, mode]);
  // 글자·숫자를 연달아 고치면 한 번의 실행 취소 단계로 합친다(같은 항목일 때)
  const onChange = (path: Path, v: any) => H.set((p: any) => {
    let n = setIn(p, path, v);
    if (mode.id === 'event') n = { ...n, sessions: n.sessions.map((s: any) => ({ ...s, agenda: Math.max(0, Math.min(n.agenda.length - 1, Math.round(Number(s.agenda) || 0))) })) };
    return n;
  }, typeof v === 'string' || typeof v === 'number' ? path.join('.') : '');
  const ctx = { onChange, chip: mode.chip, busy: setBusy, modeId: mode.id, root: props };

  const bulk = async (files: File[]) => {
    if (!files.length) return; setBusy(`사진 처리 중… 0/${files.length}`); const r = await importPhotos(files, mode.chip, (d, t) => setBusy(`사진 처리 중… ${d}/${t}`)); setBusy('');
    if (!r.photos.length) { setNote(importSummary(r) || '가져온 사진이 없습니다.'); return; }
    const res = mode.bulk === 'agenda' ? assignByAgenda(props, r.photos) : mode.bulk === 'gaps' ? assignByGaps(props, r.photos) : assignEvenly(props, r.photos); setProps(res.props);
    setNote([res.msg, importSummary(r)].filter(Boolean).join(' · '));
  };
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(props, null, 1)], { type: 'application/json' })); a.download = `${mode.id}-props.json`; a.click(); };
  const dragging = useFileDrop((fs) => (mode.bulk === 'none' ? setNote('이 모드는 사진 일괄 넣기를 지원하지 않습니다. 챕터의 사진 줄에 끌어다 놓아 주세요.') : bulk(fs)));
  const STORE_MSG: Record<SaveResult, string> = { ok: '', near: '브라우저 저장 공간이 거의 찼습니다. "설정 내보내기"로 백업해 두세요.', stripped: '브라우저 저장 공간이 부족해 사진 데이터(data:/blob:)를 제외하고 저장했습니다. 새로고침하면 해당 사진은 샘플로 바뀌니 "설정 내보내기"로 백업하세요.', failed: '브라우저 저장에 실패했습니다(저장 공간 부족 또는 저장 금지). 새로고침하면 편집 내용이 사라지니 "설정 내보내기"로 백업하세요.' };
  const needLicense = !!props.audio && !licensed;
  const setAudio = (a?: AudioSpec) => setProps((p: any) => { const { audio: _old, ...rest } = p; return a ? { ...rest, audio: a } : rest; });

  return (
    <div className="studio">
      <header>
        <h1>Photo Reel Studio</h1>
        <nav aria-label="영상 종류">{STUDIO_MODES.map((m) => <button key={m.id} className={m.id === mode.id ? 'on' : ''} aria-current={m.id === mode.id ? 'page' : undefined} onClick={() => setModeId(m.id)} title={m.desc}>{m.name}</button>)}</nav>
      </header>
      <div className="cols">
        <aside className="form">
          <div className="tools">
            <span className="undo"><button onClick={H.undo} disabled={!H.canUndo} title="실행 취소 (Ctrl/Cmd+Z)" aria-label="실행 취소">↶ 취소</button><button onClick={H.redo} disabled={!H.canRedo} title="다시 실행 (Ctrl/Cmd+Shift+Z)" aria-label="다시 실행">↷ 다시</button></span>
            {mode.bulk !== 'none' && <button onClick={() => bulkRef.current?.click()} title={mode.bulk === 'agenda' ? '촬영 시각이 세션 시간에 드는 사진을 그 세션에 넣습니다' : '촬영 시각순으로 정렬해 챕터에 고르게 나눕니다'}>사진 일괄 넣기 <small>{mode.bulk === 'agenda' ? '시각으로 세션 자동 배정' : '시각순으로 챕터에 배분'}</small></button>}
            <input ref={bulkRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; bulk(f); }} />
            <button onClick={exportJson}>설정 내보내기</button>
            <button onClick={() => importRef.current?.click()}>불러오기</button>
            <input ref={importRef} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const j = JSON.parse(await f.text()); mode.plan(j); setProps(j); setNote('설정을 불러왔습니다.'); } catch { setNote('이 모드에 맞지 않는 설정 파일입니다.'); } }} />
            <button className="ghost" onClick={() => { if (confirm('이 모드의 입력 내용을 샘플로 되돌릴까요?')) { setProps(mode.sample()); setNote('샘플로 되돌렸습니다.'); } }}>초기화</button>
          </div>
          <div className={busy || note ? 'note' : 'sr-only'} role="status" aria-live="polite">{busy || note}</div>
          {stored !== 'ok' && <div className="note warn" role="alert">{STORE_MSG[stored]}</div>}
          {mode.id === 'elem' && <ElemMaker props={props} setProps={setProps} setNote={setNote} setBusy={setBusy} aspect={aspect} setAspect={(a) => { player.current?.pause(); setAspect(a); }} undo={H.undo} />}
          <UnsavedBar props={props} server={server} onFixed={setProps} />
          {mode.note && <div className="note warn">{mode.note}</div>}
          {mode.id === 'grad' && <GradAuto props={props} setProps={setProps} setNote={setNote} />}
          <MusicPanel audio={props.audio} onChange={setAudio} busy={setBusy} licensed={licensed} setLicensed={setLicensed} />
          {mode.id === 'travel' && <TravelPanel props={props} setProps={setProps} server={server} />}
          {mode.sections.filter((k) => props[k] !== undefined || (props.chapters && (k === 'opening' || k === 'closing'))).map((k, i) => (
            <details className="sec" key={mode.id + k} open={i === 0}><summary>{labelOf(k)}</summary><div className="body">{props[k] && typeof props[k] === 'object' && !Array.isArray(props[k]) ? Object.entries(props[k]).map(([kk, x]) => <Field key={kk} k={kk} v={x} path={[k, kk]} ctx={ctx} depth={1} />) : <Field k={k} v={props[k] ?? []} path={[k]} ctx={ctx} />}</div></details>
          ))}
        </aside>
        <main>
          <div className={'stage' + (vertical ? ' v' : '')}>
          <div className={'player' + (vertical ? ' v' : '')}>
            <Boundary k={JSON.stringify(props).length + ':' + plan.total}>
              {plan.err ? <div className="perr">입력 값으로 영상을 구성할 수 없습니다.<small>{plan.err}</small></div> :
                <Player ref={player} key={mode.id + aspect} component={mode.Component} inputProps={props} durationInFrames={Math.max(1, plan.total)} fps={30} compositionWidth={size.width} compositionHeight={size.height} initialFrame={Math.min(75, Math.max(0, plan.total - 1))} controls loop style={{ width: '100%', height: '100%' }} acknowledgeRemotionLicense />}
            </Boundary>
          </div>
          <div className="side">
          <div className="scenes">{plan.scenes.map((s, i) => <button key={i} onClick={() => { player.current?.pause(); player.current?.seekTo(Math.min(plan.total - 1, s.from + 40)); }}>{s.label}</button>)}<span>{(plan.total / 30).toFixed(1)}초</span></div>
          <div className="aspectrow"><label>화면 비율<select value={aspect} onChange={(e) => { player.current?.pause(); setAspect(e.target.value as Aspect); }}>{SIZES.map((z) => <option key={z.label} value={z.label}>{z.label === '16:9' ? '16:9 가로 (1920×1080)' : '9:16 세로 (1080×1920)'}</option>)}</select></label></div>
          <RenderPanel modeId={mode.id} modeName={mode.name + (vertical ? ' · 세로' : '')} comp={mode.comp + size.suffix} props={props} planErr={plan.err} server={server} needLicense={needLicense} audioLicensed={licensed} />
          </div>
          </div>
        </main>
      </div>
    {dragging && <div className="dropveil">사진을 놓으면 불러옵니다</div>}
    </div>
  );
};
