// 키트 부품 검수 갤러리: 모든 계열 × 부품 × 가로/세로 장면을 세 지점(15%, 55%, 90%)에서 캡처해
// 자체 완결 HTML(<out>/index.html)로 만든다. 사람이 좋음/고침/버림과 메모를 남기고 JSON으로 내보낸다.
// 생성물 폴더(기본 ./gallery)이므로 git에 넣지 않는다. 다시 실행하면 덮어쓴다.
// 사용: node --experimental-strip-types --no-warnings scripts/kit-gallery.mjs [--families a,b] [--parts a,b] [--out 폴더]
// 필요: CHROME_BIN(헤드리스 크롬 경로)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { PART_IDS, PART_SPEC } from '../src/kit/schema.ts';
import { SAMPLE_PART, SAMPLE_PHOTOS } from '../src/kit/sample.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d = '') => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const families = list(opt('families', 'scrapbook,editorial,documentary,lyric'));
const parts = opt('parts') ? list(opt('parts')) : PART_IDS;
const out = path.resolve(opt('out', 'gallery'));
const ORIENT = [{ key: 'h', id: 'kit-part' }, { key: 'v', id: 'kit-part-vertical' }];
const STEPS = [15, 55, 90];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

for (const f of families) {
  if (!/^[a-z0-9-]+$/.test(f) || !fs.existsSync(path.join(ROOT, 'src/kit/families', f))) throw new Error('없는 계열: ' + f);
}
for (const p of parts) if (!PART_IDS.includes(p)) throw new Error('없는 부품: ' + p);

const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/remotion/index.ts'), publicDir: path.join(ROOT, 'public') });
process.on('exit', () => { try { fs.rmSync(serveUrl, { recursive: true, force: true }); } catch {} }); // 임시 번들 정리(디스크 누수 방지)
const total = families.length * parts.length * ORIENT.length;
let n = 0;
const shots = {}; // family -> part -> { h: [rel], v: [rel] }

for (const family of families) {
  shots[family] = {};
  fs.mkdirSync(path.join(out, 'img', family), { recursive: true });
  for (const part of parts) {
    const s = SAMPLE_PART[part];
    const photos = s.photos.map((i) => SAMPLE_PHOTOS[i]);
    const dur = PART_SPEC[part].dur(photos.length);
    const inputProps = { family, part, data: s.data, photos, dur };
    shots[family][part] = {};
    for (const o of ORIENT) {
      console.error(`[${++n}/${total}] ${family} ${part} ${o.key === 'h' ? '16:9' : '9:16'}`);
      const comp = await selectComposition({ serveUrl, id: o.id, inputProps, browserExecutable: process.env.CHROME_BIN, logLevel: 'error' });
      const scale = 640 / Math.max(comp.width, comp.height);
      const rels = [];
      for (const p of STEPS) {
        const frame = Math.max(0, Math.min(comp.durationInFrames - 1, Math.round(dur * p / 100)));
        const rel = `img/${family}/${part}-${o.key}-${p}.jpg`;
        await renderStill({ composition: comp, serveUrl, frame, output: path.join(out, rel), inputProps, imageFormat: 'jpeg', jpegQuality: 80, scale, browserExecutable: process.env.CHROME_BIN, logLevel: 'error' });
        rels.push(rel);
      }
      shots[family][part][o.key] = rels;
    }
  }
}

const figs = (rels, pcts, cls) => rels.map((r, i) => `<figure class="${cls}"><img class="shot" loading="lazy" src="${esc(r)}" alt="${esc(r)}"><figcaption>${pcts[i]}%</figcaption></figure>`).join('');
const card = (family, part) => `
    <article class="card" data-family="${esc(family)}" data-part="${esc(part)}">
      <header><code>${esc(part)}</code> <span>${esc(PART_SPEC[part].label)}</span></header>
      <div class="row">${figs(shots[family][part].h, STEPS, 'wide')}</div>
      <div class="row">${figs(shots[family][part].v, STEPS, 'tall')}</div>
      <div class="rate">
        <button type="button" data-r="good">좋음</button>
        <button type="button" data-r="fix">고침</button>
        <button type="button" data-r="drop">버림</button>
      </div>
      <input class="memo" type="text" placeholder="메모" maxlength="300">
    </article>`;

const sections = families.map((family) => `
  <section>
    <h2>${esc(family)}</h2>
    <div class="grid">${parts.map((part) => card(family, part)).join('')}
    </div>
  </section>`).join('');

const CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #16181d; color: #e6e6e6; font: 14px/1.5 "Pretendard", "Noto Sans KR", system-ui, sans-serif; }
main { padding: 16px; }
.top { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 10px 16px; margin: -16px -16px 16px; background: #0f1115; border-bottom: 1px solid #2c3038; }
.top strong { margin-right: auto; }
.top b { color: #fff; }
button { font: inherit; color: #e6e6e6; background: #2a2e37; border: 1px solid #3a3f4a; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
button:hover { background: #343a46; }
button.on[data-r="good"] { background: #2f6b4a; border-color: #3f8a60; }
button.on[data-r="fix"] { background: #7a5a22; border-color: #9a7530; }
button.on[data-r="drop"] { background: #6b2f2f; border-color: #8a3f3f; }
section { margin-bottom: 32px; }
h2 { font-size: 18px; margin: 16px 0 12px; color: #bfc5d0; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 440px), 1fr)); gap: 16px; }
.card { background: #1e2127; border: 1px solid #2c3038; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.card header { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.card code { color: #9fd3ff; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
figure { margin: 0; }
figure figcaption { font-size: 11px; color: #8a909c; text-align: center; }
img.shot { display: block; cursor: zoom-in; background: #111; border-radius: 4px; }
figure.wide { flex: 1 1 0; min-width: 0; }
figure.wide img.shot { width: 100%; height: auto; }
figure.tall img.shot { height: 110px; width: auto; }
.rate { display: flex; gap: 8px; }
.memo { width: 100%; font: inherit; color: #e6e6e6; background: #15171c; border: 1px solid #3a3f4a; border-radius: 6px; padding: 6px 8px; }
#ov { position: fixed; inset: 0; z-index: 10; background: rgba(0, 0, 0, 0.92); display: flex; align-items: center; justify-content: center; padding: 16px; cursor: zoom-out; }
#ov[hidden] { display: none; }
#ov img { max-width: 100%; max-height: 94vh; }
@media (max-width: 480px) { .grid { grid-template-columns: 1fr; } figure.tall img.shot { height: 90px; } }
`;

const CLIENT = `
(function () {
  var KEY = 'kit-gallery-v1';
  var LABEL = { good: '좋음', fix: '고침', drop: '버림' };
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  function get(f, p) { return (state[f] && state[f][p]) || { rating: null, memo: '' }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경: 이번 화면에서만 유지 */ } }
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  function paint(card) {
    var v = get(card.dataset.family, card.dataset.part);
    Array.prototype.forEach.call(card.querySelectorAll('button[data-r]'), function (b) {
      b.classList.toggle('on', b.dataset.r === v.rating);
    });
    card.querySelector('.memo').value = v.memo || '';
  }
  function updateCounts() {
    var c = { good: 0, fix: 0, drop: 0, none: 0 };
    cards.forEach(function (card) {
      var r = get(card.dataset.family, card.dataset.part).rating;
      if (r && c[r] !== undefined) c[r]++; else c.none++;
    });
    document.getElementById('c-good').textContent = c.good;
    document.getElementById('c-fix').textContent = c.fix;
    document.getElementById('c-drop').textContent = c.drop;
    document.getElementById('c-none').textContent = c.none;
  }
  function setField(card, key, val) {
    var f = card.dataset.family, p = card.dataset.part;
    state[f] = state[f] || {};
    var cur = get(f, p);
    state[f][p] = { rating: cur.rating, memo: cur.memo };
    state[f][p][key] = val;
    save();
    paint(card);
    updateCounts();
  }
  cards.forEach(paint);
  updateCounts();

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-r]');
    if (btn) {
      var card = btn.closest('.card');
      var cur = get(card.dataset.family, card.dataset.part).rating;
      setField(card, 'rating', cur === btn.dataset.r ? null : btn.dataset.r);
      return;
    }
    var img = e.target.closest('img.shot');
    var ov = document.getElementById('ov');
    if (img) { ov.querySelector('img').src = img.getAttribute('src'); ov.hidden = false; return; }
    if (e.target === ov || e.target.closest('#ov')) ov.hidden = true;
  });
  document.addEventListener('input', function (e) {
    if (e.target.classList.contains('memo')) setField(e.target.closest('.card'), 'memo', e.target.value);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.getElementById('ov').hidden = true;
  });
  document.getElementById('export').addEventListener('click', function () {
    var data = {};
    cards.forEach(function (card) {
      var f = card.dataset.family, p = card.dataset.part;
      data[f] = data[f] || {};
      var v = get(f, p);
      data[f][p] = { rating: v.rating, memo: v.memo || '' };
    });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kit-gallery-ratings.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
})();
`;

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>키트 부품 검수</title>
<style>${CSS}</style>
</head>
<body>
<main>
  <div class="top">
    <strong>키트 부품 검수</strong>
    <span>좋음 <b id="c-good">0</b></span>
    <span>고침 <b id="c-fix">0</b></span>
    <span>버림 <b id="c-drop">0</b></span>
    <span>미평가 <b id="c-none">0</b></span>
    <button type="button" id="export">평가 내보내기</button>
  </div>
  ${sections}
</main>
<div id="ov" hidden><img alt=""></div>
<script>${CLIENT}</script>
</body>
</html>
`;

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html, 'utf8');
console.error(`완료: ${path.join(out, 'index.html')}`);
