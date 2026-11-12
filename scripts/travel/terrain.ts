// 지형 음영 텍스처 생성. 고도 데이터: AWS Open Data "Terrain Tiles"(Mapzen terrarium, 출처 표기 필요). 타일은 data/tiles 에 캐시.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import type { Texture } from '../../src/travel/types.ts';
import type { BBox } from './ne.ts';

const run = promisify(execFile), TILE_DIR = path.resolve(process.env.TILE_DIR || 'data/tiles'), RAD = Math.PI / 180;
const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
const lat2y = (lat: number, z: number) => ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** z;

async function tile(z: number, x: number, y: number): Promise<Buffer | null> {
  const n = 2 ** z, xx = ((x % n) + n) % n; if (y < 0 || y >= n) return null;
  const f = path.join(TILE_DIR, String(z), String(xx), `${y}.png`);
  if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true });
    try { await run('curl', ['-sS', '-f', '-m', '40', '--retry', '2', '-o', f, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${xx}/${y}.png`]); } catch { try { fs.unlinkSync(f); } catch { /* 없음 */ } return null; } }
  return (await sharp(f).removeAlpha().raw().toBuffer());
}
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const RAMP: [number, number[]][] = [[0, hex('#e8e0cf')], [250, hex('#dcd9b8')], [700, hex('#cfc39a')], [1400, hex('#bda781')], [2300, hex('#a98f76')], [3000, hex('#f3efe8')]];
function ramp(e: number) { for (let i = 1; i < RAMP.length; i++) if (e <= RAMP[i][0]) { const [e0, c0] = RAMP[i - 1], [e1, c1] = RAMP[i], t = (e - e0) / (e1 - e0); return c0.map((v, k) => v + (c1[k] - v) * t); } return RAMP[RAMP.length - 1][1]; }

/** bbox 영역의 지형 텍스처(PNG, 바다는 투명)를 만들어 outFile에 쓰고 메타데이터를 돌려준다 */
export async function makeTexture(box: BBox, targetPx: number, outFile: string, src: string): Promise<Texture | null> {
  const [lon0, lat0, lon1, lat1] = [box[0], Math.max(-84, box[1]), box[2], Math.min(84, box[3])], span = lon1 - lon0;
  const z = Math.max(0, Math.min(14, Math.ceil(Math.log2((targetPx * 360) / (256 * span)))));
  const x0 = Math.floor(lon2x(lon0, z)), x1 = Math.floor(lon2x(lon1, z)), y0 = Math.floor(lat2y(lat1, z)), y1 = Math.floor(lat2y(lat0, z)), nx = x1 - x0 + 1, ny = y1 - y0 + 1;
  if (nx * ny > 220) return null;
  const MW = nx * 256, MH = ny * 256, el = new Float32Array(MW * MH); let got = 0;
  const jobs: [number, number][] = []; for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) jobs.push([tx, ty]);
  await Promise.all(Array.from({ length: 8 }, async () => { for (;;) { const j = jobs.pop(); if (!j) return; const b = await tile(z, j[0], j[1]); if (!b) continue; got++;
    const ox = (j[0] - x0) * 256, oy = (j[1] - y0) * 256; for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const i = (y * 256 + x) * 3; el[(oy + y) * MW + ox + x] = b[i] * 256 + b[i + 1] + b[i + 2] / 256 - 32768; } } }));
  if (!got) return null;
  const W = Math.round(Math.min(targetPx, span / 360 * 2 ** z * 256)), H = Math.max(2, Math.round(W * (lat1 - lat0) / span)), dlon = span / W, dlat = (lat1 - lat0) / H;
  const grid = new Float32Array(W * H);
  for (let r = 0; r < H; r++) { const lat = lat1 - (r + 0.5) * dlat, py = Math.min(MH - 1.001, Math.max(0, (lat2y(lat, z) - y0) * 256 - 0.5)), yi = Math.floor(py), fy = py - yi;
    for (let c = 0; c < W; c++) { const px = Math.min(MW - 1.001, Math.max(0, (lon2x(lon0 + (c + 0.5) * dlon, z) - x0) * 256 - 0.5)), xi = Math.floor(px), fx = px - xi, i = yi * MW + xi;
      grid[r * W + c] = (el[i] * (1 - fx) + el[i + 1] * fx) * (1 - fy) + (el[i + MW] * (1 - fx) + el[i + MW + 1] * fx) * fy; } }
  const out = Buffer.alloc(W * H * 4), midLat = (lat0 + lat1) / 2, dxm = dlon * 111320 * Math.cos(midLat * RAD), dym = dlat * 110540, ze = Math.max(3.2, Math.min(9, 1 + dxm / 130));
  const L = [-0.5, 0.5, 0.707]; // 북서쪽 위에서 비추는 빛
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = r * W + c, e = grid[i], o = i * 4;
    if (e <= 0.5) { out[o + 3] = 0; continue; }
    const ex = (grid[r * W + Math.min(W - 1, c + 1)] - grid[r * W + Math.max(0, c - 1)]) / (2 * dxm) * ze, ey = (grid[Math.max(0, r - 1) * W + c] - grid[Math.min(H - 1, r + 1) * W + c]) / (2 * dym) * ze;
    const nl = Math.hypot(ex, ey, 1), sh = Math.max(0, (-ex * L[0] - ey * L[1] + L[2]) / nl), k = 0.52 + 0.68 * sh, col = ramp(e);
    out[o] = Math.min(255, col[0] * k); out[o + 1] = Math.min(255, col[1] * k); out[o + 2] = Math.min(255, col[2] * k); out[o + 3] = Math.min(255, e * 90);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 8 }).toFile(outFile);
  return { src, w: W, h: H, lon0, lon1, lat0, lat1 };
}
