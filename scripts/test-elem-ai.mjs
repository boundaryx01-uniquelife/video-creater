// 초등 영상 문구 초안(studio/ai.mjs) 검증: 가짜 Anthropic 서버로 요청 내용·응답 정리·실패 대체를 확인한다. 실제 API는 호출하지 않는다.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { aiApi } from '../studio/ai.mjs';

let pass = 0, fail = 0; const ok = (name, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${name}${d ? ' — ' + d : ''}`); };
const mock = { mode: 'good', seen: [] };
const upstream = http.createServer((req, res) => { const ch = []; req.on('data', (c) => ch.push(c)); req.on('end', () => {
  mock.seen.push({ headers: req.headers, body: JSON.parse(Buffer.concat(ch).toString() || '{}'), url: req.url });
  if (mock.mode === '401') { res.statusCode = 401; return res.end(JSON.stringify({ error: 'x' })); }
  if (mock.mode === 'hang') return; // 응답 없음
  const req0 = mock.seen[mock.seen.length - 1].body;
  if (req0.tools) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ content: [{ type: 'text', text: '제목을 바꾸고 세로로 했어요.' }, { type: 'tool_use', id: 't1', name: 'setTitle', input: { text: '새 제목' } }, { type: 'tool_use', id: 't2', name: 'setAspect', input: { aspect: '9:16' } }, { type: 'tool_use', id: 't3', name: 'deleteEverything', input: {} }, { type: 'tool_use', id: 't4', name: 'removePhotos', input: { chapter: 0, which: [0, 1] } }, { type: 'tool_use', id: 't5', name: 'setChapter', input: { index: 1, title: { evil: 1 } } }] })); }
  if (String(req0.system).includes('"brief"')) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ brief: { kind: 'sports', tone: 'lively', targetSec: 999, aspect: '9:16', theme: 'neon', school: '한빛초등학교', klass: '', place: '운동장' }, draft: { kicker: '2026 가을', title: '가을 운동회', chapters: [{ title: '달리기' }], outro: { title: '잘했어요!', message: '모두 수고했어요.' }, parentNote: '안내' } }) }] })); }
  const text = mock.mode === 'bad' ? '죄송합니다, 만들 수 없습니다.' : JSON.stringify({ kicker: '2026 봄 소풍을 다녀왔어요 정말로', title: '박물관 나들이\n즐거운 하루\n세 번째 줄', chapters: [{ title: '박물관에 도착했어요 모두 함께', sub: '오전 10:00 – 11:30' }, { title: '맛있는 점심' }], outro: { title: '수고했어요!', message: '감사합니다.' }, parentNote: '안내', quote: { text: '지어낸 말', name: '김하늘' } });
  res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ content: [{ type: 'text', text: '```json\n' + text + '\n```' }] }));
}); });
await new Promise((r) => upstream.listen(0, '127.0.0.1', r)); const up = upstream.address().port;
process.env.ANTHROPIC_API_BASE = `http://127.0.0.1:${up}`; delete process.env.ANTHROPIC_API_KEY;

const mws = []; const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-')), send = (res, code, o) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
const body = (req, lim) => new Promise((ok2, no) => { const ch = []; let n = 0; req.on('data', (c) => { n += c.length; if (n > lim) { no(new Error('big')); req.destroy(); } else ch.push(c); }); req.on('end', () => ok2(Buffer.concat(ch))); });
aiApi({ middlewares: { use: (f) => mws.push(f) } }, { send, body, dataDir: dir });
const app = http.createServer((req, res) => { let i = 0; const next = () => { const f = mws[i++]; if (!f) { res.statusCode = 404; return res.end(); } f(req, res, next); }; next(); });
await new Promise((r) => app.listen(0, '127.0.0.1', r)); const port = app.address().port;
const call = async (p, method = 'GET', b) => { const r = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, j: await r.json() }; };
const IN = { kind: 'field', school: '새싹초등학교', klass: '3학년 2반', day: '2026.05.14 (목)', place: '국립중앙박물관', keywords: '박물관 관람, 점심, 토기 만들기', tone: 'warm', chapters: [{ photos: 7, range: '10:05–11:25' }, { photos: 5, range: '12:05–12:45' }, { photos: 6, range: '13:35–14:50' }] };

let r = await call('/api/ai/status'); ok('키 없음 상태', r.j.configured === false);
r = await call('/api/ai/draft', 'POST', IN);
ok('키 없으면 기본 문구(template)', r.j.source === 'template' && r.j.draft.chapters.length === 3 && r.j.draft.chapters[0].title === '박물관 관람' && r.j.draft.chapters[2].title === '토기 만들기', JSON.stringify(r.j.draft.chapters));
ok('기본 문구에 학부모 안내·개인정보 문구', /공유하지 말아/.test(r.j.draft.parentNote) && r.j.draft.parentNote.includes('새싹초등학교'));
ok('기본 문구 요청은 외부로 나가지 않음', mock.seen.length === 0);
r = await call('/api/ai/key', 'POST', { key: 'abc' }); ok('잘못된 키 형식 거절', r.status === 400);
r = await call('/api/ai/key', 'POST', { key: 'sk-ant-api03-TESTKEYTESTKEYTESTKEY1234' }); ok('키 저장 + 마스킹', r.j.configured && r.j.key === '…1234' && !JSON.stringify(r.j).includes('TESTKEY'));
const st = fs.statSync(path.join(dir, 'ai.json')); ok('키 파일 권한 600', (st.mode & 0o777) === 0o600, (st.mode & 0o777).toString(8));
r = await call('/api/ai/status'); ok('상태에서 키 값은 노출되지 않음', r.j.configured && !JSON.stringify(r.j).includes('TESTKEY'));
mock.mode = 'good'; r = await call('/api/ai/draft', 'POST', IN);
const sent = mock.seen[0];
ok('AI 응답 사용(source=ai)', r.j.source === 'ai', r.j.warning);
ok('x-api-key·버전 헤더 전달', sent.headers['x-api-key'].endsWith('1234') && sent.headers['anthropic-version'] === '2023-06-01' && sent.url === '/v1/messages');
const all = JSON.stringify(sent.body);
ok('요청에 이미지·파일 이름·사진 데이터 없음', !/image|base64|\.jpg|\.png|data:/i.test(all));
ok('요청에 교사 입력과 시각·사진 수 포함', all.includes('박물관 관람') && all.includes('10:05–11:25') && all.includes('사진 7장'));
ok('글자 수 제한 적용(제목 줄 14자·2줄)', r.j.draft.title.split('\n').length === 2 && r.j.draft.title.split('\n').every((x) => [...x].length <= 14), r.j.draft.title);
ok('제목·챕터 길이 제한(14자)', [...r.j.draft.kicker].length <= 14 && r.j.draft.chapters.every((c) => [...c.title].length <= 14 && [...c.sub].length <= 22), JSON.stringify(r.j.draft.chapters));
ok('모자란 챕터는 기본값으로 채움(3개)', r.j.draft.chapters.length === 3 && r.j.draft.chapters[2].title.length > 0 && r.j.draft.chapters[1].sub === '12:05–12:45', JSON.stringify(r.j.draft.chapters[1]));
ok('인용문(지어낸 말)은 결과에 없음', !('quote' in r.j.draft) && !JSON.stringify(r.j.draft).includes('지어낸'));
mock.mode = '401'; r = await call('/api/ai/draft', 'POST', IN); ok('401이면 기본 문구 + 안내', r.j.source === 'template' && /키가 올바르지/.test(r.j.warning));
mock.mode = 'bad'; r = await call('/api/ai/draft', 'POST', IN); ok('JSON이 아닌 응답이면 기본 문구', r.j.source === 'template' && /읽지 못해/.test(r.j.warning));
r = await call('/api/ai/draft', 'POST', { ...IN, keywords: 'x'.repeat(5000), chapters: Array.from({ length: 30 }, () => ({ photos: 999999, range: 'y'.repeat(500) })) });
const big = mock.seen[mock.seen.length - 1]; ok('입력 길이·개수 제한(키워드 600자, 구간 8개)', JSON.stringify(big.body).length < 6000 && r.j.draft.chapters.length === 8, String(JSON.stringify(big.body).length));
// ---- 목적 한 문장 → 구성
const FB = { kind: 'field', tone: 'warm', targetSec: 60, aspect: '16:9', theme: 'mint', school: '', klass: '' };
mock.mode = 'good'; r = await call('/api/ai/compose', 'POST', { goal: '가을 운동회 영상 세로로 밝게', brief: FB, day: '2026.10.02', chapters: IN.chapters });
ok('compose: AI 구성 사용', r.j.source === 'ai' && r.j.brief.kind === 'sports' && r.j.brief.aspect === '9:16' && r.j.brief.tone === 'lively', JSON.stringify(r.j.brief));
ok('compose: 범위 밖 값은 제한·대체(길이 180초, 없는 테마는 규칙값)', r.j.brief.targetSec === 180 && r.j.brief.theme === 'mint');
ok('compose: 문구는 구간 수(3)에 맞춰 채움', r.j.draft.chapters.length === 3 && r.j.draft.title === '가을 운동회' && r.j.draft.chapters[0].title === '달리기', JSON.stringify(r.j.draft.chapters));
{ const b = mock.seen[mock.seen.length - 1].body; ok('compose: 요청에 목적 문장 포함, 이미지 없음', JSON.stringify(b).includes('가을 운동회 영상 세로로 밝게') && !/image|base64|\.jpg/i.test(JSON.stringify(b))); }
mock.mode = '401'; r = await call('/api/ai/compose', 'POST', { goal: 'x', brief: FB, chapters: IN.chapters }); ok('compose: 실패하면 규칙 구성 + 기본 문구', r.j.source === 'template' && r.j.brief.kind === 'field' && r.j.draft.chapters.length === 3 && !!r.j.warning);
// ---- 자연어 수정
const STATE = { title: '현장체험학습', kicker: '2026 봄', theme: 'sunny', pace: 1, seconds: 60, aspect: '16:9', stats: true, info: { school: '새싹초등학교', klass: '3학년 2반', day: '', place: '' }, outro: { title: '끝', message: '감사' }, chapters: [{ title: '도착', sub: '', photos: 7, quote: true }, { title: '점심', sub: '', photos: 5 }] };
mock.mode = 'good'; r = await call('/api/ai/edit', 'POST', { text: '제목을 새 제목으로 바꾸고 세로로 해줘', state: STATE });
ok('edit: 도구 호출을 작업 목록으로', r.j.source === 'ai' && r.j.ops.length === 4 && r.j.ops[0].op === 'setTitle' && r.j.ops[0].text === '새 제목' && r.j.ops[1].aspect === '9:16', JSON.stringify(r.j.ops));
ok('edit: 목록에 없는 작업(deleteEverything)은 버림', !r.j.ops.some((o) => o.op === 'deleteEverything'));
ok('edit: 객체 값은 버리고 숫자 배열은 통과', r.j.ops[2].op === 'removePhotos' && Array.isArray(r.j.ops[2].which) && r.j.ops[3].op === 'setChapter' && r.j.ops[3].title === undefined, JSON.stringify(r.j.ops.slice(2)));
{ const b = mock.seen[mock.seen.length - 1].body, all = JSON.stringify(b); ok('edit: 요청에 도구 17개·주문·상태 포함, 이미지 없음', b.tools.length === 17 && all.includes('세로로 해줘') && all.includes('점심') && !/image|base64|\.jpg|uploads/i.test(all), String(b.tools.length)); }
ok('edit: AI 설명 문장 전달', /세로/.test(r.j.message));
mock.mode = '401'; r = await call('/api/ai/edit', 'POST', { text: '더 짧게', state: STATE }); ok('edit: 실패하면 규칙 해석으로 넘김', r.j.source === 'rules' && !!r.j.warning);
r = await call('/api/ai/edit', 'POST', { text: '', state: STATE }); ok('edit: 빈 주문 거절', r.status === 400);
r = await call('/api/ai/key', 'DELETE'); ok('키 삭제', r.j.configured === false); r = await call('/api/ai/status'); ok('삭제 후 미설정', r.j.configured === false);
r = await call('/api/ai/edit', 'POST', { text: '더 짧게', state: {} }); ok('edit: 키 없으면 규칙 해석(외부 전송 없음)', r.j.source === 'rules');
console.log(`\n통과 ${pass} / 실패 ${fail}`); upstream.close(); app.close(); fs.rmSync(dir, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
