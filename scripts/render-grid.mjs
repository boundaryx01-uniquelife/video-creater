// 사용: MEDIA_DIR=<blur샘플 폴더> OUT_DIR=<출력> CHROME_BIN=<chrome> node scripts/render-grid.mjs
// 번들을 한 번만 만들고 모드(7) × 장면(4) 정지 프레임을 렌더한다.
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const browserExecutable = process.env.CHROME_BIN || undefined;
const outDir = path.resolve(process.env.OUT_DIR || 'out/grid'); fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/remotion/index.ts'), publicDir: path.resolve(process.env.MEDIA_DIR) });
const modes = (process.env.MODES || 'event,site,store,product,journey,education').split(',').filter((m) => m !== 'recap');
const frames = { intro: 72, card: 66, beat: 58, outro: 90 };
const jobs = [];
for (const m of modes) for (const s of Object.keys(frames)) jobs.push({ id: `mode-${s}`, props: { mode: m }, frame: frames[s], out: `${m}-${s}.png` });
if (!process.env.MODES || process.env.MODES.includes('recap')) for (const [s, f] of [['intro', 118], ['card', 66], ['beat', 16], ['outro', 100]]) jobs.push({ id: `recap-${s}`, props: undefined, frame: f, out: `recap-${s}.png` });
for (const j of jobs) {
  const composition = await selectComposition({ serveUrl, id: j.id, inputProps: j.props, browserExecutable });
  await renderStill({ composition, serveUrl, output: path.join(outDir, j.out), frame: j.frame, inputProps: j.props, browserExecutable, chromiumOptions: { gl: 'angle' }, scale: 0.5 });
  console.log('still', j.out);
}
