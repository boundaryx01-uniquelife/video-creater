// 초등 활동 영상 스킬의 명령줄 도구. Claude(스킬)가 사진을 보고 판단한 내용을 spec.json 으로 적으면, 이 도구가 검증·구성·미리보기·렌더를 맡는다.
// 사용: node --experimental-strip-types --no-warnings tools/school-video/cli.ts <ingest|build|stills|render|status> ...
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import exifr from 'exifr';
import type { PhotoSpec } from '../../src/analysis/videoData.ts';
import { THEMES, planElem, clampPace, type ElemProps } from '../../src/elem/types.ts';
import { curate, hamming, secondsOf } from '../../src/elem/curate.ts';
import { parseGoal } from '../../src/elem/rules.ts';
import { rangeOf, splitByGaps, timeNames } from '../../src/elem/arrange.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), cmd = args[0];
const opt = (k: string, d = '') => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] ?? '' : d; };
const flag = (k: string) => args.includes('--' + k);
const die = (m: string): never => { console.error('오류: ' + m); process.exit(1); };
const z = (n: number, w = 2) => String(n).padStart(w, '0'), WD = ['일', '월', '화', '수', '목', '금', '토'];
const readJson = (f: string) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return die(`${f} 을(를) 읽지 못했습니다: ${(e as Error).message}`); } };
const chars = (s: string) => [...s].length;

type Lib = { id: number; file: string; name: string; time: string; date: string; wd: string; ts: number | null; aspect: number; w: number; h: number; q: number; hash: string; dupOf: number | null; blurry: boolean };
export type Spec = {
  goal?: string; school: string; klass: string; kicker: string; title: string; day: string; place: string;
  theme: string; aspect: '16:9' | '9:16'; targetSec: number; pace?: number;
  intro: number[];
  chapters: { title: string; sub: string; photos: number[]; captions?: Record<string, string>; quote?: { text: string; name: string } | null }[];
  focus?: Record<string, [number, number]>;
  stats?: boolean | { label: string; n: number; unit: string }[];
  outro: { title: string; message: string };
  parentNote?: string;
};

/* ---------- 사진 읽기 ---------- */
const IMG = /\.(jpe?g|png|webp|heic|heif)$/i;
async function decode(file: string): Promise<sharp.Sharp> {
  const buf = fs.readFileSync(file);
  try { const s = sharp(buf, { failOn: 'none' }).rotate(); await s.clone().metadata(); await s.clone().resize(8, 8).raw().toBuffer(); return s; } catch (e) {
    if (!/\.(heic|heif)$/i.test(file)) throw e;
    // sharp 기본 빌드는 아이폰 HEIC(HEVC)를 못 읽는 경우가 있어 libheif(WebAssembly)로 푼다
    const mod: any = await import('libheif-js/wasm-bundle.js'), lib = mod.default ?? mod, img = new lib.HeifDecoder().decode(buf)[0]; if (!img) throw new Error('HEIC를 읽지 못했습니다');
    const w = img.get_width(), h = img.get_height();
    const data: Uint8ClampedArray = await new Promise((ok, no) => img.display({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }, (d: any) => (d ? ok(d.data) : no(new Error('HEIC 변환 실패')))));
    return sharp(Buffer.from(data.buffer), { raw: { width: w, height: h, channels: 4 } });
  }
}
/** 선명도(라플라시안)·노출 점수 0~1. 스튜디오(src/studio/image.ts)와 같은 계산 */
async function quality(s: sharp.Sharp): Promise<number> {
  const { data, info } = await s.clone().resize(192, 192, { fit: 'inside' }).greyscale().raw().toBuffer({ resolveWithObject: true }), w = info.width, h = info.height;
  let mean = 0; for (let i = 0; i < w * h; i++) mean += data[i]; mean /= w * h; let v = 0, n = 0;
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) { const l = 4 * data[j * w + i] - data[j * w + i - 1] - data[j * w + i + 1] - data[(j - 1) * w + i] - data[(j + 1) * w + i]; v += l * l; n++; }
  return +(0.7 * Math.min(1, Math.sqrt(v / Math.max(1, n)) / 40) + 0.3 * (1 - Math.min(1, Math.abs(mean - 125) / 125))).toFixed(3);
}
async function dhash(s: sharp.Sharp): Promise<string> {
  const d = await s.clone().resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer(); let bits = '';
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) bits += d[j * 9 + i] < d[j * 9 + i + 1] ? '1' : '0';
  let hex = ''; for (let k = 0; k < 64; k += 4) hex += parseInt(bits.slice(k, k + 4), 2).toString(16); return hex;
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function ingest() {
  const src = path.resolve(args[1] ?? die('사진 폴더를 지정하세요: ingest <사진 폴더> --out <작업 폴더>')), out = path.resolve(opt('out') || die('--out <작업 폴더> 가 필요합니다'));
  if (!fs.existsSync(src)) die(`사진 폴더가 없습니다: ${src}`);
  const files = fs.readdirSync(src).filter((f) => IMG.test(f)).sort(); if (!files.length) die('폴더에 사진(JPG·PNG·WebP·HEIC)이 없습니다.');
  fs.mkdirSync(path.join(out, 'media'), { recursive: true }); fs.mkdirSync(path.join(out, 'sheets'), { recursive: true });
  const raw: (Omit<Lib, 'id' | 'file' | 'dupOf' | 'blurry'> & { tmp: Buffer })[] = [], failed: string[] = [];
  for (const [k, f] of files.entries()) {
    try {
      const full = path.join(src, f), s = await decode(full);
      let when: Date | null = null; try { const ex = await exifr.parse(fs.readFileSync(full), { pick: ['DateTimeOriginal', 'CreateDate'] } as any); const d = ex?.DateTimeOriginal ?? ex?.CreateDate; if (d instanceof Date && !isNaN(+d)) when = d; } catch { /* EXIF 없음 */ }
      const { data, info } = await s.clone().resize(2560, 2560, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
      raw.push({ name: f, tmp: data, w: info.width, h: info.height, aspect: +(info.width / info.height).toFixed(3), q: await quality(s), hash: await dhash(s), ts: when ? +when : null,
        time: when ? `${z(when.getHours())}:${z(when.getMinutes())}` : '', date: when ? `${when.getFullYear()}.${z(when.getMonth() + 1)}.${z(when.getDate())}` : '', wd: when ? WD[when.getDay()] : '' });
      if ((k + 1) % 10 === 0) console.error(`  ${k + 1}/${files.length} 처리`);
    } catch (e) { failed.push(`${f}(${String((e as Error).message).slice(0, 60)})`); }
  }
  if (!raw.length) die('읽을 수 있는 사진이 없습니다: ' + failed.join(', '));
  raw.sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity) || a.name.localeCompare(b.name));
  const lib: Lib[] = raw.map((r, i) => { const { tmp, ...rest } = r, file = `media/${z(i + 1, 3)}.jpg`; fs.writeFileSync(path.join(out, file), tmp); return { id: i + 1, file, ...rest, dupOf: null, blurry: false }; });
  // 비슷한 사진(직전 3장과 비교)·흐린 사진 표시 — 최종 판단은 사진을 직접 보고 한다
  lib.forEach((p, i) => { for (let j = Math.max(0, i - 3); j < i; j++) if (hamming(lib[j].hash, p.hash) <= 8) { p.dupOf = lib[j].dupOf ?? lib[j].id; break; } });
  const med = [...lib].map((p) => p.q).sort((a, b) => a - b)[Math.floor(lib.length / 2)]; lib.forEach((p) => { p.blurry = p.q < med * 0.45; });
  fs.writeFileSync(path.join(out, 'photos.json'), JSON.stringify(lib, null, 1));
  // 한눈에 보기(사진 12장씩): 번호·시각·표시를 붙인 모아보기 이미지
  const CW = 480, CH = 360, LB = 44, per = 12, cols = 4; let sheets = 0;
  for (let s0 = 0; s0 < lib.length; s0 += per) {
    const part = lib.slice(s0, s0 + per), rows = Math.ceil(part.length / cols), comps: sharp.OverlayOptions[] = [];
    for (const [k, p] of part.entries()) {
      const x = (k % cols) * CW, y = Math.floor(k / cols) * (CH + LB);
      comps.push({ input: await sharp(path.join(out, p.file)).resize(CW - 8, CH - 8, { fit: 'contain', background: '#1b1d24' }).toBuffer(), left: x + 4, top: y + 4 });
      const tag = [p.time, p.dupOf ? `≈#${p.dupOf}` : '', p.blurry ? '흐림' : '', p.aspect < 1 ? '세로' : ''].filter(Boolean).join(' · ');
      comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${LB}"><rect width="100%" height="100%" fill="#1b1d24"/><text x="12" y="31" font-family="sans-serif" font-size="22" fill="#e8e2d3"><tspan font-size="26" font-weight="700" fill="#ffd45e">#${p.id}</tspan><tspan dx="14">${esc(tag)}</tspan></text></svg>`), left: x, top: y + CH });
    }
    await sharp({ create: { width: cols * CW, height: rows * (CH + LB), channels: 3, background: '#0e0f12' } }).composite(comps).jpeg({ quality: 82 }).toFile(path.join(out, 'sheets', `sheet-${z(++sheets)}.jpg`));
  }
  // 자동 초안(spec.json): 시각으로 활동을 나누고, 비슷한·흐린 사진을 빼고, 길이에 맞춘 출발점
  const brief = parseGoal(opt('goal')), asPhoto = (p: Lib): PhotoSpec => ({ src: p.file, aspect: p.aspect, time: p.time, date: p.date, wd: p.wd, hex: '#888', exif: '', model: '', fy: p.aspect < 0.9 ? 0.36 : 0.45, fx: 0.5, cap: { chip: p.time, title: '', sub: '' }, ts: p.ts ?? undefined, q: p.q, h: p.hash });
  const idOf = new Map(lib.map((p) => [p.file, p.id])), photos = lib.map(asPhoto);
  let groups = splitByGaps(photos); if (!groups) { const n = Math.min(4, Math.max(1, Math.round(photos.length / 8))), per2 = Math.ceil(photos.length / n); groups = Array.from({ length: n }, (_, i) => photos.slice(i * per2, (i + 1) * per2)).filter((g) => g.length); }
  const names = timeNames(groups), first = lib.find((p) => p.date);
  const base: ElemProps = { school: brief.school, klass: brief.klass, kicker: first ? first.date.slice(0, 4) : '', title: '', day: first ? `${first.date} (${first.wd})` : '', place: '', introPhotos: [], chapters: groups.map((g, i) => ({ title: names[i], sub: rangeOf(g), photos: g })), outro: { title: '오늘도\n수고했어요!', message: '함께해 주셔서 감사합니다.' } };
  const cur = curate(base, brief.targetSec).props, heroes = cur.chapters.map((c) => [...c.photos].filter((p) => p.aspect >= 1.2).sort((a, b) => (b.q ?? 0) - (a.q ?? 0))[0] ?? c.photos[0]).slice(0, 3);
  const spec: Spec = { goal: opt('goal'), school: brief.school, klass: brief.klass, kicker: base.kicker, title: '', day: base.day, place: '', theme: brief.theme, aspect: brief.aspect, targetSec: brief.targetSec, pace: cur.pace ?? 1,
    intro: heroes.map((p) => idOf.get(p.src)!), chapters: cur.chapters.map((c) => ({ title: c.title, sub: c.sub, photos: c.photos.map((p) => idOf.get(p.src)!), captions: {}, quote: null })), focus: {}, stats: true, outro: base.outro, parentNote: '' };
  const specFile = path.join(out, 'spec.json'); if (fs.existsSync(specFile) && !flag('force')) console.error('  spec.json 이 이미 있어 그대로 둡니다(새로 만들려면 --force). 초안은 spec.draft.json 에 씁니다.');
  fs.writeFileSync(fs.existsSync(specFile) && !flag('force') ? path.join(out, 'spec.draft.json') : specFile, JSON.stringify(spec, null, 1));
  console.log(`사진 ${lib.length}장을 읽었습니다${failed.length ? ` (읽지 못한 파일 ${failed.length}개: ${failed.slice(0, 5).join(', ')})` : ''}.`);
  console.log(`촬영: ${first ? `${first.date} (${first.wd})` : '날짜 정보 없음'} · 시각 없는 사진 ${lib.filter((p) => !p.time).length}장 · 비슷한 사진 표시 ${lib.filter((p) => p.dupOf).length}장 · 흐림 표시 ${lib.filter((p) => p.blurry).length}장`);
  console.log(`활동 초안 ${groups.length}개: ` + groups.map((g, i) => `${names[i]}(${rangeOf(g) || '시각 없음'}, #${idOf.get(g[0].src)}–#${idOf.get(g[g.length - 1].src)}, ${g.length}장)`).join(' / '));
  console.log(`모아보기: ${path.join(out, 'sheets')}/sheet-01.jpg … sheet-${z(sheets)}.jpg (${sheets}장) — 이 이미지를 보고 사진을 고르세요. 한 장을 크게 보려면 ${path.join(out, 'media')}/NNN.jpg`);
  console.log(`초안 구성: ${specFile} (목표 ${brief.targetSec}초, ${brief.aspect}, 색 ${brief.theme}) — 사진을 본 뒤 고쳐서 build 하세요.`);
}

/* ---------- spec.json → video.json ---------- */
function build(quiet = false): { props: ElemProps; spec: Spec; dir: string; warn: string[] } {
  const dir = path.resolve(args[1] ?? die('작업 폴더를 지정하세요')), spec: Spec = readJson(path.join(dir, 'spec.json')), lib: Lib[] = readJson(path.join(dir, 'photos.json'));
  const byId = new Map(lib.map((p) => [p.id, p])), warn: string[] = [], err: string[] = [];
  const cut = (s: unknown, n: number, what: string) => { const t = String(s ?? '').trim(); if (chars(t) > n) { warn.push(`${what}이(가) ${n}자를 넘어 잘립니다: “${t}”`); return [...t].slice(0, n).join(''); } return t; };
  const lines = (s: unknown, maxLines: number, n: number, what: string) => { const ls = String(s ?? '').split('\n').map((x) => x.trim()).filter(Boolean); if (ls.length > maxLines) warn.push(`${what}은(는) 최대 ${maxLines}줄입니다(넘는 줄은 버림)`); return ls.slice(0, maxLines).map((x, i) => cut(x, n, `${what} ${i + 1}번째 줄`)).join('\n'); };
  if (!THEMES[spec.theme]) { warn.push(`알 수 없는 색 테마 “${spec.theme}” → sunny 사용 (가능: ${Object.keys(THEMES).join(', ')})`); spec.theme = 'sunny'; }
  if (!Array.isArray(spec.chapters) || !spec.chapters.length) err.push('chapters 가 비어 있습니다(활동이 1개 이상 필요).');
  if (!String(spec.title ?? '').trim()) err.push('title(제목)이 비어 있습니다.');
  const used = new Map<number, number>();
  const photo = (id: number, where: string, cap = ''): PhotoSpec | null => { const p = byId.get(Number(id)); if (!p) { err.push(`${where}: 사진 #${id} 이(가) 없습니다(1–${lib.length}).`); return null; }
    const f = spec.focus?.[String(id)], fx = f ? Math.max(0, Math.min(1, Number(f[0]))) : 0.5, fy = f ? Math.max(0, Math.min(1, Number(f[1]))) : p.aspect < 0.9 ? 0.36 : 0.45;
    return { src: p.file, aspect: p.aspect, time: p.time, date: p.date, wd: p.wd, hex: '#888', exif: '', model: '', fx: Number.isFinite(fx) ? fx : 0.5, fy: Number.isFinite(fy) ? fy : 0.45, cap: { chip: p.time, title: cap, sub: '' }, ts: p.ts ?? undefined, q: p.q, h: p.hash }; };
  const chapters = (spec.chapters ?? []).map((c, i) => {
    const where = `${i + 1}번째 활동`; if (!Array.isArray(c.photos) || !c.photos.length) err.push(`${where}에 사진이 없습니다.`);
    const ph = (c.photos ?? []).map((id) => { used.set(id, (used.get(id) ?? 0) + 1); return photo(id, where, cut(c.captions?.[String(id)] ?? '', 16, `${where} #${id} 자막`)); }).filter(Boolean) as PhotoSpec[];
    for (const k of Object.keys(c.captions ?? {})) if (!(c.photos ?? []).includes(Number(k))) warn.push(`${where}: 자막이 달린 #${k} 은(는) 이 활동의 사진이 아닙니다(무시).`);
    const q = c.quote && String(c.quote.text ?? '').trim() ? { text: lines(c.quote.text, 2, 22, `${where} 한마디`), name: cut(c.quote.name, 12, `${where} 한마디 이름`) } : undefined;
    return { title: cut(c.title, 14, `${where} 이름`) || `활동 ${i + 1}`, sub: cut(c.sub, 24, `${where} 부제`), photos: ph, quote: q };
  });
  for (const [id, n] of used) if (n > 1) warn.push(`사진 #${id} 이(가) ${n}번 쓰였습니다.`);
  const intro = (spec.intro ?? []).slice(0, 3).map((id) => photo(id, '인트로')).filter(Boolean) as PhotoSpec[];
  if (err.length) die('spec.json 을 고쳐야 합니다:\n  - ' + err.join('\n  - '));
  const total = chapters.reduce((a, c) => a + c.photos.length, 0);
  let props: ElemProps = { school: cut(spec.school, 20, '학교') || '우리 학교', klass: cut(spec.klass, 12, '학년·반'), kicker: cut(spec.kicker, 14, '상단 문구'), title: lines(spec.title, 2, 14, '제목'), day: cut(spec.day, 20, '날짜'), place: cut(spec.place, 16, '장소'),
    introPhotos: (intro.length ? intro : chapters.map((c) => c.photos[0]).slice(0, 3)).map((p) => p.src), chapters,
    stats: Array.isArray(spec.stats) ? spec.stats.slice(0, 4).map((x) => ({ label: cut(x.label, 10, '숫자 라벨'), n: Number(x.n) || 0, unit: cut(x.unit, 3, '단위') })) : spec.stats === false ? [] : [{ label: '남긴 사진', n: total, unit: '장' }, { label: '함께한 활동', n: chapters.length, unit: '가지' }],
    outro: { title: lines(spec.outro?.title, 2, 10, '마무리 큰 글') || '오늘도\n수고했어요!', message: lines(spec.outro?.message, 3, 36, '마무리 인사') }, pace: clampPace(spec.pace), theme: spec.theme };
  // 길이 맞추기: 고른 사진은 건드리지 않고 장면 속도만(0.7~1.5배) 조정한다
  const target = Math.max(20, Math.min(180, Number(spec.targetSec) || 60));
  if (flag('fit')) { const natural = secondsOf({ ...props, pace: 1 }); props = { ...props, pace: +clampPace(target / natural).toFixed(2) }; fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify({ ...spec, pace: props.pace }, null, 1)); } // 맞춘 속도는 spec.json 에 적어 둔다
  const sec = secondsOf(props);
  if (Math.abs(sec - target) > target * 0.12) warn.push(`길이 ${sec.toFixed(0)}초가 목표 ${target}초와 12% 넘게 다릅니다 → 사진 수를 ${sec > target ? '줄이거나' : '늘리거나'} --fit(속도 조정)을 쓰세요. 지금 속도 ${props.pace}배(범위 0.7~1.5).`);
  fs.writeFileSync(path.join(dir, 'video.json'), JSON.stringify(props));
  if (!quiet) {
    console.log(`구성 완료: ${sec.toFixed(1)}초 (목표 ${target}초, 속도 ${props.pace}배) · ${spec.aspect === '9:16' ? '세로 9:16' : '가로 16:9'} · 색 ${props.theme} · 사진 ${total}/${lib.length}장 사용`);
    chapters.forEach((c, i) => console.log(`  ${i + 1}. ${c.title} (${c.sub || '-'}) — ${c.photos.length}장: ${spec.chapters[i].photos.map((id) => '#' + id).join(' ')}${c.quote ? ' + 한마디' : ''}`));
    if (warn.length) console.log('주의:\n  - ' + warn.join('\n  - '));
  }
  return { props, spec, dir, warn };
}

/* ---------- 렌더 준비: 번들(캐시) + 사진 제공 서버 ---------- */
async function engine(dir: string) {
  const { bundle } = await import('@remotion/bundler'), R = await import('@remotion/renderer');
  const cache = path.join(ROOT, '.cache', 'skill-bundle'), stampFile = path.join(cache, '.stamp');
  let newest = 0; const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else newest = Math.max(newest, fs.statSync(f).mtimeMs); } }; walk(path.join(ROOT, 'src'));
  const stamp = String(newest);
  if (!(fs.existsSync(path.join(cache, 'index.html')) && fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === stamp)) {
    console.error('  영상 엔진 준비 중(처음 한 번, 10–30초)…'); fs.rmSync(cache, { recursive: true, force: true });
    await bundle({ entryPoint: path.join(ROOT, 'src/remotion/index.ts'), publicDir: path.join(ROOT, 'public'), outDir: cache }); fs.writeFileSync(stampFile, stamp);
  }
  const media = path.join(dir, 'media');
  const server = http.createServer((req, res) => { const f = path.join(media, path.basename(decodeURIComponent((req.url ?? '').split('?')[0]))); if (!f.startsWith(media) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); } res.setHeader('content-type', 'image/jpeg'); res.setHeader('access-control-allow-origin', '*'); fs.createReadStream(f).pipe(res); });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok)); const port = (server.address() as any).port;
  const abs = (p: ElemProps): ElemProps => JSON.parse(JSON.stringify(p).replaceAll('"media/', `"http://127.0.0.1:${port}/`));
  return { R, serveUrl: cache, abs, close: () => server.close(), browserExecutable: process.env.CHROME_BIN || undefined };
}

async function stills() {
  const { props, spec, dir } = build(true), E = await engine(dir), inputProps = E.abs(props) as any;
  try {
    const id = 'elem-video-sample' + (spec.aspect === '9:16' ? '-vertical' : ''), comp = await E.R.selectComposition({ serveUrl: E.serveUrl, id, inputProps, browserExecutable: E.browserExecutable });
    const { scenes } = planElem(props), KO: Record<string, string> = { intro: '인트로', title: '활동 제목', page: '사진', quote: '한마디', stats: '기록', outro: '마무리' };
    const vert = spec.aspect === '9:16', tw = vert ? 270 : 480, th = vert ? 480 : 270, LB = 34, cols = vert ? 6 : 4, tmp = path.join(dir, '.stills'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    const comps: sharp.OverlayOptions[] = [];
    for (const [k, s] of scenes.entries()) {
      const f = path.join(tmp, `${z(k)}.jpg`); await E.R.renderStill({ composition: comp, serveUrl: E.serveUrl, frame: Math.min(comp.durationInFrames - 1, s.from + Math.min(s.dur - 2, 50)), output: f, inputProps, imageFormat: 'jpeg', jpegQuality: 80, scale: tw / comp.width, browserExecutable: E.browserExecutable });
      const x = (k % cols) * tw, y = Math.floor(k / cols) * (th + LB), label = `${k + 1}. ${KO[s.type]}${'ci' in s ? ' ' + (s.ci + 1) : ''} · ${(s.from / 30).toFixed(0)}초`;
      comps.push({ input: f, left: x, top: y }, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${LB}"><rect width="100%" height="100%" fill="#14161c"/><text x="8" y="23" font-family="sans-serif" font-size="18" fill="#e8e2d3">${esc(label)}</text></svg>`), left: x, top: y + th });
    }
    const rows = Math.ceil(scenes.length / cols), outFile = path.join(dir, 'preview.jpg');
    await sharp({ create: { width: cols * tw, height: rows * (th + LB), channels: 3, background: '#0e0f12' } }).composite(comps).jpeg({ quality: 84 }).toFile(outFile); fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`미리보기: ${outFile} (장면 ${scenes.length}개, ${secondsOf(props).toFixed(1)}초) — 글자가 넘치거나 사진이 이상하게 잘린 곳이 없는지 확인하세요.`);
  } finally { E.close(); }
}

async function render() {
  const { props, spec, dir, warn } = build(true), E = await engine(dir), inputProps = E.abs(props) as any;
  try {
    const id = 'elem-video-sample' + (spec.aspect === '9:16' ? '-vertical' : ''), comp = await E.R.selectComposition({ serveUrl: E.serveUrl, id, inputProps, browserExecutable: E.browserExecutable });
    const q = opt('quality', '720') === '1080' ? '1080' : '720', outFile = path.resolve(opt('output') || path.join(dir, 'video.mp4')); let last = -1;
    await E.R.renderMedia({ composition: comp, serveUrl: E.serveUrl, codec: 'h264', outputLocation: outFile, inputProps, browserExecutable: E.browserExecutable, chromiumOptions: { gl: 'angle' }, crf: 20, scale: q === '720' ? 2 / 3 : 1,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.error(`  렌더 ${p * 10}%`); } } });
    console.log(`완성: ${outFile} · ${(comp.durationInFrames / 30).toFixed(1)}초 · ${spec.aspect === '9:16' ? (q === '720' ? '720×1280' : '1080×1920') : q === '720' ? '1280×720' : '1920×1080'} · ${(fs.statSync(outFile).size / 1e6).toFixed(1)}MB`);
    if (warn.length) console.log('주의:\n  - ' + warn.join('\n  - '));
  } finally { E.close(); }
}

function status() { const { props, spec, dir } = build(true); const lib: Lib[] = readJson(path.join(dir, 'photos.json')), used = new Set(spec.chapters.flatMap((c) => c.photos));
  console.log(JSON.stringify({ seconds: +secondsOf(props).toFixed(1), targetSec: spec.targetSec, aspect: spec.aspect, theme: props.theme, pace: props.pace, title: props.title, chapters: spec.chapters.map((c) => ({ title: c.title, sub: c.sub, photos: c.photos, captions: c.captions ?? {}, quote: c.quote ?? null })), unused: lib.filter((p) => !used.has(p.id)).map((p) => p.id), themes: Object.keys(THEMES) }, null, 1)); }

if (cmd === 'ingest') await ingest(); else if (cmd === 'build') build(); else if (cmd === 'stills') await stills(); else if (cmd === 'render') await render(); else if (cmd === 'status') status();
else { console.log('사용: cli.ts ingest <사진 폴더> --out <작업 폴더> [--goal "목적 문장"] [--force]\n      cli.ts build <작업 폴더> [--fit]\n      cli.ts stills <작업 폴더>\n      cli.ts render <작업 폴더> [--quality 720|1080] [--output 파일.mp4]\n      cli.ts status <작업 폴더>'); process.exit(cmd ? 1 : 0); }
