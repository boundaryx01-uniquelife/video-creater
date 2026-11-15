// 키트 부품 미리보기: 계열 하나의 부품을 모두(또는 일부) 렌더해 한 장의 모아보기로 만든다.
// 사용: node --experimental-strip-types --no-warnings scripts/kit-stills.mjs <계열 id> [--parts a,b] [--vertical] [--out 폴더] [--at 0.55]
//  - 각 부품을 장면 길이의 --at 지점(기본 55%)에서 캡처한다. 등장 애니메이션을 보려면 --at 0.15 등으로
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { PART_IDS, PART_SPEC } from '../src/kit/schema.ts';
import { SAMPLE_PART, SAMPLE_PHOTOS } from '../src/kit/sample.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const opt = (k, d = '') => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, flag = (k) => args.includes('--' + k);
const fam = args[0]; if (!fam || fam.startsWith('--')) { console.error('계열 id를 주세요(scrapbook|editorial|documentary)'); process.exit(1); }
const parts = opt('parts') ? opt('parts').split(',') : PART_IDS, vert = flag('vertical'), at = Number(opt('at', '0.55'));
const out = path.resolve(opt('out') || path.join(os.tmpdir(), `kit-${fam}${vert ? '-v' : ''}`)); fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/remotion/index.ts'), publicDir: path.join(ROOT, 'public') });
const tw = vert ? 270 : 480, th = vert ? 480 : 270, LB = 30, cols = vert ? 6 : 4, comps = [];
for (const [k, part] of parts.entries()) {
  const s = SAMPLE_PART[part]; if (!s) { console.error('없는 부품:', part); continue; }
  const photos = s.photos.map((i) => SAMPLE_PHOTOS[i]), dur = PART_SPEC[part].dur(photos.length), inputProps = { family: fam, part, data: s.data, photos, dur };
  const comp = await selectComposition({ serveUrl, id: 'kit-part' + (vert ? '-vertical' : ''), inputProps, browserExecutable: process.env.CHROME_BIN, logLevel: 'error' });
  const f = path.join(out, `${part}.jpg`);
  await renderStill({ composition: comp, serveUrl, frame: Math.min(comp.durationInFrames - 1, Math.round(dur * at)), output: f, inputProps, imageFormat: 'jpeg', jpegQuality: 86, scale: flag('full') ? 0.5 : tw / comp.width, browserExecutable: process.env.CHROME_BIN, logLevel: 'error' });
  const x = (k % cols) * tw, y = Math.floor(k / cols) * (th + LB);
  comps.push({ input: await sharp(f).resize(tw, th).toBuffer(), left: x, top: y }, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${LB}"><rect width="100%" height="100%" fill="#14161c"/><text x="8" y="21" font-family="sans-serif" font-size="16" fill="#e8e2d3">${part} · ${PART_SPEC[part].label}</text></svg>`), left: x, top: y + th });
}
const rows = Math.ceil(parts.length / cols), sheet = path.join(out, `sheet${vert ? '-vertical' : ''}.jpg`);
await sharp({ create: { width: cols * tw, height: rows * (th + LB), channels: 3, background: '#0e0f12' } }).composite(comps).jpeg({ quality: 84 }).toFile(sheet);
console.log(`모아보기: ${sheet}\n부품별: ${out}/<부품>.jpg`);
