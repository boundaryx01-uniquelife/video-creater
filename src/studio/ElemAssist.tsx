import React, { useEffect, useState } from 'react';

const KINDS: [string, string][] = [['field', '현장체험학습'], ['sports', '운동회'], ['talent', '학예회'], ['open', '공개수업'], ['class', '학급 행사'], ['year', '학년 말 추억'], ['other', '그 밖의 행사']];
const TONES: [string, string][] = [['warm', '따뜻하게'], ['lively', '발랄하게'], ['calm', '담백하게']];
const HM = /^\d{1,2}:\d{2}$/;
const api = async (url: string, init?: RequestInit) => { const r = await fetch(url, init), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `요청 실패(${r.status})`); return j; };

/** 챕터마다 사진 수와 촬영 시각 범위를 뽑는다(문구 초안에 보내는 것은 이 숫자와 시각뿐, 사진은 보내지 않는다) */
const summarize = (chapters: any[]) => chapters.map((c) => {
  const ts = (c.photos ?? []).map((p: any) => (HM.test(p.time) ? p.time : HM.test(p.cap?.chip) ? p.cap.chip : '')).filter(Boolean).sort();
  return { photos: (c.photos ?? []).length, range: ts.length ? (ts[0] === ts[ts.length - 1] ? ts[0] : `${ts[0]}–${ts[ts.length - 1]}`) : '' };
});

export const ElemAssist: React.FC<{ props: any; setProps: (f: (p: any) => any) => void; setNote: (s: string) => void }> = ({ props, setProps, setNote }) => {
  const [kind, setKind] = useState('field'), [tone, setTone] = useState('warm'), [kw, setKw] = useState(''), [busy, setBusy] = useState(false);
  const [st, setSt] = useState<{ configured: boolean; key: string; model: string; fromEnv: boolean } | null>(null), [key, setKey] = useState(''), [res, setRes] = useState<{ source: string; warning?: string; parentNote: string } | null>(null), [err, setErr] = useState('');
  useEffect(() => { api('/api/ai/status').then(setSt).catch(() => setSt(null)); }, []);
  const make = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api('/api/ai/draft', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, tone, keywords: kw, school: props.school, klass: props.klass, day: props.day, place: props.place, chapters: summarize(props.chapters) }) });
      const d = r.draft;
      setProps((p: any) => ({ ...p, kicker: d.kicker, title: d.title, outro: d.outro, chapters: p.chapters.map((c: any, i: number) => ({ ...c, title: d.chapters[i]?.title || c.title, sub: d.chapters[i]?.sub || c.sub })) }));
      setRes({ source: r.source, warning: r.warning, parentNote: d.parentNote });
      setNote(r.source === 'ai' ? '문구 초안을 적용했습니다. 마음에 들지 않으면 ↶ 취소로 되돌리세요.' : (r.warning ?? '기본 문구 초안을 적용했습니다.'));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const saveKey = async () => { try { setSt({ ...(st as any), ...(await api('/api/ai/key', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) })) }); setKey(''); setErr(''); } catch (e) { setErr((e as Error).message); } };
  const delKey = async () => { try { await api('/api/ai/key', { method: 'DELETE' }); setSt(await api('/api/ai/status')); } catch (e) { setErr((e as Error).message); } };
  return (
    <details className="sec elem-assist" open data-testid="elem-assist">
      <summary>문구 초안 도우미</summary>
      <div className="body">
        <label>행사 종류<select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <label>말투<select value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <label>오늘 한 일 (활동 순서대로, 쉼표 또는 줄바꿈)<textarea rows={3} value={kw} placeholder="예) 박물관 관람, 도시락 점심, 토기 만들기" onChange={(e) => setKw(e.target.value)} /></label>
        <div className="hint">위의 학교·학년반·날짜·장소와 아래 사진의 촬영 시각·장수를 함께 씁니다. <b>학생 이름이나 개인정보는 적지 마세요.</b> 사진 자체는 보내지 않습니다.</div>
        <button type="button" className="primary" onClick={make} disabled={busy}>{busy ? '만드는 중…' : st?.configured ? 'AI로 문구 초안 만들기' : '문구 초안 만들기 (기본 문구)'}</button>
        {st && !st.configured && <div className="hint">AI(Claude) 연결 전에는 입력한 내용으로 만든 기본 문구가 적용됩니다. 아래에서 API 키를 넣으면 AI가 더 자연스럽게 써 줍니다.</div>}
        {res?.warning && <div className="hint warnline" role="status">{res.warning}</div>}
        {err && <div className="hint warnline" role="alert">{err}</div>}
        {res?.parentNote && <label>학부모 안내 글 (클래스팅·알림장에 붙여넣기)<textarea rows={5} readOnly value={res.parentNote} onFocus={(e) => e.currentTarget.select()} /><button type="button" onClick={() => navigator.clipboard?.writeText(res.parentNote).then(() => setNote('안내 글을 복사했습니다.'))}>복사</button></label>}
        <details className="ai-key"><summary>AI 연결 설정 {st?.configured ? `· 연결됨 ${st.key}` : '· 연결 안 됨'}</summary>
          <div className="hint">Anthropic API 키는 이 컴퓨터에만 저장되고 화면에는 다시 표시되지 않습니다. 문구 초안을 만들 때 위 입력 내용(글·시각·사진 수)이 Anthropic 서버로 전송됩니다. 학교의 개인정보·외부 서비스 이용 지침을 먼저 확인하세요.</div>
          {st?.fromEnv ? <div className="hint">환경 변수 ANTHROPIC_API_KEY를 사용 중입니다.</div> : <>
            <input type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
            <button type="button" onClick={saveKey} disabled={!key}>키 저장</button>{st?.configured && <button type="button" className="ghost" onClick={delKey}>키 삭제</button>}</>}
        </details>
      </div>
    </details>
  );
};
