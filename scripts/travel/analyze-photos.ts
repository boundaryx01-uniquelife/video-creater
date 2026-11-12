// 서버(Node)용 사진 분석: 원본 파일 → RawPhoto(분석 엔진 src/analysis 의 입력 형식) + 영상용 사진 파일.
// EXIF(GPS·촬영 시각·카메라)는 exifr, 크기·선명도·밝기·채도·dhash·팔레트는 sharp로 구한다.
// 계산 방식은 브라우저용 수집 도구(photo-ingest)와 같다: 96×96 축소본의 밝기 평균, HSV 채도 평균, 라플라시안 분산, 9×8 dhash, 3비트 양자화 팔레트.
// 영상에 쓰는 사진은 EXIF(위치 포함)를 지운 JPEG로 저장한다.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';
import type { RawPhoto } from '../../src/analysis/types.ts';

export type AnalyzeIn = { path: string; name: string };
export type AnalyzeOut = { raw: RawPhoto[]; failed: { name: string; reason: string }[] };

const MAX_SIDE = 2000, THUMB_SIDE = 320;
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** "2026:05:03 09:00:00" → "2026-05-03T09:00:00" (현지 벽시계 시각, 시간대 변환 없음) */
function wallTime(v: unknown): string | undefined {
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 19);
  const m = /^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(v ?? ''));
  if (!m || m[1] === '0000') return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

function pixelStats(rgb: Buffer, g9: Buffer) {
  const N = 96 * 96, luma = new Float32Array(N), buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let sum = 0, sat = 0;
  for (let i = 0; i < N; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2], l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luma[i] = l; sum += l;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx ? (mx - mn) / mx : 0;
    const k = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5), e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; buckets.set(k, e);
  }
  let c = 0, u = 0, h = 0;
  for (let y = 1; y < 95; y++) for (let x = 1; x < 95; x++) { const i = y * 96 + x, v = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - 96] - luma[i + 96]; c += v; u += v * v; h++; }
  const sharpness = u / h - (c / h) ** 2;
  const cols = [...buckets.values()].sort((a, b) => b.n - a.n).map((d) => [d.r / d.n, d.g / d.n, d.b / d.n, d.n / N]);
  const pal: number[][] = [];
  for (const d of cols) { if (pal.every((w) => Math.hypot(w[0] - d[0], w[1] - d[1], w[2] - d[2]) > 48)) pal.push(d); if (pal.length === 5) break; }
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += g9[y * 9 + x] > g9[y * 9 + x + 1] ? '1' : '0';
  const dhash = (bits.match(/.{4}/g) as string[]).map((q) => parseInt(q, 2).toString(16)).join('');
  return {
    brightness: +(sum / N / 255).toFixed(3), saturation: +(sat / N).toFixed(3), sharpness: +sharpness.toFixed(1), dhash,
    palette: pal.map((d) => ({ hex: '#' + hex2(d[0]) + hex2(d[1]) + hex2(d[2]), share: +d[3].toFixed(3) })),
  };
}

/** 사진 1장 분석. mediaDir 에 tr_NNNN.jpg(영상용), th_NNNN.jpg(편집 화면 썸네일)를 쓴다. thumb 은 out 폴더 기준 상대 경로 */
export async function analyzeOne(file: AnalyzeIn, id: number, mediaDir: string): Promise<RawPhoto> {
  const buf = fs.readFileSync(file.path);
  let ex: any = {};
  try { ex = (await exifr.parse(buf, { gps: true, exif: true, ifd0: true, tiff: true, reviveValues: false, translateValues: false, mergeOutput: true } as any)) ?? {}; } catch { /* EXIF 없음 */ }
  const base = sharp(buf, { failOn: 'none' }).rotate(), meta = await sharp(buf, { failOn: 'none' }).metadata();
  if (!meta.width || !meta.height) throw new Error('이미지 크기를 읽을 수 없습니다');
  const swap = (meta.orientation ?? 1) >= 5, width = swap ? meta.height : meta.width, height = swap ? meta.width : meta.height;
  const num = String(id).padStart(4, '0'), thumb = `media/tr_${num}.jpg`;
  await base.clone().resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(path.join(mediaDir, `tr_${num}.jpg`));
  await base.clone().resize(THUMB_SIDE, THUMB_SIDE, { fit: 'inside' }).jpeg({ quality: 70 }).toFile(path.join(mediaDir, `th_${num}.jpg`));
  const rgb = await base.clone().resize(96, 96, { fit: 'fill' }).toColourspace('srgb').removeAlpha().raw().toBuffer();
  const g9 = await base.clone().resize(9, 8, { fit: 'fill' }).toColourspace('b-w').raw().toBuffer();
  // dhash 는 초록 채널 기준이었으나 흑백(밝기)로 계산해도 연사 판별에는 차이가 없다
  const dt = wallTime(ex.DateTimeOriginal) ?? wallTime(ex.CreateDate), tsrc = wallTime(ex.DateTimeOriginal) ? 'exif' : dt ? 'exif-create' : undefined;
  const lat = typeof ex.latitude === 'number' && isFinite(ex.latitude) ? ex.latitude : undefined, lon = typeof ex.longitude === 'number' && isFinite(ex.longitude) ? ex.longitude : undefined;
  const gps = lat != null && lon != null && !(lat === 0 && lon === 0);
  return {
    id, file: file.name, width, height, aspect: +(width / height).toFixed(3), bytes: buf.length,
    ...(dt ? { DateTimeOriginal: dt, timeSource: tsrc } : { timeSource: 'none' }),
    ...(gps ? { latitude: +lat!.toFixed(6), longitude: +lon!.toFixed(6) } : {}),
    Make: ex.Make ? String(ex.Make).trim() : undefined, Model: ex.Model ? String(ex.Model).trim() : undefined,
    ...pixelStats(rgb, g9), thumb,
  };
}

/** 여러 장을 동시 4개씩 분석. 읽지 못한 파일은 failed 에 이유와 함께 담는다 */
export async function analyzePhotos(files: AnalyzeIn[], outDir: string, onProgress?: (done: number, total: number) => void): Promise<AnalyzeOut> {
  const mediaDir = path.join(outDir, 'media'); fs.mkdirSync(mediaDir, { recursive: true });
  const raw: RawPhoto[] = [], failed: AnalyzeOut['failed'] = []; let next = 0, done = 0;
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, async () => {
    for (;;) {
      const k = next++; if (k >= files.length) return;
      try { raw.push(await analyzeOne(files[k], k, mediaDir)); } catch (e: any) { failed.push({ name: files[k].name, reason: String(e?.message ?? e).slice(0, 120) }); }
      onProgress?.(++done, files.length);
    }
  }));
  raw.sort((a, b) => a.id - b.id);
  return { raw, failed };
}
