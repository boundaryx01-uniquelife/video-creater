// 초등 활동 영상 문구 초안(AI). 보내는 것은 교사가 입력한 글(행사 종류·키워드)과 시각·사진 수뿐이다 — 사진 파일, 파일 이름, 얼굴 정보는 보내지 않는다.
// API 키가 없으면 규칙 기반 초안으로 대신한다. 키는 이 PC의 .studio/ai.json 에만 저장되고 화면으로는 돌려주지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const KINDS = {
  field: { name: '현장체험학습', tone: '설렘과 배움', chapter: ['출발과 도착', '함께 둘러보기', '체험 활동', '점심 시간', '돌아오는 길'] },
  sports: { name: '운동회', tone: '응원과 땀방울', chapter: ['입장과 준비 운동', '달리기와 줄다리기', '응원 열기', '마무리와 시상'] },
  talent: { name: '학예회', tone: '떨림과 박수', chapter: ['무대 준비', '우리 반 공연', '다른 반 공연', '함께 부르는 마지막 무대'] },
  open: { name: '공개수업', tone: '배움과 성장', chapter: ['수업 시작', '함께 배우기', '발표와 나눔'] },
  class: { name: '학급 행사', tone: '웃음과 추억', chapter: ['준비', '활동', '마무리'] },
  year: { name: '학년 말 추억 영상', tone: '함께한 한 해', chapter: ['봄', '여름', '가을', '겨울'] },
  other: { name: '학교 행사', tone: '함께한 하루', chapter: ['시작', '활동', '마무리'] },
};
const TONES = { warm: '따뜻하고 차분한', lively: '밝고 발랄한', calm: '담백하고 단정한' };
const cut = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return [...t].length > n ? [...t].slice(0, n).join('') : t; };
const clean = (s, n) => cut(String(s ?? '').replace(/[<>]/g, ''), n);

/** 입력 정리: 길이 제한과 개수 제한(모델 비용·악용 방지) */
export function normalizeInput(j) {
  const kind = KINDS[j.kind] ? j.kind : 'other';
  const chapters = (Array.isArray(j.chapters) ? j.chapters : []).slice(0, 8).map((c) => ({ photos: Math.max(0, Math.min(200, Number(c?.photos) || 0)), range: clean(c?.range, 20) }));
  return { kind, school: clean(j.school, 30), klass: clean(j.klass, 20), day: clean(j.day, 24), place: clean(j.place, 40), keywords: clean(j.keywords, 600), tone: TONES[j.tone] ? j.tone : 'warm', chapters: chapters.length ? chapters : [{ photos: 0, range: '' }] };
}

/** 모델 응답 검증·정리: 길이를 넘기거나 빠진 값은 기본값으로 채운다. 한 아이의 말을 지어내지 않도록 인용문은 아예 받지 않는다 */
export function sanitizeDraft(raw, input) {
  const k = KINDS[input.kind], n = input.chapters.length, ch = Array.isArray(raw?.chapters) ? raw.chapters : [];
  return {
    kicker: clean(raw?.kicker, 14) || '오늘의 기록',
    title: String(raw?.title ?? '').split('\n').slice(0, 2).map((x) => clean(x, 14)).filter(Boolean).join('\n') || k.name,
    chapters: Array.from({ length: n }, (_, i) => ({ title: clean(ch[i]?.title, 14) || k.chapter[i % k.chapter.length], sub: clean(ch[i]?.sub, 22) || input.chapters[i].range })),
    outro: { title: String(raw?.outro?.title ?? '').split('\n').slice(0, 2).map((x) => clean(x, 10)).filter(Boolean).join('\n') || '오늘도\n수고했어요!', message: String(raw?.outro?.message ?? '').split('\n').slice(0, 3).map((x) => clean(x, 36)).filter(Boolean).join('\n') || '함께해 주셔서 감사합니다.' },
    parentNote: clean(raw?.parentNote, 500),
  };
}

/** 키가 없을 때의 초안: 키워드를 활동 순서로 쓰고, 나머지는 행사 종류별 문구 */
export function fallbackDraft(input) {
  const k = KINDS[input.kind], acts = input.keywords.split(/[,\n、·]+/).map((x) => x.trim()).filter(Boolean), n = input.chapters.length;
  const when = input.day ? `${input.day} ` : '', who = [input.school, input.klass].filter(Boolean).join(' ');
  return sanitizeDraft({
    kicker: input.day ? input.day.slice(0, 4) : '오늘의 기록', title: input.place ? `${k.name}\n${input.place}` : k.name,
    chapters: Array.from({ length: n }, (_, i) => ({ title: acts[i] ?? k.chapter[i % k.chapter.length], sub: input.chapters[i].range })),
    outro: { title: '오늘도\n수고했어요!', message: `${k.tone}을 담은 하루였어요.\n함께해 주신 모든 분께 감사드립니다.` },
    parentNote: `[${k.name} 안내] ${when}${who ? who + ' ' : ''}${k.name}${input.place ? ` (${input.place})` : ''} 영상을 올립니다. ${acts.length ? acts.slice(0, 4).join(', ') + ' 등의 활동을 했습니다. ' : ''}아이들의 모습을 함께 봐 주세요. 학생 사진이 포함되어 있으니 학교 밖으로 공유하지 말아 주세요.`,
  }, input);
}

export function buildPrompt(input) {
  const k = KINDS[input.kind];
  const sys = `당신은 초등학교 교사를 돕는 한국어 카피라이터입니다. 학부모와 학생이 보는 활동 영상의 문구를 ${TONES[input.tone]} 말투로 짧게 씁니다.
규칙:
- 입력에 없는 사실(장소·인원·음식·날씨·구체적인 일화)을 지어내지 않습니다. 모르면 일반적인 표현만 씁니다.
- 학생·교사의 이름, 개인정보, 누군가의 말(인용)을 만들지 않습니다.
- 과장·유행어·이모지를 쓰지 않고 초등학생이 읽을 수 있는 쉬운 말을 씁니다.
- 글자 수 제한을 지킵니다.
반드시 아래 JSON만 출력합니다(설명·코드블록 금지):
{"kicker":"상단 짧은 문구(14자 이내)","title":"영상 제목(14자 이내, 줄바꿈 \\n 으로 최대 2줄)","chapters":[{"title":"활동 이름(14자 이내)","sub":"부제(22자 이내)"}],"outro":{"title":"마무리 큰 글(10자 이내, 최대 2줄)","message":"감사 인사(줄당 36자 이내, 최대 3줄)"},"parentNote":"학부모 안내 글(공유 앱에 붙여 넣을 용도, 500자 이내, 사진 속 아이들 개인정보 보호 문구 포함)"}`;
  const user = [`행사 종류: ${k.name}`, input.school && `학교: ${input.school}`, input.klass && `학년·반: ${input.klass}`, input.day && `날짜: ${input.day}`, input.place && `장소: ${input.place}`,
    `교사가 적은 내용: ${input.keywords || '(없음)'}`, `활동 구간 ${input.chapters.length}개(시간순, chapters 배열을 같은 개수로 채울 것):`,
    ...input.chapters.map((c, i) => `  ${i + 1}. ${c.range || '시각 정보 없음'} · 사진 ${c.photos}장`)].filter(Boolean).join('\n');
  return { sys, user };
}

export function aiApi(server, { send, body, dataDir }) {
  const file = path.join(dataDir, 'ai.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
  const key = () => process.env.ANTHROPIC_API_KEY || read().key || '';
  const model = () => process.env.AI_MODEL || read().model || 'claude-sonnet-5-5';
  const base = () => (process.env.ANTHROPIC_API_BASE || 'https://api.anthropic.com').replace(/\/$/, '');
  const mask = (k) => (k ? `…${k.slice(-4)}` : '');
  server.middlewares.use(async (req, res, next) => {
    const p = new URL(req.url, 'http://local').pathname;
    if (!p.startsWith('/api/ai/')) return next();
    try {
      if (p === '/api/ai/status' && req.method === 'GET') return send(res, 200, { configured: !!key(), key: mask(key()), model: model(), fromEnv: !!process.env.ANTHROPIC_API_KEY });
      if (p === '/api/ai/key' && req.method === 'POST') {
        const j = JSON.parse((await body(req, 1e4)).toString('utf8')), k = String(j.key ?? '').trim();
        if (!/^sk-ant-[\w-]{20,}$/.test(k)) return send(res, 400, { error: 'Anthropic API 키 형식이 아닙니다(sk-ant-…).' });
        fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ ...read(), key: k }), { mode: 0o600 }); return send(res, 200, { configured: true, key: mask(k) });
      }
      if (p === '/api/ai/key' && req.method === 'DELETE') { const r = read(); delete r.key; fs.writeFileSync(file, JSON.stringify(r), { mode: 0o600 }); return send(res, 200, { configured: !!process.env.ANTHROPIC_API_KEY }); }
      if (p === '/api/ai/draft' && req.method === 'POST') {
        const input = normalizeInput(JSON.parse((await body(req, 2e5)).toString('utf8')));
        if (!key()) return send(res, 200, { source: 'template', draft: fallbackDraft(input) });
        const { sys, user } = buildPrompt(input);
        const ac = new AbortController(), t = setTimeout(() => ac.abort(), 60e3);
        try {
          const r = await fetch(`${base()}/v1/messages`, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': key(), 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model(), max_tokens: 1200, system: sys, messages: [{ role: 'user', content: user }] }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) return send(res, 200, { source: 'template', draft: fallbackDraft(input), warning: r.status === 401 ? 'API 키가 올바르지 않아 기본 문구로 만들었습니다.' : `AI 요청이 실패해(${r.status}) 기본 문구로 만들었습니다.` });
          const text = (j.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('');
          const m = text.match(/\{[\s\S]*\}/); let raw = null; try { raw = m ? JSON.parse(m[0]) : null; } catch { /* 아래에서 기본 문구 */ }
          if (!raw) return send(res, 200, { source: 'template', draft: fallbackDraft(input), warning: 'AI 응답을 읽지 못해 기본 문구로 만들었습니다.' });
          return send(res, 200, { source: 'ai', model: model(), draft: sanitizeDraft(raw, input) });
        } catch (e) { return send(res, 200, { source: 'template', draft: fallbackDraft(input), warning: e?.name === 'AbortError' ? 'AI 응답이 늦어 기본 문구로 만들었습니다.' : '인터넷에 연결하지 못해 기본 문구로 만들었습니다.' }); }
        finally { clearTimeout(t); }
      }
    } catch (e) { return send(res, 500, { error: String(e?.message ?? e) }); }
    return next();
  });
}
