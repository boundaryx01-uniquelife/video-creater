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


/* ---------- 목적 한 문장 → 구성(brief) + 문구 ---------- */
const THEME_NAMES = ['sunny', 'mint', 'sky', 'berry', 'autumn'];
export function sanitizeBrief(raw, fb) {
  const sec = Number(raw?.targetSec);
  return { kind: KINDS[raw?.kind] ? raw.kind : fb.kind, tone: TONES[raw?.tone] ? raw.tone : fb.tone, targetSec: Number.isFinite(sec) ? Math.max(20, Math.min(180, Math.round(sec))) : fb.targetSec,
    aspect: raw?.aspect === '9:16' || raw?.aspect === '16:9' ? raw.aspect : fb.aspect, theme: THEME_NAMES.includes(raw?.theme) ? raw.theme : fb.theme, school: clean(raw?.school, 30) || fb.school, klass: clean(raw?.klass, 20) || fb.klass, place: clean(raw?.place, 40) };
}
const normBrief = (b) => ({ kind: KINDS[b?.kind] ? b.kind : 'other', tone: TONES[b?.tone] ? b.tone : 'warm', targetSec: Math.max(20, Math.min(180, Number(b?.targetSec) || 60)), aspect: b?.aspect === '9:16' ? '9:16' : '16:9', theme: THEME_NAMES.includes(b?.theme) ? b.theme : 'sunny', school: clean(b?.school, 30), klass: clean(b?.klass, 20), place: '' });
export function buildComposePrompt(goal, input) {
  const base = buildPrompt(input);
  const sys = base.sys.replace('반드시 아래 JSON만 출력합니다(설명·코드블록 금지):\n', `교사가 한 문장으로 말한 목적을 읽고 영상 구성을 정한 뒤 문구를 씁니다.
구성 값: kind(${Object.keys(KINDS).join('|')}), tone(${Object.keys(TONES).join('|')}), targetSec(영상 길이 초, 20~180, 말이 없으면 60), aspect("16:9" 또는 "9:16", 세로·쇼츠·릴스라고 하면 9:16), theme(${THEME_NAMES.join('|')}: 계절·행사 분위기에 맞게), school·klass·place(문장에 있을 때만, 없으면 빈 문자열).
반드시 아래 JSON만 출력합니다(설명·코드블록 금지). 문구 부분은 draft 안에 넣습니다:\n{"brief":{"kind":"","tone":"","targetSec":60,"aspect":"16:9","theme":"","school":"","klass":"","place":""},"draft":`) + '}';
  return { sys, user: `교사가 말한 목적: ${goal}\n\n${base.user}` };
}

/* ---------- 자연어 수정 주문 → 안전한 작업(op) 목록 ---------- */
const S = (d) => ({ type: 'string', description: d }), I = (d) => ({ type: 'integer', description: d }), CH = I('활동 번호(0부터). 화면의 "2번째 활동"은 1');
export const EDIT_TOOLS = [
  { name: 'setTitle', description: '영상 제목을 바꾼다(줄당 16자 이내, \\n으로 최대 2줄)', input_schema: { type: 'object', properties: { text: S('새 제목') }, required: ['text'] } },
  { name: 'setKicker', description: '제목 위 짧은 문구를 바꾼다(14자 이내)', input_schema: { type: 'object', properties: { text: S('새 문구') }, required: ['text'] } },
  { name: 'setOutro', description: '마무리 장면의 큰 글(title) 또는 감사 인사(message)를 바꾼다', input_schema: { type: 'object', properties: { title: S('큰 글, 12자 이내 최대 2줄'), message: S('인사, 줄당 40자 최대 3줄') } } },
  { name: 'setInfo', description: '학교·학년반·날짜·장소 표시를 바꾼다', input_schema: { type: 'object', properties: { school: S('학교'), klass: S('학년·반'), day: S('날짜'), place: S('장소') } } },
  { name: 'setChapter', description: '한 활동의 이름(title)이나 부제(sub)를 바꾼다', input_schema: { type: 'object', properties: { index: CH, title: S('16자 이내'), sub: S('24자 이내') }, required: ['index'] } },
  { name: 'removeChapter', description: '한 활동을 통째로 뺀다', input_schema: { type: 'object', properties: { index: CH }, required: ['index'] } },
  { name: 'moveChapter', description: '활동 순서를 옮긴다', input_schema: { type: 'object', properties: { from: CH, to: I('옮길 위치(0부터)') }, required: ['from', 'to'] } },
  { name: 'mergeChapters', description: 'index 활동을 바로 앞 활동에 합친다', input_schema: { type: 'object', properties: { index: CH }, required: ['index'] } },
  { name: 'removePhotos', description: '한 활동에서 사진을 뺀다. which: "blurry"(흔들리거나 어두운 사진), "duplicates"(비슷한 사진), "last", "first", 또는 사진 번호 배열(0부터)', input_schema: { type: 'object', properties: { chapter: CH, which: { description: 'blurry|duplicates|last|first 또는 번호 배열' } }, required: ['chapter', 'which'] } },
  { name: 'setCaption', description: '사진 한 장의 자막을 바꾼다(24자 이내). 교사가 문구를 직접 말했을 때만 쓴다', input_schema: { type: 'object', properties: { chapter: CH, photo: I('사진 번호(0부터)'), text: S('자막') }, required: ['chapter', 'photo', 'text'] } },
  { name: 'setQuote', description: '활동 끝에 한마디 장면을 넣는다. 교사가 말한 문장 그대로만 넣고 지어내지 않는다', input_schema: { type: 'object', properties: { chapter: CH, text: S('한마디'), name: S('말한 사람 표시(없으면 빈 문자열)') }, required: ['chapter', 'text'] } },
  { name: 'removeQuote', description: '활동의 한마디 장면을 뺀다', input_schema: { type: 'object', properties: { chapter: CH }, required: ['chapter'] } },
  { name: 'setLength', description: '영상 전체 길이를 맞춘다(초, 20~180). "더 짧게"는 현재의 약 75%, "더 길게"는 약 130%', input_schema: { type: 'object', properties: { seconds: I('목표 길이(초)') }, required: ['seconds'] } },
  { name: 'setPace', description: '장면 넘어가는 속도. "faster" 또는 "slower"', input_schema: { type: 'object', properties: { pace: { type: 'string', enum: ['faster', 'slower'] } }, required: ['pace'] } },
  { name: 'setTheme', description: '색 테마: sunny(노랑·코랄, 밝음) mint(초록, 봄) sky(파랑, 차분·여름) berry(분홍·보라) autumn(주황·갈색, 가을)', input_schema: { type: 'object', properties: { theme: { type: 'string', enum: THEME_NAMES } }, required: ['theme'] } },
  { name: 'setStats', description: '"오늘의 기록" 숫자 장면을 넣거나 뺀다', input_schema: { type: 'object', properties: { show: { type: 'boolean' } }, required: ['show'] } },
  { name: 'setAspect', description: '화면 비율: "16:9"(가로) 또는 "9:16"(세로)', input_schema: { type: 'object', properties: { aspect: { type: 'string', enum: ['16:9', '9:16'] } }, required: ['aspect'] } },
];
const OP_NAMES = new Set(EDIT_TOOLS.map((t) => t.name));
/** 모델이 돌려준 작업 검증: 목록에 있는 이름만, 값은 기본 형으로만 통과시킨다(실제 범위 검사는 화면 쪽 applyOps가 한 번 더 한다) */
export function validateOps(blocks) {
  const ops = [];
  for (const b of blocks ?? []) {
    if (b?.type !== 'tool_use' || !OP_NAMES.has(b.name) || !b.input || typeof b.input !== 'object') continue;
    const o = { op: b.name };
    for (const [k, v] of Object.entries(b.input)) {
      if (typeof v === 'string') o[k] = v.slice(0, 300); else if (typeof v === 'number' && Number.isFinite(v)) o[k] = v; else if (typeof v === 'boolean') o[k] = v;
      else if (Array.isArray(v) && v.every((x) => Number.isInteger(x))) o[k] = v.slice(0, 200);
    }
    ops.push(o); if (ops.length >= 20) break;
  }
  return ops;
}
const normState = (st) => ({ title: clean(st?.title, 40), kicker: clean(st?.kicker, 20), theme: clean(st?.theme, 10), pace: Number(st?.pace) || 1, seconds: Number(st?.seconds) || 0, aspect: st?.aspect === '9:16' ? '9:16' : '16:9', stats: !!st?.stats,
  info: { school: clean(st?.info?.school, 30), klass: clean(st?.info?.klass, 20), day: clean(st?.info?.day, 24), place: clean(st?.info?.place, 40) }, outro: { title: clean(st?.outro?.title, 30), message: clean(st?.outro?.message, 130) },
  chapters: (Array.isArray(st?.chapters) ? st.chapters : []).slice(0, 12).map((c, i) => ({ index: i, title: clean(c?.title, 20), sub: clean(c?.sub, 26), photos: Number(c?.photos) || 0, quote: !!c?.quote })) });
const EDIT_SYS = `당신은 초등학교 교사가 만든 활동 영상을 말로 고쳐 주는 편집 도우미입니다. 교사의 주문을 읽고 제공된 도구만 호출해 영상을 고칩니다.
- 주문에 해당하는 도구를 필요한 만큼 호출합니다. 주문하지 않은 것은 바꾸지 않습니다.
- 학생 이름, 누군가의 말, 입력에 없는 사실을 지어내지 않습니다. 문구를 새로 써 달라는 주문이면 쉬운 말로 짧게 씁니다.
- 도구로 할 수 없는 주문(사진 내용 보정, 음악 선택, 글꼴 변경 등)은 도구를 호출하지 말고 할 수 없다고 한 문장으로 답합니다.
- 마지막에 무엇을 바꿨는지 한국어 한 문장으로 답합니다.`;

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
      if (p === '/api/ai/compose' && req.method === 'POST') {
        const j = JSON.parse((await body(req, 2e5)).toString('utf8')), goal = clean(j.goal, 400), fb = normBrief(j.brief);
        const input = normalizeInput({ ...j, kind: fb.kind, tone: fb.tone, keywords: j.keywords ?? '', school: j.school || fb.school, klass: j.klass || fb.klass });
        const template = (warning) => send(res, 200, { source: 'template', brief: fb, draft: fallbackDraft(input), warning });
        if (!key()) return template();
        const { sys, user } = buildComposePrompt(goal, input), ac = new AbortController(), t = setTimeout(() => ac.abort(), 60e3);
        try {
          const r = await fetch(`${base()}/v1/messages`, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': key(), 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model(), max_tokens: 1500, system: sys, messages: [{ role: 'user', content: user }] }) });
          const jj = await r.json().catch(() => ({}));
          if (!r.ok) return template(r.status === 401 ? 'API 키가 올바르지 않아 기본 구성으로 만들었습니다.' : `AI 요청이 실패해(${r.status}) 기본 구성으로 만들었습니다.`);
          const text = (jj.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(''), m = text.match(/\{[\s\S]*\}/); let raw = null; try { raw = m ? JSON.parse(m[0]) : null; } catch { /* 기본 구성 */ }
          if (!raw?.draft) return template('AI 응답을 읽지 못해 기본 구성으로 만들었습니다.');
          const brief = sanitizeBrief(raw.brief, fb);
          return send(res, 200, { source: 'ai', model: model(), brief, draft: sanitizeDraft(raw.draft, { ...input, kind: brief.kind }) });
        } catch (e) { return template(e?.name === 'AbortError' ? 'AI 응답이 늦어 기본 구성으로 만들었습니다.' : '인터넷에 연결하지 못해 기본 구성으로 만들었습니다.'); }
        finally { clearTimeout(t); }
      }
      if (p === '/api/ai/edit' && req.method === 'POST') {
        const j = JSON.parse((await body(req, 2e5)).toString('utf8')), text = clean(j.text, 500), state = normState(j.state);
        if (!text) return send(res, 400, { error: '주문 내용이 비어 있습니다.' });
        if (!key()) return send(res, 200, { source: 'rules' }); // 화면 쪽 규칙 해석기가 처리
        const ac = new AbortController(), t = setTimeout(() => ac.abort(), 60e3);
        try {
          const r = await fetch(`${base()}/v1/messages`, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': key(), 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: model(), max_tokens: 1500, system: EDIT_SYS, tools: EDIT_TOOLS, messages: [{ role: 'user', content: `현재 영상 상태(JSON):\n${JSON.stringify(state)}\n\n교사의 주문: ${text}` }] }) });
          const jj = await r.json().catch(() => ({}));
          if (!r.ok) return send(res, 200, { source: 'rules', warning: r.status === 401 ? 'API 키가 올바르지 않아 기본 해석으로 처리했습니다.' : `AI 요청이 실패해(${r.status}) 기본 해석으로 처리했습니다.` });
          return send(res, 200, { source: 'ai', ops: validateOps(jj.content), message: clean((jj.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(' '), 300) });
        } catch (e) { return send(res, 200, { source: 'rules', warning: e?.name === 'AbortError' ? 'AI 응답이 늦어 기본 해석으로 처리했습니다.' : '인터넷에 연결하지 못해 기본 해석으로 처리했습니다.' }); }
        finally { clearTimeout(t); }
      }
    } catch (e) { return send(res, 500, { error: String(e?.message ?? e) }); }
    return next();
  });
}
