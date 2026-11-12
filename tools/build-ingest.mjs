import { build } from 'esbuild';
import fs from 'node:fs';
const r = await build({ entryPoints: ['src/ingest/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/ingest/template.html', 'utf8').replace('/*__BUNDLE__*/', () => js);
fs.mkdirSync('dist-tools', { recursive: true });
fs.writeFileSync('dist-tools/photo-ingest.html', html);
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
