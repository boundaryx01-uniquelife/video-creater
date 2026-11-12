// 스튜디오 완성도 기능 자동 검증(Playwright). 사용: node scripts/verify-studio-polish.mjs [--only undo,heic,scenes,queue,storage,robust,full]
// 전제: npx vite --port 5177 실행 중, CHROME_BIN 설정, playwright 설치(NODE_PATH). 합성 사진·합성 HEIC만 사용한다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url), { chromium } = require('playwright'), sharp = require('sharp');

const BASE = process.env.BASE ?? 'http://localhost:5177', OUT = process.env.OUT ?? '/tmp/studio-verify', ROOT = process.cwd();
const only = (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : 'undo,heic,scenes,queue,storage,robust,full').split(',');
fs.mkdirSync(OUT + '/assets', { recursive: true });
const results = []; const check = (group, name, ok, detail = '') => { results.push({ group, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} [${group}] ${name}${detail ? ' — ' + detail : ''}`); };
const A = (f) => path.join(OUT, 'assets', f), shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
const txt = async (l, d = '') => ((await l.count()) ? l.first().innerText() : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 합성 자료 ---------- */
async function makeAssets() {
  const exif = (dt) => ({ IFD2: { DateTimeOriginal: dt } });
  const grad = (w, h, c1, c2) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.3}" cy="${h * 0.4}" r="${h * 0.18}" fill="rgba(255,255,255,.55)"/></svg>`);
  const specs = [['p1.jpg', 1600, 1000, '#e86a4a', '#2a3f9a', '2026:11:03 09:10:00'], ['p2.jpg', 1600, 1000, '#3aa675', '#1b2a4a', '2026:11:03 10:20:00'], ['p3.jpg', 900, 1400, '#d9a42b', '#5a1f6e', '2026:11:03 11:30:00'], ['p4.jpg', 1600, 1000, '#4aa3e8', '#7a1b3a', '2026:11:03 13:40:00']];
  for (const [f, w, h, c1, c2, dt] of specs) await sharp(grad(w, h, c1, c2)).jpeg({ quality: 88 }).withExif(exif(dt)).toFile(A(f));
  await sharp(grad(800, 600, '#888', '#222')).png().toFile(A('p5.png'));
  const j = fs.readFileSync(A('p1.jpg'));
  fs.writeFileSync(A('trunc.jpg'), j.subarray(0, Math.floor(j.length * 0.3)));       // 끝이 잘린 JPEG
  fs.writeFileSync(A('notes.txt'), '이것은 사진이 아닙니다.\n'.repeat(20));           // 비이미지
  fs.writeFileSync(A('fake.jpg'), '이것은 사진이 아닙니다.\n'.repeat(20));            // 확장자만 jpg인 비이미지
  fs.writeFileSync(A('empty.jpg'), '');
  fs.writeFileSync(A('anim.gif'), Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  fs.writeFileSync(A('big.jpg'), Buffer.concat([j, Buffer.alloc(41e6)]));            // 유효한 JPEG + 41MB 뒤 덧붙임(디코더는 EOI 뒤를 무시)
  // 합성 HEIC(ffmpeg libx265 + 직접 조립한 HEIF 컨테이너)
  execFileSync('node', [path.join(ROOT, 'scripts/gen-test-heic.mjs'), A('iphone1.heic')], { stdio: 'pipe' });
  execFileSync('node', [path.join(ROOT, 'scripts/gen-test-heic.mjs'), A('iphone2.heic'), '--rotate', '--when', '2026:11:03 15:10:00'], { stdio: 'pipe' });
  fs.writeFileSync(A('trunc.heic'), fs.readFileSync(A('iphone1.heic')).subarray(0, 400));
  fs.copyFileSync(A('iphone1.heic'), A('mislabeled.jpg'));                          // HEIC인데 .jpg 확장자
}

/* ---------- 공통 동작 ---------- */
const getProps = async (p, mode) => { await sleep(700); return p.evaluate((m) => JSON.parse(localStorage.getItem(`studio:v1:${m}`) || 'null'), mode); };
const goMode = async (p, name) => { await p.locator('nav button', { hasText: name }).click(); await sleep(400); };
const sec = (p, title) => p.locator('aside.form details.sec', { has: p.locator('summary', { hasText: new RegExp('^' + title + '$') }) });
const openSec = async (p, title) => { const s = sec(p, title); if ((await s.getAttribute('open')) === null) await s.locator('summary').first().click(); return s; };
const fresh = async (b, opts = {}) => { const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true, ...opts }); ctx.setDefaultTimeout(30000); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(String(e))); await p.goto(BASE); await p.waitForSelector('.studio'); await sleep(600); return { ctx, p }; };
const note = (p) => p.evaluate(() => document.querySelector('aside.form .note')?.innerText ?? '');
const waitIdle = async (p, ms = 20000) => { await sleep(450); const t = Date.now(); while (Date.now() - t < ms) { const n = await note(p); if (!/처리 중|다시 올리는 중/.test(n)) return n; await sleep(200); } return 'timeout'; };

const groups = {
  /* 1. 실행 취소/다시 실행 */
  async undo(b) {
    const { ctx, p } = await fresh(b), G = 'undo';
    await goMode(p, '현장'); const s = await openSec(p, '인트로'); const title = s.locator('label', { hasText: /^제목/ }).locator('textarea');
    const T0 = await title.inputValue(); await title.click(); await p.keyboard.press('End');
    await title.pressSequentially('가나다', { delay: 40 }); await sleep(1100); await title.pressSequentially('라마', { delay: 40 });
    const T2 = await title.inputValue();
    check(G, '타이핑 두 묶음 입력됨', T2 === T0 + '가나다라마', T2.replace(/\n/g, '/'));
    await p.keyboard.press('Control+z'); const U1 = await title.inputValue();
    check(G, 'Ctrl+Z 1회: 두 번째 묶음("라마")만 되돌림(연타 병합)', U1 === T0 + '가나다', U1.replace(/\n/g, '/'));
    await p.keyboard.press('Control+z'); const U2 = await title.inputValue();
    check(G, 'Ctrl+Z 2회: 첫 묶음("가나다") 되돌림', U2 === T0, U2.replace(/\n/g, '/'));
    await p.keyboard.press('Control+Shift+z'); const R1 = await title.inputValue();
    check(G, 'Ctrl+Shift+Z: 다시 실행', R1 === T0 + '가나다', R1.replace(/\n/g, '/'));
    await p.keyboard.press('Control+y'); const R2 = await title.inputValue();
    check(G, 'Ctrl+Y: 다시 실행(두 번째 묶음)', R2 === T2);
    await p.getByRole('button', { name: '실행 취소' }).click(); const B1 = await title.inputValue();
    check(G, '버튼으로 실행 취소', B1 === T0 + '가나다');
    await p.getByRole('button', { name: '다시 실행' }).click(); check(G, '버튼으로 다시 실행', (await title.inputValue()) === T2);
    await shot(p, 'undo-1');
    // 모드별 이력 유지
    await goMode(p, '매장'); const s2 = await openSec(p, '인트로'); const t2 = s2.locator('label', { hasText: /^제목/ }).locator('textarea'); const S0 = await t2.inputValue();
    check(G, '다른 모드는 이력이 비어 있음(실행 취소 비활성)', await p.getByRole('button', { name: '실행 취소' }).isDisabled());
    await t2.fill('매장 제목 변경'); await goMode(p, '현장');
    check(G, '모드 전환 후에도 현장 이력 유지(실행 취소 활성)', await p.getByRole('button', { name: '실행 취소' }).isEnabled());
    await p.keyboard.press('Control+z'); const s3 = await openSec(p, '인트로');
    check(G, '돌아온 현장에서 되돌리기 동작', (await s3.locator('label', { hasText: /^제목/ }).locator('textarea').inputValue()) === T0 + '가나다');
    await goMode(p, '매장'); check(G, '매장 이력도 따로 유지', (await (await openSec(p, '인트로')).locator('label', { hasText: /^제목/ }).locator('textarea').inputValue()) === '매장 제목 변경');
    await p.keyboard.press('Control+z'); check(G, '매장 되돌리면 원래 제목', (await (await openSec(p, '인트로')).locator('label', { hasText: /^제목/ }).locator('textarea').inputValue()) === S0);
    // 메모리 상한
    const cap = await p.evaluate(async () => { const h = await import('/src/studio/history.ts'); let st = h.newStack({ n: 0, pad: '' }); for (let i = 1; i <= 400; i++) st = h.commit(st, { n: i, pad: '' }, '', i * 5000); const a = st.past.length;
      let big = h.newStack({ s: 'x'.repeat(10) }); for (let i = 1; i <= 30; i++) big = h.commit(big, { s: 'y'.repeat(2_000_000) + i }, '', i * 5000); return { steps: a, bigSteps: big.past.length, MAX: h.MAX_STEPS, MAXC: h.MAX_CHARS }; });
    check(G, `단계 상한(${cap.MAX}) 적용: 400회 변경 후 ${cap.steps}단계`, cap.steps === cap.MAX);
    check(G, `크기 상한 적용: 2MB짜리 30회 후 ${cap.bigSteps}단계(< 30)`, cap.bigSteps < 30 && cap.bigSteps * 2_000_000 <= cap.MAXC + 2_000_000);
    check(G, '페이지 오류 없음', p.errs.length === 0, p.errs.join('|').slice(0, 200)); await ctx.close();
  },

  /* 2. HEIC / 손상 / 비이미지 / 대용량 */
  async heic(b) {
    const { ctx, p } = await fresh(b), G = 'heic';
    await goMode(p, '졸업'); const s = await openSec(p, '챕터'); await s.locator('details.item').first().locator('summary').first().click();
    const strip = s.locator('details.item').first().locator('.strip').first(), input = strip.locator('input[type=file]');
    const n0 = await strip.locator('.thumbs button:not(.add)').count();
    await input.setInputFiles([A('iphone1.heic'), A('iphone2.heic')]); const msg = await waitIdle(p);
    const n1 = await strip.locator('.thumbs button:not(.add)').count();
    check(G, 'HEIC 2장 가져오기(libheif 변환)', n1 === n0 + 2, `${n0}→${n1} ${msg}`);
    const props = await getProps(p, 'grad'), ph = props.chapters[0].photos, h1 = ph[ph.length - 2], h2 = ph[ph.length - 1];
    check(G, 'EXIF 촬영 시각 보존(가로 HEIC: 14:32, 2026.11.03)', h1.time === '14:32' && h1.date === '2026.11.03' && h1.cap.chip === '2026.11.03', JSON.stringify([h1.time, h1.date, h1.cap.chip]));
    check(G, 'EXIF 촬영 시각 보존(회전 HEIC: 15:10)', h2.time === '15:10', h2.time);
    check(G, '가로 사진 비율 1.333 / 회전(irot) 반영해 세로 0.75', Math.abs(h1.aspect - 1.333) < 0.01 && Math.abs(h2.aspect - 0.75) < 0.01, `${h1.aspect}, ${h2.aspect}`);
    const r1 = await p.request.get(BASE + h1.src.replace(/^\//, '/')); check(G, 'JPEG로 변환되어 서버에 저장됨', r1.ok() && r1.headers()['content-type'] === 'image/jpeg' && /^\/uploads\/.+\.jpg$/.test(h1.src), `${h1.src} ${r1.status()}`);
    await shot(p, 'heic-1');
    // 확장자가 틀린 HEIC, 일반 사진 형식
    await input.setInputFiles([A('mislabeled.jpg')]); await waitIdle(p); const n2 = await strip.locator('.thumbs button:not(.add)').count(); check(G, '확장자가 .jpg인 HEIC도 내용으로 판별해 변환', n2 === n1 + 1, String(n2 - n1));
    await input.setInputFiles([A('p1.jpg'), A('p5.png')]); await waitIdle(p); check(G, 'JPEG·PNG 정상 가져오기', (await strip.locator('.thumbs button:not(.add)').count()) === n2 + 2);
    // 실패 안내
    const bad = { 'notes.txt': /이미지 파일이 아닙니다/, 'fake.jpg': /이미지 파일이 아닙니다|손상/, 'trunc.jpg': /손상|잘려/, 'empty.jpg': /빈 파일/, 'anim.gif': /GIF/, 'trunc.heic': /HEIC/ };
    for (const [f, re] of Object.entries(bad)) { const before = await strip.locator('.thumbs button:not(.add)').count(); await input.setInputFiles([A(f)]); const m = await waitIdle(p); const after = await strip.locator('.thumbs button:not(.add)').count();
      check(G, `${f}: 가져오지 않고 사유 안내`, after === before && re.test(m), m.slice(0, 110)); }
    // 섞어 올리면 정상 파일은 들어가고 실패 목록은 요약
    const before = await strip.locator('.thumbs button:not(.add)').count(); await input.setInputFiles([A('p2.jpg'), A('notes.txt'), A('trunc.jpg'), A('p3.jpg')]); const mm = await waitIdle(p);
    check(G, '정상 2장은 추가, 실패 2개는 요약 안내', (await strip.locator('.thumbs button:not(.add)').count()) === before + 2 && /읽지 못한 파일 2개/.test(mm), mm.slice(0, 120));
    await shot(p, 'heic-2-errors');
    // 대용량(>40MB): 경고 후 처리
    const nb = await strip.locator('.thumbs button:not(.add)').count(); await input.setInputFiles([A('big.jpg')]); const mb = await waitIdle(p, 60000);
    check(G, '41MB 사진: 처리하되 대용량 안내', (await strip.locator('.thumbs button:not(.add)').count()) === nb + 1 && /대용량/.test(mb), mb.slice(0, 100));
    const hard = await p.evaluate(async () => { const m = await import('/src/studio/image.ts'); const f = new File([new Blob([new ArrayBuffer(201e6)])], 'huge.jpg', { type: 'image/jpeg' }); try { await m.decodeImage(f); return 'no error'; } catch (e) { return e.message; } });
    check(G, '200MB 초과는 메모리 보호를 위해 거절', /너무 큽니다/.test(hard), hard);
    // 한 장 교체(ImagePick)에서도 HEIC/오류 처리
    const intro = await openSec(p, '인트로 사진'); const pick = intro.locator('.imgpick input[type=file]').first();
    await pick.setInputFiles([A('iphone1.heic')]); await waitIdle(p); const ip = await getProps(p, 'grad'); check(G, '인트로 사진 교체에도 HEIC 사용 가능', /^\/uploads\//.test(ip.introPhoto), ip.introPhoto);
    await pick.setInputFiles([A('notes.txt')]); await sleep(500); check(G, '사진 교체 시 비이미지는 안내하고 기존 사진 유지', /이미지 파일이 아닙니다/.test(await note(p)) && /^\/uploads\//.test((await getProps(p, 'grad')).introPhoto));
    check(G, '페이지 오류 없음', p.errs.length === 0, p.errs.join('|').slice(0, 200)); await ctx.close();
  },

  /* 3. 장면 추가·교체, 챕터 추가·삭제·복제 */
  async scenes(b) {
    const { ctx, p } = await fresh(b), G = 'scenes';
    const chips = async () => (await p.locator('.scenes button').allTextContents());
    const kinds = async (loc) => (await loc.locator('option').allTextContents()).map((x) => x.split(' — ')[0].trim()).filter((x) => !x.startsWith('＋'));
    const chapters = async () => { const s = await openSec(p, '챕터'); return s.locator('.chapters > details.item'); };
    const openCh = async (i) => { const it = (await chapters()).nth(i); if ((await it.getAttribute('open')) === null) await it.locator('summary').first().click(); return it; };
    // 모드별 노출 종류
    await goMode(p, '졸업'); let ch = await openCh(0); const gradKinds = await kinds(ch.locator('select[aria-label="데이터 장면 종류"], select[aria-label="데이터 장면 추가"]').first());
    check(G, '졸업: 명단 롤링·월별 타임라인 노출', gradKinds.includes('명단 롤링') && gradKinds.includes('월별 타임라인'), gradKinds.join(','));
    await goMode(p, '현장'); ch = await openCh(0); const siteKinds = await kinds(ch.locator('select[aria-label="데이터 장면 종류"]'));
    check(G, '현장: Before/After 노출, 명단·타임라인은 숨김', siteKinds.includes('Before / After') && !siteKinds.includes('명단 롤링') && !siteKinds.includes('월별 타임라인'), siteKinds.join(','));
    await goMode(p, '상품 소개'); ch = await openCh(0); const prodKinds = await kinds(ch.locator('select[aria-label="데이터 장면 종류"]'));
    check(G, '상품: 사진 설명선 노출, Before/After 숨김', prodKinds.includes('사진 설명선') && !prodKinds.includes('Before / After'), prodKinds.join(','));
    await goMode(p, '학교 홍보'); ch = await openCh(0); const schKinds = await kinds(ch.locator('select[aria-label="데이터 장면 종류"]'));
    check(G, '학교: 공통 종류만(설명선·Before/After·명단 숨김)', !schKinds.includes('사진 설명선') && !schKinds.includes('명단 롤링') && schKinds.includes('일정표'), schKinds.join(','));

    // 매장: 데이터 장면이 없는 3번째 챕터에 장면 추가 → 종류 변경 → 삭제 → 되돌리기
    await goMode(p, '매장'); const c0 = (await chips()).filter((x) => x.startsWith('데이터')).length;
    ch = await openCh(2); const addSel = ch.locator('select[aria-label="데이터 장면 추가"]');
    check(G, '장면이 없는 챕터는 "장면 추가" 선택 상자 표시', await addSel.count() === 1);
    await addSel.selectOption({ value: 'spec' }); await sleep(300);
    let props = await getProps(p, 'store'), bt = props.chapters[2].beat;
    check(G, '스펙 표 추가(기본값·사진 채움)', bt?.kind === 'spec' && bt.rows.length === 3 && props.chapters[2].beatPhotos?.length === 1, JSON.stringify(bt).slice(0, 90));
    check(G, '타임라인 장면 칩이 하나 늘어남', (await chips()).filter((x) => x.startsWith('데이터')).length === c0 + 1);
    ch = await openCh(2); await ch.locator('.sceneslot input').first().fill('커뮤널 테이블'); // 내용 편집
    await ch.locator('select[aria-label="데이터 장면 종류"]').selectOption({ value: 'stats' }); await sleep(300);
    props = await getProps(p, 'store'); bt = props.chapters[2].beat;
    check(G, '종류 변경: 스펙 → 숫자 요약(기본값 채움)', bt.kind === 'stats' && bt.items.length === 4, bt.kind);
    ch = await openCh(2); await ch.locator('select[aria-label="데이터 장면 종류"]').selectOption({ value: 'schedule' }); await sleep(300);
    props = await getProps(p, 'store'); check(G, '종류 변경: 일정표(제목 같은 필드는 이어받기)', props.chapters[2].beat.kind === 'schedule' && props.chapters[2].beat.title === '일정', JSON.stringify(props.chapters[2].beat).slice(0, 80));
    await shot(p, 'scenes-1-beat-editor');
    ch = await openCh(2); await ch.getByRole('button', { name: '데이터 장면 삭제' }).click(); await sleep(300);
    props = await getProps(p, 'store'); check(G, '데이터 장면 삭제', props.chapters[2].beat === undefined && props.chapters[2].beatPhotos === undefined);
    check(G, '장면 칩이 원래 개수로 돌아감', (await chips()).filter((x) => x.startsWith('데이터')).length === c0);
    await p.keyboard.press('Control+z'); await sleep(300); props = await getProps(p, 'store'); check(G, '삭제를 한 번에 실행 취소(장면과 사진 함께 복원)', props.chapters[2].beat?.kind === 'schedule' && !!props.chapters[2].beatPhotos === !!props.chapters[2].beatPhotos);
    // 오프닝/마무리
    let op = await openSec(p, '오프닝 장면'); check(G, '매장은 오프닝 섹션이 비어 있어도 표시됨', await op.count() === 1);
    await op.locator('select[aria-label="오프닝 장면 추가"]').selectOption({ value: 'quote' }); await sleep(300);
    let cl = await openSec(p, '마무리 장면'); await cl.locator('select[aria-label="마무리 장면 추가"]').selectOption({ value: 'caption' }); await sleep(300);
    cl = await openSec(p, '마무리 장면'); await cl.locator('select[aria-label="마무리 장면 추가"]').selectOption({ value: 'lower' }); await sleep(300);
    props = await getProps(p, 'store'); check(G, '오프닝 1개·마무리 2개 추가', props.opening?.length === 1 && props.opening[0].beat.kind === 'quote' && props.closing?.length === 2, JSON.stringify([props.opening?.length, props.closing?.map((x) => x.beat.kind)]));
    const cs = await chips(); check(G, '장면 막대에 오프닝·마무리 표시', cs.includes('오프닝') && cs.filter((x) => x === '마무리').length === 2, cs.join(','));
    cl = await openSec(p, '마무리 장면'); await cl.getByRole('button', { name: /마무리 장면 1 아래로/ }).click(); await sleep(300);
    props = await getProps(p, 'store'); check(G, '마무리 장면 순서 변경', props.closing[0].beat.kind === 'lower' && props.closing[1].beat.kind === 'caption');
    await shot(p, 'scenes-2-opening-closing');
    // 새 장면이 실제로 그려지는지: 오프닝 칩을 눌러 플레이어 확인
    await p.locator('.scenes button', { hasText: '오프닝' }).click(); await sleep(1200); await p.locator('.player').screenshot({ path: path.join(OUT, 'scenes-3-opening-quote-preview.png') });
    check(G, '새 장면 미리보기에서 오류 없음', (await p.locator('.perr').count()) === 0 && p.errs.length === 0, p.errs.join('|').slice(0, 150));
    cl = await openSec(p, '마무리 장면'); await cl.getByRole('button', { name: '마무리 장면 1 삭제' }).click(); op = await openSec(p, '오프닝 장면'); await op.getByRole('button', { name: '오프닝 장면 1 삭제' }).click(); await sleep(300);
    props = await getProps(p, 'store'); check(G, '오프닝·마무리 장면 삭제', props.opening.length === 0 && props.closing.length === 1);
    // 졸업: 명단/타임라인 마무리 추가 후 재생 칩
    await goMode(p, '졸업'); cl = await openSec(p, '마무리 장면'); await cl.locator('select[aria-label="마무리 장면 추가"]').selectOption({ value: 'timeline' }); await sleep(400);
    props = await getProps(p, 'grad'); check(G, '졸업: 타임라인 마무리 추가(길이 128프레임)', props.closing.at(-1).beat.kind === 'timeline' && props.closing.at(-1).dur === 128);
    await p.locator('.scenes button', { hasText: '마무리' }).last().click(); await sleep(1500); await p.locator('.player').screenshot({ path: path.join(OUT, 'scenes-4-grad-timeline-preview.png') });

    // 챕터 추가·복제·삭제·이동 (현장: 진행 레일, 졸업: 막대 레일 라벨 1:1)
    await goMode(p, '현장'); let sc = (await chips()).filter((x) => x.startsWith('카드')).length;
    const sIdx = async () => (await getProps(p, 'site')).chapters.map((c) => c.card.index);
    check(G, '현장 챕터 시작 번호 표시', (await sIdx()).join() === '공정 01 / 03,공정 02 / 03,공정 03 / 03', (await sIdx()).join());
    await (await openSec(p, '챕터')).getByRole('button', { name: '＋ 챕터 추가' }).click(); await sleep(300);
    check(G, '챕터 추가 → 4개, 번호 "04 / 04"로 갱신', (await sIdx()).join() === '공정 01 / 04,공정 02 / 04,공정 03 / 04,공정 04 / 04', (await sIdx()).join());
    check(G, '장면 막대에 카드 4개', (await chips()).filter((x) => x.startsWith('카드')).length === sc + 1);
    await (await openSec(p, '챕터')).getByRole('button', { name: '챕터 1 복제' }).click(); await sleep(300);
    props = await getProps(p, 'site'); check(G, '챕터 1 복제 → 5개, 복제본이 바로 뒤에', props.chapters.length === 5 && props.chapters[1].card.big === props.chapters[0].card.big && props.chapters[1].card.index === '공정 02 / 05', props.chapters.map((c) => c.card.big).join('|'));
    await (await openSec(p, '챕터')).getByRole('button', { name: '챕터 5 위로' }).click(); await sleep(300);
    props = await getProps(p, 'site'); check(G, '챕터 이동(위로)', props.chapters[3].card.big === '새 챕터' && props.chapters[4].card.index === '공정 05 / 05');
    await (await openSec(p, '챕터')).getByRole('button', { name: '챕터 2 삭제' }).click(); await sleep(300);
    props = await getProps(p, 'site'); check(G, '챕터 삭제 → 4개, 번호 재정렬', props.chapters.length === 4 && props.chapters.map((c) => c.card.index).join() === '공정 01 / 04,공정 02 / 04,공정 03 / 04,공정 04 / 04');
    await shot(p, 'scenes-5-chapters');
    await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); await sleep(300); props = await getProps(p, 'site'); check(G, '챕터 작업도 한 단계씩 실행 취소(삭제·이동 되돌림 → 5개)', props.chapters.length === 5);
    await goMode(p, '졸업'); await (await openSec(p, '챕터')).getByRole('button', { name: '＋ 챕터 추가' }).click(); await sleep(300);
    props = await getProps(p, 'grad'); check(G, '졸업: 학년 레일 라벨이 챕터와 함께 늘어남(4개, 새 챕터 active=3)', props.chapters.every((c) => c.card.rail.labels.length === 4) && props.chapters[3].card.rail.active === 3 && props.chapters[0].card.rail.active === 0, JSON.stringify(props.chapters.map((c) => c.card.rail.active)));
    await p.locator('.scenes button', { hasText: '카드 4' }).click(); await sleep(1500); await p.locator('.player').screenshot({ path: path.join(OUT, 'scenes-6-new-chapter-card.png') });
    check(G, '새 챕터 미리보기 오류 없음', (await p.locator('.perr').count()) === 0);
    // 마지막 챕터는 삭제 불가
    await goMode(p, '동아리'); const cn = (await chapters()); const n = await cn.count(); for (let i = n; i > 1; i--) await (await openSec(p, '챕터')).getByRole('button', { name: `챕터 ${i} 삭제` }).click();
    check(G, '챕터가 1개 남으면 삭제 버튼 비활성', await (await openSec(p, '챕터')).getByRole('button', { name: '챕터 1 삭제' }).isDisabled());
    check(G, '페이지 오류 없음', p.errs.length === 0, p.errs.join('|').slice(0, 200)); await ctx.close();
  },

  /* 4. 렌더 대기열·취소·목록·정리·실패 요약 */
  async queue(b) {
    const { ctx, p } = await fresh(b, {}), G = 'queue', STUDIO = path.join(ROOT, '.studio');
    await goMode(p, '현장'); const rows = (st) => p.locator(`.job-row${st ? `[data-status=${st}]` : ''}`);
    const btn = p.getByRole('button', { name: /8초 미리 렌더/ });
    // 1) 두 작업 연속 추가 → 하나는 진행, 하나는 대기
    await btn.click(); await btn.click(); await sleep(1500);
    check(G, '두 작업을 연속으로 추가할 수 있음(이전: 409 거절)', (await rows().count()) >= 2, String(await rows().count()));
    check(G, '하나는 진행/준비, 하나는 대기 중(순차 실행)', (await rows('queued').count()) === 1 && (await rows('running').count()) === 1, `queued=${await rows('queued').count()} running=${await rows('running').count()}`);
    const qtxt = await rows('queued').first().innerText(); check(G, '대기 순번 표시', /1번째/.test(qtxt), qtxt.replace(/\n/g, ' '));
    await shot(p, 'queue-1-queued');
    // 2) 대기 작업 취소
    await rows('queued').first().getByRole('button', { name: '취소' }).click(); { const tt = Date.now(); while (Date.now() - tt < 15000 && !(await rows('canceled').count())) await sleep(300); }
    check(G, '대기 중 작업 취소 → 취소됨', (await rows('canceled').count()) === 1 && (await rows('queued').count()) === 0);
    // 3) 진행 중 작업의 진행률·남은 시간 표시
    let eta = '', t0 = Date.now(); while (Date.now() - t0 < 120000) { const t = await txt(rows('running')); if (/남은 시간/.test(t)) { eta = t.replace(/\n/g, ' '); break; } if (!(await rows('running').count())) break; await sleep(500); }
    check(G, '진행 중 작업에 진행률과 "남은 시간 약 …" 표시', /\d+%/.test(eta) && /남은 시간 약/.test(eta), eta.slice(0, 120)); await shot(p, 'queue-2-running');
    // 4) 완료 → 내려받기, 영상 길이 검증
    t0 = Date.now(); while (Date.now() - t0 < 240000 && !(await rows('done').count())) await sleep(1000);
    check(G, '8초 미리 렌더 완료', (await rows('done').count()) === 1);
    const [dl] = await Promise.all([p.waitForEvent('download'), rows('done').first().locator('a.dl').click()]); const f = path.join(OUT, 'queue-preview.mp4'); await dl.saveAs(f);
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()), sz = fs.statSync(f).size;
    check(G, `내려받은 MP4: ${sz} bytes, 길이 ${dur.toFixed(2)}초(≈8초)`, sz > 20000 && Math.abs(dur - 8) < 0.2);
    const info = await rows('done').first().innerText(); check(G, '완료 항목에 크기·길이·화질 표시', /MB|KB/.test(info) && /8\.0초/.test(info) && /720p/.test(info), info.replace(/\n/g, ' ').slice(0, 100));
    // 5) 진행 중 취소
    await btn.click(); t0 = Date.now(); while (Date.now() - t0 < 120000) { const t = await txt(rows('running')); if (/렌더링 [1-9]/.test(t)) break; await sleep(400); }
    await rows('running').first().getByRole('button', { name: '취소' }).click(); t0 = Date.now(); while (Date.now() - t0 < 30000 && (await rows('running').count())) await sleep(500);
    check(G, '진행 중 작업 취소 → 취소됨, 불완전한 mp4 없음', (await rows('canceled').count()) === 2 && fs.readdirSync(path.join(STUDIO, 'renders')).filter((x) => x.endsWith('.mp4')).length === 1, fs.readdirSync(path.join(STUDIO, 'renders')).join(','));
    // 6) 실패 요약(챕터가 없는 입력을 API로 직접 보내 렌더 중 오류를 일으킴)
    const r = await p.request.post(BASE + '/api/render', { data: { comp: 'site-video-sample', props: { chapters: [] }, scale: '720', seconds: 8, name: '실패 테스트' } }); check(G, '잘못된 입력도 대기열에 들어감', r.ok());
    t0 = Date.now(); while (Date.now() - t0 < 120000 && !(await rows('error').count())) await sleep(800);
    const er = rows('error').first(); const etxt = await er.innerText(); check(G, '실패 시 한 줄 요약 표시', /실패:/.test(etxt), etxt.replace(/\n/g, ' ').slice(0, 140));
    await er.locator('summary').click(); const logTxt = await er.locator('pre').innerText(); check(G, '"자세히 보기"에 로그 표시', /렌더 시작/.test(logTxt) && /오류/.test(logTxt), logTxt.replace(/\n/g, ' ').slice(0, 120)); await shot(p, 'queue-3-error-log');
    // 7) 새로고침해도 완료 목록 유지, 삭제 시 파일 제거
    await p.reload(); await p.waitForSelector('.job-row'); await sleep(800);
    check(G, '새로고침 후에도 완료된 렌더 목록 유지(디스크)', (await rows('done').count()) === 1);
    const url = await rows('done').first().locator('a.dl').getAttribute('href'); await rows('done').first().getByRole('button', { name: /삭제/ }).click(); await sleep(1200);
    const gone = await p.request.get(BASE + url.split('?')[0]); check(G, '완료 항목 삭제 → 목록에서 사라지고 파일도 삭제(404)', (await rows('done').count()) === 0 && gone.status() === 404);
    for (const st of ['canceled', 'error']) while (await rows(st).count()) { await rows(st).first().getByRole('button', { name: /삭제/ }).click(); await sleep(600); }
    check(G, '페이지 오류 없음', p.errs.length === 0, p.errs.join('|').slice(0, 200)); await ctx.close();
  },

  /* 4b. 저장 공간·정리 정책(렌더 없이) */
  async storage(b) {
    const { ctx, p } = await fresh(b, {}), G = 'storage', STUDIO = path.join(ROOT, '.studio');
    await goMode(p, '현장');
    // 8) 저장 공간·정리 정책
    const up = path.join(STUDIO, 'uploads'), rd = path.join(STUDIO, 'renders'), old = (f, days) => { const t = (Date.now() - days * 86400e3) / 1000; fs.utimesSync(f, t, t); };
    fs.writeFileSync(path.join(up, 'old_unused.jpg'), 'x'.repeat(5000)); old(path.join(up, 'old_unused.jpg'), 100);
    fs.writeFileSync(path.join(up, 'old_keep.jpg'), 'x'.repeat(5000)); old(path.join(up, 'old_keep.jpg'), 100);
    fs.writeFileSync(path.join(up, 'recent.jpg'), 'x'.repeat(5000));
    fs.writeFileSync(path.join(rd, 'oldjob.mp4'), 'x'.repeat(8000)); fs.writeFileSync(path.join(rd, 'oldjob.json'), JSON.stringify({ id: 'oldjob', comp: 'site-video-sample', name: '오래된 렌더', createdAt: Date.now() - 30 * 86400e3, scale: '720' })); old(path.join(rd, 'oldjob.mp4'), 30); old(path.join(rd, 'oldjob.json'), 30);
    await p.evaluate(() => { const k = 'studio:v1:store', j = JSON.parse(localStorage.getItem(k) || 'null'); if (j) { j.introPhoto = '/uploads/old_keep.jpg'; localStorage.setItem(k, JSON.stringify(j)); } else localStorage.setItem(k, JSON.stringify({ x: '/uploads/old_keep.jpg' })); });
    await p.reload(); await p.waitForSelector('.storage'); await sleep(1500); // 열 때 자동 정리(렌더 14일, 업로드 60일, 보호 목록 반영)
    check(G, '자동 정리: 오래된 렌더(30일) 삭제', !fs.existsSync(path.join(rd, 'oldjob.mp4')) && !fs.existsSync(path.join(rd, 'oldjob.json')));
    check(G, '자동 정리: 오래된 미사용 업로드 삭제, 다른 모드가 쓰는 업로드·최근 업로드는 보호', !fs.existsSync(path.join(up, 'old_unused.jpg')) && fs.existsSync(path.join(up, 'old_keep.jpg')) && fs.existsSync(path.join(up, 'recent.jpg')));
    await p.locator('.storage summary').click(); await sleep(300); const sm = await p.locator('.storage').innerText(); check(G, '저장 공간 표시(업로드·렌더·디스크 여유)', /업로드/.test(sm) && /디스크 여유/.test(sm) && /GB|MB/.test(sm), sm.replace(/\n/g, ' ').slice(0, 120));
    // 설정 변경 → 저장 → 지금 정리(보관 일수 7일)
    fs.writeFileSync(path.join(up, 'mid.jpg'), 'x'.repeat(3000)); old(path.join(up, 'mid.jpg'), 10);
    const nums = p.locator('.storage input[type=number]'); await nums.nth(1).fill('7'); await p.getByRole('button', { name: '설정 저장' }).click(); await sleep(500);
    const cfg = await (await p.request.get(BASE + '/api/storage')).json(); check(G, '정리 설정이 서버에 저장됨(업로드 7일)', cfg.settings.uploadsDays === 7, JSON.stringify(cfg.settings));
    await p.getByRole('button', { name: '지금 정리' }).click(); await sleep(800);
    check(G, '지금 정리: 7일 넘은 업로드(mid.jpg) 삭제, 보호 대상(old_keep.jpg)은 유지', !fs.existsSync(path.join(up, 'mid.jpg')) && fs.existsSync(path.join(up, 'old_keep.jpg')), await p.locator('.storage').innerText().then((t) => t.slice(-90).replace(/\n/g, ' ')));
    await shot(p, 'queue-4-storage'); fs.rmSync(path.join(up, 'old_keep.jpg'), { force: true }); fs.rmSync(path.join(up, 'recent.jpg'), { force: true });
    await p.request.post(BASE + '/api/settings', { data: { rendersDays: 14, uploadsDays: 60, autoClean: true } });
    check(G, '페이지 오류 없음', p.errs.length === 0, p.errs.join('|').slice(0, 200)); await ctx.close();
  },

  /* 5. 견고성: 저장 용량, 업로드 재시도, 드래그, 접근성 */
  async robust(b) {
    const G = 'robust', imgData = async () => { const n = await sharp({ create: { width: 700, height: 700, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } }).jpeg({ quality: 90 }).toBuffer(); return 'data:image/jpeg;base64,' + n.toString('base64'); };
    // (a) localStorage 용량 초과
    { const { ctx, p } = await fresh(b); await goMode(p, '현장'); const data = await imgData();
      const base = await getProps(p, 'site'); base.introPhoto = data; fs.writeFileSync(A('with-data.json'), JSON.stringify(base));
      check(G, `준비: data: 사진 포함 설정 JSON ${(JSON.stringify(base).length / 1e3).toFixed(0)}KB`, JSON.stringify(base).length > 300000);
      await p.evaluate(() => { const o = Storage.prototype.setItem; window.__limit = 200000; Storage.prototype.setItem = function (k, v) { if (k.startsWith('studio:v1:') && String(v).length > window.__limit) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); }; });
      await p.locator('aside.form input[type=file][accept="application/json"]').setInputFiles(A('with-data.json')); await sleep(1200);
      const alert = await p.locator('[role=alert]').allInnerTexts(); check(G, '용량 초과 시 경고 표시(사진 데이터 제외하고 저장)', alert.some((t) => /사진 데이터/.test(t)), alert.join('|').slice(0, 140));
      const saved = await p.evaluate(() => localStorage.getItem('studio:v1:site')); check(G, '저장된 값에서 data: 사진이 샘플 사진으로 대체되어 작게 저장됨', !!saved && !saved.includes('data:image') && saved.length < 200000, `${saved?.length}`);
      await shot(p, 'robust-1-quota-warning');
      await p.evaluate(() => { window.__limit = 0; }); await p.locator('aside.form textarea').first().fill('저장 불가 테스트'); await sleep(900);
      check(G, '완전히 저장할 수 없으면 백업 안내 경고', (await p.locator('[role=alert]').allInnerTexts()).some((t) => /저장에 실패/.test(t)));
      await p.evaluate(() => { window.__limit = 1e9; }); await p.locator('aside.form textarea').first().fill('복구'); await sleep(900); check(G, '저장 공간이 회복되면 경고 해제', (await p.locator('[role=alert]').count()) === 0);
      await ctx.close(); }
    // (b) 업로드 재시도 + 서버 저장 실패 시 안내/다시 올리기
    { const { ctx, p } = await fresh(b); await goMode(p, '현장'); const s = await openSec(p, '챕터'); const it = s.locator('.chapters > details.item').first(); await it.locator('summary').first().click(); const input = it.locator('.strip input[type=file]'); const n0 = await it.locator('.thumbs button:not(.add)').count();
      let tries = 0; await p.route('**/api/upload', (r) => { tries++; if (tries <= 2) r.abort(); else r.continue(); });
      await input.setInputFiles(A('p1.jpg')); await waitIdle(p); await sleep(3500);
      let pr = await getProps(p, 'site'); const ph = pr.chapters[0].photos; check(G, `업로드 실패 2회 후 3번째에 성공(시도 ${tries}회)`, tries === 3 && /^\/uploads\//.test(ph[ph.length - 1].src), ph[ph.length - 1].src);
      await p.unroute('**/api/upload'); tries = 0; await p.route('**/api/upload', (r) => { tries++; r.abort(); });
      await input.setInputFiles(A('p2.jpg')); await sleep(5000); await waitIdle(p);
      check(G, `계속 실패하면 3회 시도 후 미리보기 주소로 대체(시도 ${tries}회)`, tries === 3 && (await it.locator('.thumbs button:not(.add)').count()) === n0 + 2);
      const bar = p.locator('.unsaved'); check(G, '서버에 저장되지 않은 사진 경고 표시', /1장/.test(await txt(bar)), await txt(bar, '없음')); await shot(p, 'robust-2-unsaved');
      await p.unroute('**/api/upload'); await bar.getByRole('button', { name: '서버에 다시 올리기' }).click(); await sleep(2500);
      pr = await getProps(p, 'site'); const all = JSON.stringify(pr); check(G, '"서버에 다시 올리기" 성공 → blob 주소가 /uploads/로 교체, 경고 사라짐', !all.includes('"blob:') && (await txt(p.locator('.unsaved'))).includes('저장했습니다'), (await txt(p.locator('.unsaved'))).slice(0, 80));
      await ctx.close(); }
    // (c) 드래그 순서 변경, 파일 드롭, 키보드
    { const { ctx, p } = await fresh(b); await goMode(p, '현장'); const s = await openSec(p, '챕터'); const it = s.locator('.chapters > details.item').first(); await it.locator('summary').first().click();
      const th = it.locator('.thumbs button:not(.add)'); const order0 = (await getProps(p, 'site')).chapters[0].photos.map((x) => x.src);
      await th.nth(0).dragTo(th.nth(2)); await sleep(300); let o1 = (await getProps(p, 'site')).chapters[0].photos.map((x) => x.src);
      check(G, '썸네일 드래그로 순서 변경(0번 → 2번 자리)', o1.join() === [order0[1], order0[2], order0[0], ...order0.slice(3)].join(), o1.map((x) => x.slice(-9)).join(' '));
      await th.nth(3).focus(); await p.keyboard.press('Alt+ArrowLeft'); await sleep(300); const o2 = (await getProps(p, 'site')).chapters[0].photos.map((x) => x.src);
      check(G, '키보드 Alt+←로 순서 변경', o2[2] === o1[3] && o2[3] === o1[2]);
      await p.keyboard.press('ArrowLeft'); await sleep(200); check(G, '키보드 ←로 사진 선택 이동(포커스·aria-pressed)', await th.nth(1).getAttribute('aria-pressed') === 'true' || await th.nth(2).getAttribute('aria-pressed') === 'true');
      const mk = (files) => p.evaluateHandle(async (fl) => { const d = new DataTransfer(); for (const [n, b64, t] of fl) { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); d.items.add(new File([bin], n, { type: t })); } return d; }, files);
      const dt = await mk([['p3.jpg', fs.readFileSync(A('p3.jpg')).toString('base64'), 'image/jpeg'], ['iphone1.heic', fs.readFileSync(A('iphone1.heic')).toString('base64'), 'image/heic']]);
      const n0 = await th.count(); await it.locator('.strip').dispatchEvent('dragover', { dataTransfer: dt }); check(G, '파일을 끌어오면 사진 줄에 놓기 표시', await it.locator('.strip.dropping').count() === 1);
      await it.locator('.strip').dispatchEvent('drop', { dataTransfer: dt }); await waitIdle(p); await sleep(500);
      check(G, '파일(JPEG+HEIC)을 사진 줄에 끌어다 놓아 업로드', (await th.count()) === n0 + 2, `${n0}→${await th.count()}`); await shot(p, 'robust-3-dnd');
      const dt2 = await mk(['p1.jpg', 'p2.jpg', 'p3.jpg', 'p4.jpg'].map((f) => [f, fs.readFileSync(A(f)).toString('base64'), 'image/jpeg']));
      await p.dispatchEvent('body', 'dragenter', { dataTransfer: dt2 }); check(G, '창 아무 곳에 파일을 끌면 안내 표시', await p.locator('.dropveil').count() === 1);
      const prevented = await p.evaluate((d) => { const e = new DragEvent('drop', { dataTransfer: d, bubbles: true, cancelable: true }); document.querySelector('main').dispatchEvent(e); return e.defaultPrevented; }, dt2);
      await waitIdle(p, 30000); await sleep(800); const nt = await note(p); check(G, '창에 놓으면 일괄 배정(브라우저가 파일을 열지 않음)', prevented && /촬영 시각순/.test(nt), nt.slice(0, 100));
      await ctx.close(); }
    // (d) 접근성 기본
    { const { ctx, p } = await fresh(b); await goMode(p, '현장'); await (await openSec(p, '챕터')).locator('.chapters > details.item').first().locator('summary').first().click();
      const bad = await p.evaluate(() => { const out = []; document.querySelectorAll('aside.form input, aside.form select, aside.form textarea, aside.form button').forEach((el) => { if (el.type === 'file' || el.hidden) return; const name = el.getAttribute('aria-label') || el.closest('label')?.textContent?.trim() || el.textContent?.trim() || el.title; if (!name) out.push(el.outerHTML.slice(0, 80)); }); return out; });
      check(G, '폼의 모든 입력·버튼에 접근 가능한 이름이 있음', bad.length === 0, bad.slice(0, 3).join(' | '));
      check(G, '현재 모드 버튼에 aria-current', (await p.locator('nav button[aria-current=page]').innerText()).includes('현장'));
      await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); const ol = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth); check(G, '키보드 포커스 표시(:focus-visible)', !/^none/.test(ol), ol);
      check(G, '상태 알림 영역 role=status 사용', (await p.locator('[role=status]').count()) >= 1);
      await ctx.close(); }
  },

  /* 6. 전체 길이 렌더를 UI에서 */
  async full(b) {
    const { ctx, p } = await fresh(b), G = 'full'; const MODE = process.env.FULL_MODE ?? '현장';
    await goMode(p, MODE); const total = parseFloat((await p.locator('.scenes span').innerText()).replace('초', ''));
    await p.locator('.render select').first().selectOption('0'); const btn = p.getByRole('button', { name: /전체 길이 MP4 만들기/ }); check(G, '범위를 "전체 길이"로 바꾸면 버튼 이름도 바뀜', await btn.isVisible());
    await btn.click(); const row = p.locator('.job-row').first(); const t0 = Date.now(); let n = 0;
    while (Date.now() - t0 < 20 * 60e3) { const st = await row.getAttribute('data-status'); if (st === 'done' || st === 'error') break; if (++n % 15 === 0) console.log('  ..', (await row.innerText()).replace(/\n/g, ' ').slice(0, 110)); await sleep(2000); }
    const st = await row.getAttribute('data-status'); check(G, `전체 길이(${total}초) 렌더 완료 (${((Date.now() - t0) / 1000).toFixed(0)}초 소요)`, st === 'done', (await row.innerText()).replace(/\n/g, ' ').slice(0, 160));
    if (st === 'done') { const [dl] = await Promise.all([p.waitForEvent('download'), row.locator('a.dl').click()]); const f = path.join(OUT, 'full-length.mp4'); await dl.saveAs(f);
      const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()); const v = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name,nb_frames', '-of', 'csv=p=0', f]).toString().trim();
      check(G, `내려받은 전체 MP4: 길이 ${dur.toFixed(2)}초 ≈ 미리보기 길이 ${total}초 (${v})`, Math.abs(dur - total) < 0.25 && /h264,1280,720/.test(v), `${fs.statSync(f).size} bytes`);
      for (const [i, frac] of [[1, 0.1], [2, 0.5], [3, 0.95]]) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(dur * frac), '-i', f, '-frames:v', '1', path.join(OUT, `full-frame${i}.jpg`)]);
      await shot(p, 'full-1-done'); }
    check(G, '페이지 오류 없음', p.errs.length === 0, p.errs.join('|').slice(0, 200)); await ctx.close();
  },
};

/* 실행 */
(async () => {
  await makeAssets();
  const b = await chromium.launch(); let failed = 0;
  for (const g of only) { if (!groups[g]) continue; try { await groups[g](b); } catch (e) { check(g, '시나리오 실행', false, String(e?.message ?? e).split('\n').slice(0, 3).join(' | ')); } }
  await b.close();
  const bad = results.filter((r) => !r.ok); failed = bad.length;
  console.log(`\n=== 결과: ${results.length - failed}/${results.length} 통과 ===`); for (const r of bad) console.log(`FAIL [${r.group}] ${r.name} — ${r.detail}`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1)); process.exit(failed ? 1 : 0);
})();
