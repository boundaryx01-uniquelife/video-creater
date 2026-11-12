// 사용: node scripts/render.mjs still <id> <frame...>  |  node scripts/render.mjs video <id> [out.mp4]
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const [mode, id, ...rest] = process.argv.slice(2);
import { readFileSync } from 'node:fs';
const props = process.env.PROPS_FILE ? JSON.parse(readFileSync(process.env.PROPS_FILE, 'utf8')) : process.env.PROPS ? JSON.parse(process.env.PROPS) : undefined;
const cid = id.includes('-') ? id : `intro-${id}`;
const browserExecutable = process.env.CHROME_BIN || undefined;
const outDir = process.env.OUT_DIR || path.resolve('out');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve('src/remotion/index.ts'), publicDir: process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : undefined });
const comp = await selectComposition({ serveUrl, id: cid, inputProps: props, browserExecutable });
const chromiumOptions = { gl: 'angle' };

if (mode === 'still') {
  for (const f of rest.length ? rest : ['100']) {
    await renderStill({ composition: comp, serveUrl, output: path.join(outDir, `${cid}-${f}.png`), frame: Number(f), inputProps: props, browserExecutable, chromiumOptions, scale: 0.5 });
    console.log('still', id, f);
  }
} else {
  const out = rest[0] || path.join(outDir, `${cid}.mp4`);
  await renderMedia({ composition: comp, serveUrl, codec: 'h264', outputLocation: out, inputProps: props, browserExecutable, chromiumOptions, crf: 16, scale: process.env.SCALE === '2/3' ? 2 / 3 : Number(process.env.SCALE || 1), onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%`) });
  console.log('\nvideo ->', out);
}
