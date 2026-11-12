import exifr from 'exifr';
import { inflateSync, zipSync, strToU8 } from 'fflate';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const IMG = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;

type Rec = Record<string, unknown>;
type Item = { name: string; size: number; lastModified: number; data: Blob };
const records: Rec[] = [];
const thumbs: { name: string; bytes: Uint8Array }[] = [];
let busy = false;

const log = (s: string) => ($('log').textContent = s);
const bar = (p: number) => ($('bar').style.width = `${Math.round(p * 100)}%`);

/* ---------- 이미지 분석 ---------- */
function analyze(bmp: ImageBitmap) {
  const S = 96; const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bmp, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data;
  let lum = 0, sat = 0; const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  const gray = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
    const y = 0.2126 * r + 0.7152 * gg + 0.0722 * b; gray[i] = y; lum += y;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); sat += mx ? (mx - mn) / mx : 0;
    const key = ((r >> 5) << 6) | ((gg >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += r; e.g += gg; e.b += b; buckets.set(key, e);
  }
  // 라플라시안 분산 = 선명도
  let m = 0, m2 = 0, cnt = 0;
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const i = y * S + x; const l = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - S] - gray[i + S];
    m += l; m2 += l * l; cnt++;
  }
  const sharp = m2 / cnt - (m / cnt) ** 2;
  // 팔레트: 상위 버킷 중 서로 충분히 다른 색 5개
  const top = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n, e.n / (S * S)]);
  const pal: number[][] = [];
  for (const t of top) { if (pal.every((p) => Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]) > 48)) pal.push(t); if (pal.length === 5) break; }
  // dHash 9x8
  const h = document.createElement('canvas'); h.width = 9; h.height = 8; const hg = h.getContext('2d', { willReadFrequently: true })!;
  hg.drawImage(bmp, 0, 0, 9, 8); const hd = hg.getImageData(0, 0, 9, 8).data; let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const a = hd[(y * 9 + x) * 4 + 1], b = hd[(y * 9 + x + 1) * 4 + 1]; bits += a > b ? '1' : '0'; }
  const hex = bits.match(/.{4}/g)!.map((b) => parseInt(b, 2).toString(16)).join('');
  const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return {
    brightness: +(lum / (S * S) / 255).toFixed(3), saturation: +(sat / (S * S)).toFixed(3), sharpness: +sharp.toFixed(1), dhash: hex,
    palette: pal.map((p) => ({ hex: '#' + hex2(p[0]) + hex2(p[1]) + hex2(p[2]), share: +p[3].toFixed(3) })),
  };
}

async function encodeThumb(bmp: ImageBitmap, long = 960): Promise<Uint8Array> {
  const k = Math.min(1, long / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.8));
  return new Uint8Array(await blob.arrayBuffer());
}

const p2 = (n: number) => String(n).padStart(2, '0');
// EXIF 시각은 시간대 정보가 없는 '현지 벽시계 시각' → 변환 없이 그대로 기록
const wall = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const pick = (o: any, k: string[]) => Object.fromEntries(k.filter((x) => o?.[x] != null).map((x) => [x, o[x] instanceof Date ? wall(o[x]) : o[x]]));

async function processItem(it: Item, idx: number) {
  const rec: Rec = { id: idx, file: it.name, bytes: it.size, fileModified: new Date(it.lastModified).toISOString() };
  try {
    const ex = await exifr.parse(it.data, { tiff: true, exif: true, gps: true, ifd0: true, translateValues: true, reviveValues: true, mergeOutput: true } as any);
    Object.assign(rec, pick(ex, ['Make', 'Model', 'LensModel', 'Software', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'FocalLengthIn35mmFormat', 'ExposureBiasValue', 'Flash', 'WhiteBalance', 'Orientation', 'DateTimeOriginal', 'CreateDate', 'OffsetTimeOriginal', 'SubSecTimeOriginal', 'latitude', 'longitude', 'GPSAltitude', 'GPSImgDirection', 'ExifImageWidth', 'ExifImageHeight', 'ImageWidth', 'ImageHeight']));
    rec.hasExif = !!ex;
  } catch (e) { rec.hasExif = false; rec.exifError = String(e); }
  try {
    const bmp = await createImageBitmap(it.data, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    rec.width = bmp.width; rec.height = bmp.height; rec.aspect = +(bmp.width / bmp.height).toFixed(3);
    Object.assign(rec, analyze(bmp));
    (rec as any)._bmpThumb = await encodeThumb(bmp);
    bmp.close();
  } catch { rec.decodeFailed = true; }
  return rec;
}

/* ---------- 입력 수집 (폴더 / 파일 / zip) ---------- */
const stats: Record<string, number> = {};
const tally = (name: string) => { const e = (name.match(/\.([^./\\]+)$/)?.[1] ?? '(없음)').toLowerCase(); stats[e] = (stats[e] ?? 0) + 1; };
const slice = async (f: File, a: number, b: number) => new Uint8Array(await f.slice(a, b).arrayBuffer());
const dec8 = new TextDecoder('utf-8', { fatal: true }); const decKr = new TextDecoder('euc-kr');
const zname = (b: Uint8Array, utf8: boolean) => { if (utf8) return new TextDecoder().decode(b); try { return dec8.decode(b); } catch { return decKr.decode(b); } };

// zip 중앙 디렉터리(목차)를 직접 읽는 방식: 데이터 디스크립터/zip64/한글 파일명 지원, 사진 1장씩만 메모리에 올림
async function* fromZip(file: File): AsyncGenerator<Item> {
  const tail = await slice(file, Math.max(0, file.size - 65557), file.size); const dv = new DataView(tail.buffer);
  let e = -1; for (let i = tail.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip 구조를 읽을 수 없습니다 (손상됐거나 zip이 아닙니다)');
  let cdSize = dv.getUint32(e + 12, true), cdOff = dv.getUint32(e + 16, true);
  if (dv.getUint16(e + 10, true) === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {
    const l = e - 20;
    if (l >= 0 && dv.getUint32(l, true) === 0x07064b50) {
      const zo = Number(dv.getBigUint64(l + 8, true)); const z = new DataView((await slice(file, zo, zo + 56)).buffer);
      if (z.getUint32(0, true) === 0x06064b50) { cdSize = Number(z.getBigUint64(40, true)); cdOff = Number(z.getBigUint64(48, true)); }
    }
  }
  const cd = await slice(file, cdOff, cdOff + cdSize); const cv = new DataView(cd.buffer); let p = 0;
  while (p + 46 <= cd.length && cv.getUint32(p, true) === 0x02014b50) {
    const flags = cv.getUint16(p + 8, true), method = cv.getUint16(p + 10, true), dt = cv.getUint16(p + 12, true), dd = cv.getUint16(p + 14, true);
    let csize = cv.getUint32(p + 20, true), usize = cv.getUint32(p + 24, true), off = cv.getUint32(p + 42, true);
    const nl = cv.getUint16(p + 28, true), el = cv.getUint16(p + 30, true), cl = cv.getUint16(p + 32, true);
    const nm = zname(cd.subarray(p + 46, p + 46 + nl), !!(flags & 0x800));
    for (let q = p + 46 + nl, qe = q + el; q + 4 <= qe; q += 4 + cv.getUint16(q + 2, true)) {
      if (cv.getUint16(q, true) !== 1) continue; let r = q + 4;
      if (usize === 0xffffffff) { usize = Number(cv.getBigUint64(r, true)); r += 8; }
      if (csize === 0xffffffff) { csize = Number(cv.getBigUint64(r, true)); r += 8; }
      if (off === 0xffffffff) { off = Number(cv.getBigUint64(r, true)); r += 8; }
    }
    p += 46 + nl + el + cl;
    if (nm.endsWith('/')) continue;
    tally(nm);
    if (!IMG.test(nm) || nm.includes('__MACOSX') || /(^|\/)\._/.test(nm)) continue;
    if (flags & 1) { stats['(암호화-건너뜀)'] = (stats['(암호화-건너뜀)'] ?? 0) + 1; continue; }
    const lv = new DataView((await slice(file, off, off + 30)).buffer); if (lv.getUint32(0, true) !== 0x04034b50) continue;
    const ds = off + 30 + lv.getUint16(26, true) + lv.getUint16(28, true);
    const raw = await slice(file, ds, ds + csize); let data: Uint8Array;
    try {
      if (method === 0) data = raw; else if (method === 8) data = inflateSync(raw); else { stats[`(미지원 압축 ${method})`] = (stats[`(미지원 압축 ${method})`] ?? 0) + 1; continue; }
    } catch { stats['(해제 오류)'] = (stats['(해제 오류)'] ?? 0) + 1; continue; }
    const mod = new Date((dd >> 9) + 1980, ((dd >> 5) & 15) - 1, dd & 31, dt >> 11, (dt >> 5) & 63, (dt & 31) * 2).getTime();
    yield { name: nm, size: data.length, lastModified: mod, data: new Blob([data as BlobPart]) };
  }
}

async function* collect(files: File[]): AsyncGenerator<Item> {
  for (const f of files) {
    const rel = (f as any).webkitRelativePath || f.name;
    if (/\.zip$/i.test(f.name)) yield* fromZip(f);
    else { tally(rel); if (IMG.test(f.name) || f.type.startsWith('image/')) yield { name: rel, size: f.size, lastModified: f.lastModified, data: f }; }
  }
}

async function run(files: File[]) {
  if (busy) return; busy = true; records.length = 0; thumbs.length = 0; for (const k in stats) delete stats[k]; $('sum').style.display = 'none';
  const total = files.reduce((s, f) => s + f.size, 0); let seen = 0; let i = 0; const t0 = performance.now();
  try {
    for await (const it of collect(files)) {
      const rec = await processItem(it, i++); records.push(rec);
      seen += it.size; bar(Math.min(0.98, seen / Math.max(total, 1)));
      log(`${records.length}장 처리 중… ${it.name.split('/').pop()}`);
      if (i % 20 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    if (!records.length) { const t = Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}개`).join(', '); log('사진을 찾지 못했습니다. 발견된 파일: ' + (t || '없음') + ' — 이 문구를 Claude에게 알려주세요.'); bar(0); return; }
    finish(); log(`완료: ${records.length}장 · ${((performance.now() - t0) / 1000).toFixed(1)}초`); bar(1);
  } catch (e) { log('오류: ' + e); } finally { busy = false; }
}

/* ---------- 결과 ---------- */
let bundle: Uint8Array | null = null;
function finish() {
  const getT = (r: Rec) => Date.parse((r.DateTimeOriginal as string) ?? (r.CreateDate as string) ?? (r.fileModified as string));
  records.sort((a, b) => getT(a) - getT(b) || String(a.file).localeCompare(String(b.file)));
  records.forEach((r, k) => { r.id = k; r.timeSource = r.DateTimeOriginal ? 'exif' : r.CreateDate ? 'exif-create' : 'file-modified'; });
  const max = Math.min(+($('maxThumb') as HTMLInputElement).value || 0, records.length);
  const withThumb = records.filter((r) => (r as any)._bmpThumb);
  const sel = new Set<Rec>(); for (let k = 0; k < Math.min(max, withThumb.length); k++) sel.add(withThumb[Math.floor((k * withThumb.length) / Math.min(max, withThumb.length))]);
  const files: Record<string, Uint8Array> = {};
  for (const r of records) {
    const t: Uint8Array | undefined = (r as any)._bmpThumb; delete (r as any)._bmpThumb;
    if (t && sel.has(r)) { const n = `thumbs/${String(r.id).padStart(4, '0')}.jpg`; files[n] = t; r.thumb = n; }
  }
  const gps = records.filter((r) => r.latitude != null).length, exif = records.filter((r) => r.hasExif && r.DateTimeOriginal).length;
  const ts = records.filter((r) => r.timeSource !== 'file-modified').map(getT).filter((n) => !isNaN(n)); const cams = [...new Set(records.map((r) => `${r.Make ?? ''} ${r.Model ?? ''}`.trim()).filter(Boolean))];
  const summary = { count: records.length, withExifTime: exif, withGps: gps, decodeFailed: records.filter((r) => r.decodeFailed).length, from: ts.length ? wall(new Date(Math.min(...ts))) : null, to: ts.length ? wall(new Date(Math.max(...ts))) : null, cameras: cams, generatedAt: new Date().toISOString(), tool: 'photo-ingest/1' };
  files['metadata.json'] = strToU8(JSON.stringify({ summary, photos: records }, null, 1));
  bundle = zipSync(files, { level: 0 });
  const kv = [['사진 수', records.length], ['촬영시각(EXIF)', `${exif}장`], ['GPS 위치', `${gps}장`], ['기간', ts.length ? `${new Date(Math.min(...ts)).toLocaleDateString()} ~ ${new Date(Math.max(...ts)).toLocaleDateString()}` : '-'], ['카메라', cams.join(', ') || '-'], ['미리보기 포함', `${sel.size}장`], ['결과 크기', `${(bundle.length / 1048576).toFixed(1)} MB`]];
  $('kv').innerHTML = kv.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
  const all: Record<string, number> = {}; records.forEach((r) => (r.palette as any[] | undefined)?.slice(0, 2).forEach((p) => (all[p.hex] = (all[p.hex] ?? 0) + p.share)));
  $('sw').innerHTML = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([h]) => `<i style="background:${h}"></i>`).join('');
  $('sum').style.display = 'block';
  (window as any).__summary = summary;
}

$('dl').onclick = () => {
  if (!bundle) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bundle as BlobPart], { type: 'application/zip' })); a.download = 'photo-bundle.zip'; a.click();
};
const getBundle = () => bundle; (window as any).__getBundle = getBundle;

const drop = $('drop');
['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('on'); }));
['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('on'); }));
async function walk(entry: any, out: File[]) {
  if (entry.isFile) await new Promise<void>((r) => entry.file((f: File) => { Object.defineProperty(f, 'webkitRelativePath', { value: entry.fullPath.slice(1) }); out.push(f); r(); }));
  else if (entry.isDirectory) { const rd = entry.createReader(); for (;;) { const ents: any[] = await new Promise((r) => rd.readEntries(r)); if (!ents.length) break; for (const e of ents) await walk(e, out); } }
}
drop.addEventListener('drop', async (ev) => {
  const items = Array.from((ev as DragEvent).dataTransfer?.items ?? []); const out: File[] = [];
  for (const it of items) { const en = (it as any).webkitGetAsEntry?.(); if (en) await walk(en, out); }
  const dtFiles = Array.from((ev as DragEvent).dataTransfer?.files ?? []);
  run(out.length ? out : dtFiles);
});
$<HTMLInputElement>('fDir').onchange = (e) => run(Array.from((e.target as HTMLInputElement).files ?? []));
$<HTMLInputElement>('fFiles').onchange = (e) => run(Array.from((e.target as HTMLInputElement).files ?? []));
