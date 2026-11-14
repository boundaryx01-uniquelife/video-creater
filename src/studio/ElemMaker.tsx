import React, { useEffect, useRef, useState } from 'react';
import type { PhotoSpec } from '../analysis/videoData.ts';
import { ACCEPT } from './image.ts';
import { assignByGaps, importPhotos, importSummary } from './util.ts';
import { curate, secondsOf } from '../elem/curate.ts';
import { timeNames } from '../elem/arrange.ts';
import { applyOps, stateSummary, type Op } from '../elem/ops.ts';
import { parseEdit, parseGoal } from '../elem/rules.ts';
import type { ElemProps } from '../elem/types.ts';

const HM = /^\d{1,2}:\d{2}$/;
const api = async (url: string, init?: RequestInit) => { const r = await fetch(url, init), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `요청 실패(${r.status})`); return j; };
const post = (url: string, body: unknown) => api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const isSample = (s: string) => /^\/?media\//.test(s);

/** 활동마다 사진 수와 촬영 시각 범위(AI에 보내는 것은 이 숫자와 시각뿐, 사진은 보내지 않는다) */
const summarize = (chapters: ElemProps['chapters']) => chapters.map((c) => {
  const ts = c.photos.map((p) => (HM.test(p.time) ? p.time : '')).filter(Boolean).sort();
  return { photos: c.photos.length, range: ts.length ? (ts[0] === ts[ts.length - 1] ? ts[0] : `${ts[0]}–${ts[ts.length - 1]}`) : '' };
});
type Turn = { text: string; done: string[]; skipped: string[]; unmatched: string[]; ai: boolean; message?: string };
const EXAMPLES = ['더 짧게 해줘', '세로 영상으로 바꿔줘', '색을 파란색으로', '2번째 활동 빼줘', '제목을 "…"로 바꿔줘', '비슷한 사진 정리해줘'];

export const ElemMaker: React.FC<{ props: ElemProps; setProps: (p: any) => void; setNote: (s: string) => void; setBusy: (s: string) => void; aspect: string; setAspect: (a: '16:9' | '9:16') => void; undo: () => void }> = ({ props, setProps, setNote, setBusy, aspect, setAspect, undo }) => {
  const [goal, setGoal] = useState(() => { try { return localStorage.getItem('studio:elem:goal') ?? ''; } catch { return ''; } }), [acts, setActs] = useState('');
  const [files, setFiles] = useState<File[]>([]), [working, setWorking] = useState(false), [summary, setSummary] = useState(''), [note2, setNote2] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]), [cmd, setCmd] = useState(''), [err, setErr] = useState(''), fileRef = useRef<HTMLInputElement>(null);
  const [st, setSt] = useState<{ configured: boolean; key: string; fromEnv: boolean } | null>(null), [key, setKey] = useState('');
  useEffect(() => { api('/api/ai/status').then(setSt).catch(() => setSt(null)); }, []);
  useEffect(() => { try { localStorage.setItem('studio:elem:goal', goal); } catch { /* 무시 */ } }, [goal]);
  const hasReal = props.chapters.some((c) => c.photos.some((p) => !isSample(p.src)));

  /** 1차 완성: 사진 가져오기 → 활동 나누기 → 비슷한·흐린 사진 정리 → 길이 맞추기 → 문구·색 정하기 */
  const build = async () => {
    setWorking(true); setErr(''); setSummary('');
    try {
      const rule = parseGoal(goal); let base: ElemProps = props, imported = '';
      if (files.length) {
        setBusy(`사진 처리 중… 0/${files.length}`);
        const r = await importPhotos(files, 'time', (d, t) => setBusy(`사진 처리 중… ${d}/${t}`)); setBusy('');
        if (!r.photos.length) throw new Error(importSummary(r) || '가져온 사진이 없습니다.');
        base = assignByGaps(props, r.photos).props as ElemProps; imported = importSummary(r);
      } else if (!hasReal) throw new Error('먼저 사진을 골라 주세요.');
      const total0 = base.chapters.reduce((a, c) => a + c.photos.length, 0);
      const keywords = acts.split(/[,\n]+/).map((x) => x.trim()).filter(Boolean);
      const c1 = curate({ ...base, pace: 1 }, rule.targetSec);
      const r = await post('/api/ai/compose', { goal, brief: rule, keywords: keywords.join(', '), school: rule.school || (base.school === '새싹초등학교' ? '' : base.school), klass: rule.klass || (base.school === '새싹초등학교' ? '' : base.klass), day: base.day, place: base.school === '새싹초등학교' ? '' : base.place, chapters: summarize(c1.props.chapters) });
      const b = r.brief, d = r.draft, ai = r.source === 'ai';
      const fitted = b.targetSec !== rule.targetSec ? curate({ ...base, pace: 1 }, b.targetSec) : c1, names = !ai && !keywords.length ? timeNames(fitted.props.chapters.map((c) => c.photos)) : null;
      const next: ElemProps = { ...fitted.props, theme: b.theme, kicker: d.kicker, title: d.title, outro: d.outro,
        school: b.school || (base.school === '새싹초등학교' ? '우리 학교' : base.school), klass: b.klass || (base.school === '새싹초등학교' ? '' : base.klass), place: b.place || (base.school === '새싹초등학교' ? '' : base.place),
        chapters: fitted.props.chapters.map((c, i) => ({ ...c, title: names ? names[i] : d.chapters[i]?.title || c.title, sub: d.chapters[i]?.sub || c.sub })),
        stats: [{ label: '남긴 사진', n: fitted.props.chapters.reduce((a, c) => a + c.photos.length, 0), unit: '장' }, { label: '함께한 활동', n: fitted.props.chapters.length, unit: '가지' }] };
      setProps(next); setAspect(b.aspect); setNote2(d.parentNote ?? ''); setTurns([]); setFiles([]);
      const L = fitted.log, kept = next.chapters.reduce((a, c) => a + c.photos.length, 0);
      setSummary([`사진 ${total0}장 → 활동 ${next.chapters.length}개, ${kept}장 사용`, L.dup ? `비슷한 사진 ${L.dup}장 정리` : '', L.blur ? `흐린 사진 ${L.blur}장 제외` : '', L.trimmed ? `길이에 맞춰 ${L.trimmed}장 제외` : '', `약 ${Math.round(secondsOf(next))}초`, b.aspect === '9:16' ? '세로' : '가로', ai ? 'AI가 구성·문구 작성' : '기본 규칙으로 구성'].filter(Boolean).join(' · '));
      setNote([r.warning, imported].filter(Boolean).join(' · ') || '영상을 만들었습니다. 오른쪽에서 확인하고, 고칠 점은 말로 주문하세요.');
    } catch (e) { setErr((e as Error).message); setBusy(''); } finally { setWorking(false); }
  };

  /** 말로 고치기: AI(있으면) 또는 규칙 해석기가 주문을 "안전한 작업" 목록으로 바꾸고, 그 작업만 적용한다 */
  const edit = async (text: string) => {
    const t = text.trim(); if (!t || working) return; setWorking(true); setErr('');
    try {
      const sum = stateSummary(props, aspect); let ops: Op[] = [], unmatched: string[] = [], ai = false, message = '';
      const r = await post('/api/ai/edit', { text: t, state: sum }).catch(() => ({ source: 'rules' }));
      if (r.source === 'ai') { ops = r.ops ?? []; ai = true; message = r.message ?? ''; } else { const x = parseEdit(t, sum as any); ops = x.ops; unmatched = x.unmatched; if (r.warning) setNote(r.warning); }
      const res = applyOps(props, ops);
      if (res.done.length) { setProps(res.props); if (res.aspect) setAspect(res.aspect); }
      setTurns((a) => [...a, { text: t, done: res.done, skipped: res.skipped, unmatched, ai, message }].slice(-8)); setCmd('');
    } catch (e) { setErr((e as Error).message); } finally { setWorking(false); }
  };
  const saveKey = async () => { try { setSt({ ...(st as any), ...(await post('/api/ai/key', { key })) }); setKey(''); setErr(''); } catch (e) { setErr((e as Error).message); } };
  const delKey = async () => { try { await api('/api/ai/key', { method: 'DELETE' }); setSt(await api('/api/ai/status')); } catch (e) { setErr((e as Error).message); } };

  return (
    <section className="maker" data-testid="elem-maker">
      <div className="mk-step"><b>1</b> 사진을 넣고, 어떤 영상인지 말해 주세요</div>
      <div className="mk-row">
        <button type="button" onClick={() => fileRef.current?.click()} data-testid="mk-pick">{files.length ? `사진 ${files.length}장 선택됨` : hasReal ? '사진 다시 고르기' : '사진 고르기'}</button>
        <input ref={fileRef} data-testid="mk-files" type="file" accept={ACCEPT} multiple hidden onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <span className="hint">{files.length ? '아래 문장을 쓰고 "영상 만들기"를 누르세요.' : hasReal ? '지금 사진 그대로 다시 만들 수도 있습니다.' : '행사 사진을 한꺼번에 고르세요(순서 상관없음).'}</span>
      </div>
      <textarea data-testid="mk-goal" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="예) 새싹초 3학년 2반 5월 박물관 현장체험학습 영상이야. 학부모님께 보낼 거라 밝고 따뜻하게, 1분 정도로." />
      <input data-testid="mk-acts" value={acts} onChange={(e) => setActs(e.target.value)} placeholder="(선택) 활동 순서: 박물관 관람, 도시락 점심, 토기 만들기" />
      <button type="button" className="primary" data-testid="mk-build" onClick={build} disabled={working || (!files.length && !hasReal)}>{working ? '만드는 중…' : '영상 만들기'}</button>
      <div className="hint">학생 이름·개인정보는 적지 마세요. {st?.configured ? '문장과 사진의 촬영 시각·장수만 AI로 보내고, 사진은 보내지 않습니다.' : 'AI 연결 전에는 기본 규칙으로 만듭니다(사진·문장 모두 이 컴퓨터 안에서만 처리).'}</div>
      {summary && <div className="mk-sum" role="status" data-testid="mk-summary">{summary}</div>}
      {err && <div className="hint warnline" role="alert">{err}</div>}

      <div className="mk-step"><b>2</b> 고칠 점을 말로 주문하세요</div>
      {turns.length > 0 && <ul className="mk-turns" data-testid="mk-turns" aria-live="polite">{turns.map((t, i) => (
        <li key={i}><div className="q">{t.text}</div>
          {t.done.map((d, k) => <div className="a ok" key={k}>✓ {d}</div>)}
          {t.skipped.map((d, k) => <div className="a no" key={'s' + k}>– {d}</div>)}
          {t.unmatched.map((d, k) => <div className="a no" key={'u' + k}>? “{d}”는 이해하지 못했어요</div>)}
          {!t.done.length && !t.skipped.length && !t.unmatched.length && <div className="a no">{t.message || '바꿀 수 있는 것을 찾지 못했어요.'}</div>}
        </li>))}</ul>}
      <form className="mk-row" onSubmit={(e) => { e.preventDefault(); edit(cmd); }}>
        <input data-testid="mk-cmd" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="예) 점심 부분은 빼고 40초로 줄여줘" disabled={working} />
        <button type="submit" className="primary" data-testid="mk-send" disabled={working || !cmd.trim()}>고치기</button>
        <button type="button" onClick={undo} title="방금 고친 것을 되돌립니다">↶ 되돌리기</button>
      </form>
      <div className="mk-chips">{EXAMPLES.map((x) => <button type="button" key={x} onClick={() => (x.includes('…') ? setCmd(x) : edit(x))} disabled={working}>{x}</button>)}</div>

      {note2 && <label className="mk-note">학부모 안내 글 (클래스팅·알림장에 붙여넣기)<textarea rows={4} readOnly value={note2} onFocus={(e) => e.currentTarget.select()} /><button type="button" onClick={() => navigator.clipboard?.writeText(note2).then(() => setNote('안내 글을 복사했습니다.'))}>복사</button></label>}
      <details className="ai-key"><summary>AI 연결 설정 {st?.configured ? `· 연결됨 ${st.key}` : '· 연결 안 됨(기본 규칙으로 동작)'}</summary>
        <div className="hint">Anthropic API 키를 넣으면 목적 문장과 수정 주문을 AI(Claude)가 이해합니다. 키는 이 컴퓨터에만 저장됩니다. 전송되는 것은 입력한 글, 활동 이름, 촬영 시각·사진 장수이고 사진은 전송하지 않습니다. 학교의 개인정보·외부 서비스 이용 지침을 먼저 확인하세요.</div>
        {st?.fromEnv ? <div className="hint">환경 변수 ANTHROPIC_API_KEY를 사용 중입니다.</div> : <div className="mk-row"><input type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} /><button type="button" onClick={saveKey} disabled={!key}>키 저장</button>{st?.configured && <button type="button" className="ghost" onClick={delKey}>키 삭제</button>}</div>}
      </details>
    </section>
  );
};
export type { PhotoSpec };
