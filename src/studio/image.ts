/** 사진 파일 읽기: 형식 확인, 손상·비이미지 거르기, HEIC/HEIF를 브라우저에서 디코드한다. */

export const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';
export const WARN_BYTES = 40e6;   // 이보다 크면 처리에 시간이 걸린다는 안내를 붙인다(처리는 계속)
export const MAX_BYTES = 200e6;   // 이보다 크면 브라우저 메모리를 보호하려고 거절한다

export class ImportError extends Error {}
const mb = (n: number) => `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}MB`;

export type Kind = 'jpeg' | 'png' | 'webp' | 'heic' | 'avif' | 'gif' | 'unknown';
const HEIC_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'msf1']);

/** 파일 앞부분(매직 바이트)으로 실제 형식을 판별한다. 확장자나 MIME이 틀려도 내용을 믿는다 */
export async function sniff(file: Blob): Promise<Kind> {
  const b = new Uint8Array(await file.slice(0, 32).arrayBuffer()), s = (a: number, e: number) => String.fromCharCode(...b.slice(a, e));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && s(1, 4) === 'PNG') return 'png';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') return 'webp';
  if (s(0, 3) === 'GIF') return 'gif';
  if (s(4, 8) === 'ftyp') {
    const brands = [s(8, 12)]; for (let i = 16; i + 4 <= Math.min(32, b.length); i += 4) brands.push(s(i, i + 4));
    if (brands.some((x) => x === 'avif' || x === 'avis')) return 'avif';
    if (brands.some((x) => HEIC_BRANDS.has(x))) return 'heic';
  }
  return 'unknown';
}
export const isHeicFile = async (f: Blob) => (await sniff(f)) === 'heic';

type Libheif = { HeifDecoder: new () => { decode: (b: Uint8Array) => { get_width: () => number; get_height: () => number; display: (o: ImageData, cb: (r: ImageData | null) => void) => void }[] } };
let libheif: Promise<Libheif> | null = null;
/** libheif(LGPL)는 HEIC를 만났을 때만 별도 청크로 내려받는다 */
const loadLibheif = () => (libheif ??= import('libheif-js/wasm-bundle').then((m: any) => (m.default ?? m) as Libheif).catch((e) => { libheif = null; throw new ImportError('HEIC 변환 모듈을 불러오지 못했습니다. 네트워크·서버 상태를 확인한 뒤 다시 시도하거나, 사진을 JPEG로 내보내 올려 주세요. (' + String(e?.message ?? e).slice(0, 80) + ')'); }));

async function heicToBitmap(file: Blob): Promise<ImageBitmap> {
  const lib = await loadLibheif(), buf = new Uint8Array(await file.arrayBuffer());
  let imgs: ReturnType<InstanceType<Libheif['HeifDecoder']>['decode']>;
  try { imgs = new lib.HeifDecoder().decode(buf); } catch (e) { throw new ImportError('HEIC 파일을 읽지 못했습니다. 손상되었거나 지원하지 않는 방식(예: 일부 Live/깊이 파일)일 수 있습니다. JPEG로 내보내 다시 올려 주세요.'); }
  if (!imgs?.length) throw new ImportError('HEIC 안에서 사진을 찾지 못했습니다. 파일이 손상되었을 수 있습니다.');
  const im = imgs[0], w = im.get_width(), h = im.get_height();
  if (!w || !h || w * h > 120e6) throw new ImportError(`HEIC 사진 크기(${w}×${h})를 처리할 수 없습니다.`);
  const out = new ImageData(w, h);
  await new Promise<void>((ok, no) => im.display(out, (r) => (r ? ok() : no(new ImportError('HEIC 디코드에 실패했습니다. 파일이 손상되었을 수 있습니다.')))));
  return createImageBitmap(out);
}

export type Decoded = { bmp: ImageBitmap; kind: Kind; warning?: string };
/** 어떤 파일이든 ImageBitmap으로 만든다. 실패하면 사용자에게 보여줄 한국어 사유가 담긴 ImportError */
export async function decodeImage(file: File): Promise<Decoded> {
  if (!file.size) throw new ImportError('빈 파일입니다.');
  if (file.size > MAX_BYTES) throw new ImportError(`파일이 너무 큽니다(${mb(file.size)}). ${mb(MAX_BYTES)} 이하로 줄여서 올려 주세요.`);
  const kind = await sniff(file);
  if (kind === 'gif') throw new ImportError('GIF는 지원하지 않습니다. JPG, PNG, WebP, HEIC를 사용해 주세요.');
  if (kind === 'unknown') throw new ImportError(/^image\//.test(file.type) ? '이미지 형식을 알 수 없거나 손상된 파일입니다.' : '이미지 파일이 아닙니다. (JPG, PNG, WebP, HEIC만 지원)');
  const warning = file.size > WARN_BYTES ? `${mb(file.size)} 대용량 사진이라 처리에 시간이 걸렸습니다` : undefined;
  if (kind !== 'heic') {
    try { return { bmp: await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions), kind, warning }; }
    catch { throw new ImportError('사진이 손상되었거나 끝이 잘려 읽을 수 없습니다.'); }
  }
  // HEIC: Safari 등은 브라우저가 직접 읽는다. 못 읽으면 libheif(WebAssembly)로 변환한다
  try { return { bmp: await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions), kind, warning }; } catch { /* 변환 경로로 */ }
  return { bmp: await heicToBitmap(file), kind, warning };
}

/** 사진 둘레에 이미 들어 있는 단색 테두리(캡처·SNS 저장본 등)를 찾는다. 같은 색이 4변 중 3변 이상에서 확인될 때만 자르고, 한 변은 최대 20%까지만 본다 */
export function borderCrop(bmp: ImageBitmap): { sx: number; sy: number; sw: number; sh: number } {
  const full = { sx: 0, sy: 0, sw: bmp.width, sh: bmp.height };
  try {
    const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height)), w = Math.max(8, Math.round(bmp.width * k)), h = Math.max(8, Math.round(bmp.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(bmp, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, TOL = 14, at = (i: number, j: number) => (j * w + i) * 4;
    const ref = (i: number, j: number) => [d[at(i, j)], d[at(i, j) + 1], d[at(i, j) + 2]];
    const same = (i: number, j: number, r: number[]) => Math.abs(d[at(i, j)] - r[0]) <= TOL && Math.abs(d[at(i, j) + 1] - r[1]) <= TOL && Math.abs(d[at(i, j) + 2] - r[2]) <= TOL;
    // 변마다: 바깥 줄부터 안쪽으로, 한 줄 전체가 기준색과 같은 동안 센다
    const sides = [
      { r: ref(w >> 1, 0), n: (() => { let n = 0; for (; n < h * 0.2; n++) { for (let i = 0; i < w; i++) if (!same(i, n, ref(w >> 1, 0))) return n; } return n; })() },
      { r: ref(w >> 1, h - 1), n: (() => { let n = 0; for (; n < h * 0.2; n++) { for (let i = 0; i < w; i++) if (!same(i, h - 1 - n, ref(w >> 1, h - 1))) return n; } return n; })() },
      { r: ref(0, h >> 1), n: (() => { let n = 0; for (; n < w * 0.2; n++) { for (let j = 0; j < h; j++) if (!same(n, j, ref(0, h >> 1))) return n; } return n; })() },
      { r: ref(w - 1, h >> 1), n: (() => { let n = 0; for (; n < w * 0.2; n++) { for (let j = 0; j < h; j++) if (!same(w - 1 - n, j, ref(w - 1, h >> 1))) return n; } return n; })() },
    ];
    const found = sides.filter((s) => s.n >= 2);
    if (found.length < 3) return full;
    const r0 = found[0].r; if (!found.every((s) => Math.abs(s.r[0] - r0[0]) <= 24 && Math.abs(s.r[1] - r0[1]) <= 24 && Math.abs(s.r[2] - r0[2]) <= 24)) return full;
    const px = (n: number, len: number, L: number) => Math.round(Math.max(0, n - 1) / len * L) + 1; // 경계 1px 여유
    const t = sides[0].n >= 2 ? px(sides[0].n, h, bmp.height) : 0, b = sides[1].n >= 2 ? px(sides[1].n, h, bmp.height) : 0, l = sides[2].n >= 2 ? px(sides[2].n, w, bmp.width) : 0, r = sides[3].n >= 2 ? px(sides[3].n, w, bmp.width) : 0;
    return { sx: l, sy: t, sw: bmp.width - l - r, sh: bmp.height - t - b };
  } catch { return full; }
}

/** 사진 품질 점수(0~1): 라플라시안 분산으로 선명도, 평균 밝기로 노출을 본다. 인트로 대표 사진 고르기에 쓴다 */
export function photoQuality(src: HTMLCanvasElement): number {
  try {
    const k = Math.min(1, 192 / Math.max(src.width, src.height)), w = Math.max(8, Math.round(src.width * k)), h = Math.max(8, Math.round(src.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(src, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h); let mean = 0;
    for (let i = 0; i < w * h; i++) { g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; mean += g[i]; }
    mean /= w * h; let v = 0, n = 0;
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) { const l = 4 * g[j * w + i] - g[j * w + i - 1] - g[j * w + i + 1] - g[(j - 1) * w + i] - g[(j + 1) * w + i]; v += l * l; n++; }
    const sharp = Math.min(1, Math.sqrt(v / Math.max(1, n)) / 40), expo = 1 - Math.min(1, Math.abs(mean - 125) / 125);
    return +(0.7 * sharp + 0.3 * expo).toFixed(3);
  } catch { return 0.5; }
}

/** 비슷한 사진(연사·같은 장면) 찾기용 dHash: 9×8 회색 이미지에서 이웃 픽셀 밝기 비교 → 64비트(16자리 16진수) */
export function photoHash(src: HTMLCanvasElement): string {
  try {
    const c = document.createElement('canvas'); c.width = 9; c.height = 8; const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(src, 0, 0, 9, 8);
    const d = x.getImageData(0, 0, 9, 8).data, g = (i: number, j: number) => 0.299 * d[(j * 9 + i) * 4] + 0.587 * d[(j * 9 + i) * 4 + 1] + 0.114 * d[(j * 9 + i) * 4 + 2];
    let bits = ''; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) bits += g(i, j) < g(i + 1, j) ? '1' : '0';
    let hex = ''; for (let k = 0; k < 64; k += 4) hex += parseInt(bits.slice(k, k + 4), 2).toString(16); return hex;
  } catch { return ''; }
}
