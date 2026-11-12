import React, { useEffect, useRef, useState } from 'react';
import exifr from 'exifr';
import type { PhotoSpec } from '../analysis/videoData.ts';
import type { Mode, TravelProps } from '../travel/types.ts';
import { MODE_LABEL } from '../travel/geo.ts';
import { TravelDoc, autoMode, deleteStop, hasPhoto, makeHero, mergeStops, modeOf, renameStop, setCaption, setInfo, setMode, togglePhoto } from '../travel/edit.ts';
import './travel.css';

type Warn = { code: string; level: 'info' | 'warn'; msg: string };
type Summary = { photos: number; failed: number; withGps: number; noGps: number; noTime: number; transit: number; attached: number; stops: number; fineRadius: boolean };
type Session = { tid: string; cands: PhotoSpec[][]; cruise: number[]; warnings: Warn[]; summary: Summary };
type Job = { id: string; status: string; stage: string; msg: string; progress: number; error?: { code: string; message: string; hint?: string }; result?: any };
type Status = { ready: boolean; missing: string[]; dir: string; fetch: { running: boolean; ok: boolean | null; log: string[] } };
type Pre = { total: number; gps: number; noGps: number; noTime: number; unsupported: number };

const OK_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const STAGES: [string, string][] = [['upload', '업로드'], ['analyze', '사진 분석'], ['stops', '정차지'], ['routes', '경로'], ['layers', '지도 레이어'], ['terrain', '지형']];
const MODES = Object.keys(MODE_LABEL) as Mode[];
const SKEY = 'studio:travel:session';
const thumbOf = (src: string) => src.replace(/\/tr_(\d+)\.jpg$/, '/th_$1.jpg');
const keyOf = (p: TravelProps) => JSON.stringify([p.stops.map((s) => [s.lat, s.lon, s.arrive, s.depart]), p.modeOverride ?? {}]);
const when = (s: string) => s.slice(5, 16).replace('T', ' ');
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const jget = async (url: string) => { const r = await fetch(url); const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.error ?? '요청 실패'), j); return j; };
const jpost = async (url: string, body: unknown) => { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.error ?? '요청 실패'), j); return j; };
async function poll(id: string, on: (j: Job) => void): Promise<Job> { for (;;) { await sleep(700); const j: Job = await jget(`/api/travel/job/${id}`); on(j); if (j.status === 'done' || j.status === 'error') return j; } }
const loadSession = (): Session | null => { try { return JSON.parse(localStorage.getItem(SKEY) ?? 'null'); } catch { return null; } };

/** 선택한 사진의 위치·시각 정보를 브라우저에서 미리 센다(서버로 올리기 전) */
async function precheck(files: File[]): Promise<Pre> {
  const r: Pre = { total: files.length, gps: 0, noGps: 0, noTime: 0, unsupported: 0 }; let k = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { for (;;) { const f = files[k++]; if (!f) return;
    if (!OK_TYPES.has(f.type)) { r.unsupported++; continue; }
    try { const g = await exifr.gps(f).catch(() => null), t = await exifr.parse(f, ['DateTimeOriginal', 'CreateDate'] as any).catch(() => null);
      if (g && Number.isFinite(g.latitude)) r.gps++; else r.noGps++; if (!(t?.DateTimeOriginal || t?.CreateDate)) r.noTime++; } catch { r.noGps++; r.noTime++; } } }));
  return r;
}

export const TravelPanel: React.FC<{ props: any; setProps: (f: any) => void; server: boolean | null }> = ({ props, setProps, server }) => {
  const p = props as TravelProps;
  const [status, setStatus] = useState<Status | null>(null), [files, setFiles] = useState<File[]>([]), [pre, setPre] = useState<Pre | null>(null);
  const [phase, setPhase] = useState<'idle' | 'upload' | 'build'>('idle'), [step, setStep] = useState(''), [prog, setProg] = useState(0), [err, setErr] = useState<{ message: string; hint?: string; code?: string } | null>(null);
  const [sess, setSess] = useState<Session | null>(loadSession), [needRoute, setNeedRoute] = useState(false), [routing, setRouting] = useState(false), [routeErr, setRouteErr] = useState('');
  const [sel, setSel] = useState<Record<number, string>>({}), [attach, setAttach] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null), propsRef = useRef(p), pool = useRef<any[]>([]);
  propsRef.current = p;
  const sessRef = useRef(sess); sessRef.current = sess;

  const valid = !!sess && !!p.assets?.geo && p.assets.geo.includes(`/${sess.tid}/`);
  useEffect(() => { try { if (sess) localStorage.setItem(SKEY, JSON.stringify(sess)); } catch { /* 저장 공간 부족 */ } }, [sess]);
  useEffect(() => { if (valid && p.legs) pool.current = [...p.legs, ...pool.current].slice(0, 40); }, [valid, p.legs]);
  const refreshStatus = () => fetch('/api/travel/status').then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  useEffect(() => { if (server) refreshStatus(); }, [server]);
  useEffect(() => { if (!status?.fetch.running) return; const t = setInterval(refreshStatus, 1500); return () => clearInterval(t); }, [status?.fetch.running]);

  const pick = async (list: File[]) => { setFiles(list); setErr(null); setPre(null); if (list.length) setPre(await precheck(list)); };
  const busy = phase !== 'idle';

  /* ---------- 사진 → 영상 ---------- */
  const make = async () => {
    setErr(null); setProg(0);
    try {
      const ok = files.filter((f) => OK_TYPES.has(f.type)); if (!ok.length) throw Object.assign(new Error('지원하는 사진(JPG·PNG·WebP)이 없습니다.'), { code: 'no-photos' });
      setPhase('upload'); setStep('upload'); const list: { u: string; n: string }[] = []; let done = 0, k = 0;
      await Promise.all(Array.from({ length: 3 }, async () => { for (;;) { const f = ok[k++]; if (!f) return;
        const r = await fetch('/api/travel/upload', { method: 'POST', headers: { 'content-type': f.type }, body: f }), j = await r.json(); if (!r.ok) throw new Error(`${f.name}: ${j.error}`);
        list.push({ u: j.u, n: f.name }); setProg(++done / ok.length * 0.1); } }));
      setPhase('build'); const { job } = await jpost('/api/travel/build', { photos: list, attachNoGps: attach });
      const res = await poll(job, (j) => { setStep(j.stage); setProg(0.1 + j.progress * 0.9); });
      if (res.status === 'error') throw Object.assign(new Error(res.error!.message), res.error);
      const { tid, props: np, meta } = res.result; pool.current = np.legs ?? [];
      setSess({ tid, cands: meta.candidates, cruise: meta.cruise, warnings: meta.warnings, summary: meta.summary }); setProps(np); setNeedRoute(false); setRouteErr(''); setSel({});
    } catch (e: any) { setErr({ message: String(e.message ?? e), hint: e.hint, code: e.code }); if (e.code === 'no-map-data') refreshStatus(); }
    finally { setPhase('idle'); setStep(''); }
  };

  /* ---------- 편집 ---------- */
  const doc = (): TravelDoc => ({ props: p, cands: sess!.cands, cruise: sess!.cruise });
  const edit = (f: (d: TravelDoc) => TravelDoc, route = false) => { const n = f(doc()); setProps(n.props); setSess({ ...sess!, cands: n.cands, cruise: n.cruise }); if (route) setNeedRoute(true); };

  useEffect(() => {
    if (!needRoute || routing || !valid) return;
    const t = setTimeout(async () => {
      const sent = propsRef.current, key = keyOf(sent); setRouting(true); setRouteErr('');
      try {
        const { job } = await jpost('/api/travel/reroute', { tid: sess!.tid, props: { ...sent, legs: undefined }, reuse: pool.current, cruise: sessRef.current?.cruise ?? [] });
        const res = await poll(job, () => {});
        if (res.status === 'error') throw new Error(res.error!.message);
        const np: TravelProps = res.result.props; pool.current = [...(np.legs ?? []), ...pool.current].slice(0, 40);
        setProps((cur: TravelProps) => (keyOf(cur) === key ? { ...cur, legs: np.legs, assets: np.assets } : cur));
        setSess((s) => (s ? { ...s, warnings: res.result.warnings ?? s.warnings } : s));
        setNeedRoute(keyOf(propsRef.current) !== key);
      } catch (e: any) { setRouteErr(String(e.message ?? e)); setNeedRoute(false); }
      finally { setRouting(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [needRoute, routing, valid, p]);

  const dropped = (name: string) => confirm(`${name} 정차지를 삭제할까요? 앞뒤 구간은 하나로 합쳐져 다시 계산됩니다.`);
  const stepIdx = STAGES.findIndex(([k]) => k === step);

  return (
    <div className="travelp">
      <details className="sec" open>
        <summary>사진으로 여행 만들기</summary>
        <div className="body">
          <p className="hint">위치(GPS)와 촬영 시각이 들어 있는 <b>카메라 원본</b> 사진을 여러 장 고르면 머문 곳, 이동수단, 도로·철도 경로, 지형 지도를 자동으로 만듭니다. 사진은 이 컴퓨터의 스튜디오 서버에서만 처리됩니다.</p>
          {server === false && <div className="note warn">스튜디오 서버가 없습니다. <code>npm run dev</code>로 실행한 화면에서만 사용할 수 있습니다.</div>}
          {status && !status.ready && (
            <div className="note warn" data-testid="nomap">
              <b>지도 데이터가 없습니다.</b> 이동 경로·도시 이름·지도 레이어에 Natural Earth 데이터({status.missing.length}개 파일, 약 150MB)가 필요합니다.
              <div className="btns"><button type="button" disabled={status.fetch.running} onClick={() => fetch('/api/travel/fetch-data', { method: 'POST' }).then(refreshStatus)}>{status.fetch.running ? '내려받는 중…' : '지도 데이터 내려받기'}</button><span className="hint">또는 터미널에서 <code>npm run fetch:data</code></span></div>
              {status.fetch.log.length > 0 && <pre className="flog">{status.fetch.log.slice(-5).join('\n')}</pre>}
              {status.fetch.ok === false && <div className="err">내려받기에 실패했습니다. raw.githubusercontent.com 접속을 확인하세요.</div>}
            </div>
          )}
          <div className="btns">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>사진 선택 (여러 장)</button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; pick(f); }} />
            <label className="check inl"><input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />위치 없는 사진도 시각으로 정차지에 넣기</label>
          </div>
          {pre && (
            <div className="pre" data-testid="pre">
              선택 <b>{pre.total}장</b> · 위치 있음 <b>{pre.gps}</b> · <span className={pre.noGps ? 'bad' : ''}>위치 없음 <b data-testid="nogps">{pre.noGps}</b></span> · <span className={pre.noTime ? 'bad' : ''}>촬영 시각 없음 <b>{pre.noTime}</b></span>{pre.unsupported > 0 && <> · <span className="bad">지원 안 되는 형식 <b>{pre.unsupported}</b></span></>}
              {pre.gps < 2 && <div className="err">위치가 있는 사진이 {pre.gps}장입니다. 서로 다른 두 곳 이상에서 찍은 위치 사진이 필요합니다.</div>}
              {pre.noGps > 0 && pre.gps >= 2 && <div className="hint">위치 없는 사진은 지도에 표시되지 않습니다{attach ? ' (촬영 시각이 머문 시간과 맞으면 그 정차지의 사진 후보로만 씁니다)' : ''}. 촬영 시각이 없는 사진은 순서를 알 수 없어 제외됩니다.</div>}
            </div>
          )}
          <div className="btns"><button type="button" className="primary" data-testid="make" disabled={!server || busy || !files.length || (status ? !status.ready : false)} onClick={make}>{busy ? '만드는 중…' : '여행 영상 만들기'}</button></div>
          {busy && (
            <div className="steps" data-testid="steps">
              <div className="bar"><i style={{ width: `${Math.round(prog * 100)}%` }} /></div>
              <ol>{STAGES.map(([k, l], i) => <li key={k} className={i < stepIdx ? 'done' : i === stepIdx ? 'on' : ''}>{l}</li>)}</ol>
            </div>
          )}
          {err && <div className="note err" data-testid="err"><b>{err.message}</b>{err.hint && <div className="hint">{err.hint}</div>}</div>}
        </div>
      </details>

      {valid && sess && (
        <details className="sec" open>
          <summary>만들어진 여행 편집 <small className="hint">{p.stops.length}곳 · 자동 추정값</small></summary>
          <div className="body" data-testid="editor">
            <div className="note warn">정차지 <b>이름</b>과 <b>이동수단</b>은 사진의 위치·시각으로 자동 추정한 값이라 <b>틀릴 수 있습니다</b>. 가까운 도시 이름을 고르기 때문에 작은 마을·명소는 다른 이름이 붙을 수 있으니 확인하고 고쳐 주세요.</div>
            <div className="sumline">사진 {sess.summary.photos}장 · 위치 있음 {sess.summary.withGps} · 위치 없음 {sess.summary.noGps} · 시각 없음 {sess.summary.noTime} · 이동 중 제외 {sess.summary.transit}</div>
            {sess.warnings.map((w, i) => <div key={i} className={`wn ${w.level}`} data-code={w.code}>{w.level === 'warn' ? '주의' : '참고'} · {w.msg}</div>)}
            {(routing || needRoute) && <div className="note" data-testid="routing">경로를 다시 계산하는 중입니다… (바뀐 구간만 계산합니다)</div>}
            {routeErr && <div className="note err">경로 재계산 실패: {routeErr} <small>곡선 경로로 표시됩니다.</small></div>}

            <label>제목<textarea rows={2} value={p.info.title} onChange={(e) => edit((d) => setInfo(d, { title: e.target.value }))} /></label>
            <div className="row2"><label>부제<input value={p.info.sub} onChange={(e) => edit((d) => setInfo(d, { sub: e.target.value }))} /></label><label>기간<input value={p.info.range} onChange={(e) => edit((d) => setInfo(d, { range: e.target.value }))} /></label></div>

            {p.stops.map((s, i) => {
              const l = p.legs?.[i - 1], cands = sess.cands[i] ?? [], selSrc = sel[i] ?? s.photos[0]?.src, selPhoto = s.photos.find((x) => x.src === selSrc);
              const ov = p.modeOverride?.[i - 1], cur = i > 0 ? modeOf(p, i - 1, sess.cruise) : 'walk', auto = i > 0 ? autoMode(p, i - 1, sess.cruise) : 'walk';
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <div className="leg" data-testid={`leg-${i - 1}`}>
                      <span className="arrow">▼</span>
                      <label>이동수단<select value={ov ?? 'auto'} onChange={(e) => edit((d) => setMode(d, i - 1, e.target.value === 'auto' ? null : (e.target.value as Mode)), true)}>
                        <option value="auto">자동 추정 ({MODE_LABEL[auto]})</option>{MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
                      </select></label>
                      <span className="hint">{ov ? '직접 지정' : '자동 추정'} · {MODE_LABEL[cur]}{l ? ` · ${l.km >= 10 ? Math.round(l.km) : l.km.toFixed(1)}km · ${Math.round(l.min)}분 · ${l.routed ? '실제 도로·철도·길 따라' : '곡선(추정 경로)'}` : ' · 경로 계산 중'}</span>
                    </div>
                  )}
                  <div className="stopc" data-testid={`stop-${i}`}>
                    <div className="sh"><b>{i + 1}</b><span className="hint">{when(s.arrive)}{s.depart ? ` ~ ${s.depart.slice(11, 16)}` : ''} · {s.lat.toFixed(3)}, {s.lon.toFixed(3)}</span>
                      <span className="grow" />
                      {i < p.stops.length - 1 && <button type="button" title="다음 정차지와 하나로 합치기" onClick={() => edit((d) => mergeStops(d, i), true)}>다음과 합치기</button>}
                      <button type="button" className="danger" disabled={p.stops.length <= 2} onClick={() => dropped(s.name) && edit((d) => deleteStop(d, i), true)}>삭제</button></div>
                    <div className="row2"><label>이름 <small>(자동 추정)</small><input value={s.name} onChange={(e) => edit((d) => renameStop(d, i, e.target.value, s.sub))} /></label><label>부제<input value={s.sub} onChange={(e) => edit((d) => renameStop(d, i, s.name, e.target.value))} /></label></div>
                    {i === 0 ? <div className="hint">출발지는 지도에만 표시되고 사진 장면은 만들지 않습니다.</div> : (
                      <>
                        <div className="glabel">영상에 쓸 사진 <small>{s.photos.length}장 선택 / 후보 {cands.length}장 · 첫 사진이 대표</small></div>
                        <div className="cthumbs">{cands.map((c) => (
                          <button type="button" key={c.src} className={hasPhoto(s, c.src) ? 'on' : ''} title={`${c.cap?.chip ?? ''} ${c.aspect < 0.9 ? '세로' : '가로'}`} onClick={() => { edit((d) => togglePhoto(d, i, c)); setSel({ ...sel, [i]: c.src }); }}>
                            <img src={thumbOf(c.src)} alt="" />{s.photos[0]?.src === c.src && <em>대표</em>}<i>{c.cap?.chip}</i></button>))}</div>
                        {selPhoto && (
                          <div className="capedit">
                            <div className="row3"><label>시각 칩<input value={selPhoto.cap?.chip ?? ''} onChange={(e) => edit((d) => setCaption(d, i, selPhoto.src, { chip: e.target.value }))} /></label><label>자막 제목<input value={selPhoto.cap?.title ?? ''} onChange={(e) => edit((d) => setCaption(d, i, selPhoto.src, { title: e.target.value }))} /></label><label>자막 설명<input value={selPhoto.cap?.sub ?? ''} onChange={(e) => edit((d) => setCaption(d, i, selPhoto.src, { sub: e.target.value }))} /></label></div>
                            <div className="btns"><button type="button" disabled={s.photos[0]?.src === selPhoto.src} onClick={() => edit((d) => makeHero(d, i, selPhoto.src))}>대표 사진으로</button><span className="hint">후보 사진을 눌러 영상에 넣거나 뺍니다 (최소 1장)</span></div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
};
