// 데스크톱 앱 빌드: 화면(Vite) + 렌더용 Remotion 번들 + 서버/여행 작업자(esbuild) → desktop/ui, bundle, dist
// 사용: node desktop/build.mjs   (저장소 루트에서. 의존성은 루트 npm install 이 끝난 상태여야 한다)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), d = (...p) => path.join(root, 'desktop', ...p);
process.chdir(root);
const step = (m) => console.log(`\n▶ ${m}`);

step('1/4 스튜디오 화면 빌드 (Vite)');
const { build: viteBuild } = await import('vite');
fs.rmSync(d('ui'), { recursive: true, force: true });
await viteBuild({ configFile: path.join(root, 'vite.config.ts'), logLevel: 'warn', publicDir: false, build: { outDir: d('ui'), emptyOutDir: true } }); // media는 번들(아래)과 겹쳐 두 번 담지 않는다

step('2/4 영상 엔진 번들 (Remotion)');
const { bundle } = await import('@remotion/bundler');
fs.rmSync(d('bundle'), { recursive: true, force: true });
await bundle({ entryPoint: path.join(root, 'src/remotion/index.ts'), publicDir: path.join(root, 'public'), outDir: d('bundle'), webpackOverride: (c) => ({ ...c, devtool: false }) }); // 소스맵은 배포본에 필요 없다(24MB)

step('3/4 서버·여행 작업자 묶기 (esbuild)');
const { build } = await import('esbuild');
fs.rmSync(d('dist'), { recursive: true, force: true });
const common = { bundle: true, platform: 'node', format: 'esm', logLevel: 'warning', banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" } };
await build({ ...common, entryPoints: [d('server.mjs')], outfile: d('dist/server.mjs'), external: ['@remotion/bundler', '@remotion/renderer', 'esbuild', 'sharp', 'exifr'] });
await build({ ...common, entryPoints: [path.join(root, 'scripts/travel/worker.ts')], outfile: d('dist/travel-worker.mjs'), external: ['sharp', 'exifr'] });
fs.copyFileSync(path.join(root, 'scripts/fetch-data.mjs'), d('dist/fetch-data.mjs'));

step('용량 줄이기');
// ① 글꼴: @fontsource CSS는 woff2 다음에 woff를 대체 형식으로 적어 두지만 앱의 Chromium은 woff2만 쓴다 → woff 파일은 받지 않으므로 지워도 된다
let freed = 0;
const walk = (dir, fn) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); e.isDirectory() ? walk(f, fn) : fn(f); } };
for (const base of [d('ui'), d('bundle')]) walk(base, (f) => { if (/\.woff$/i.test(f)) { freed += fs.statSync(f).size; fs.unlinkSync(f); } });
// ② 샘플 사진(블러 합성 이미지)은 다시 압축한다. 저장소의 원본은 건드리지 않고 번들 복사본만 바꾼다
const sharp = (await import('sharp')).default; let before = 0, after = 0;
for (const f of fs.readdirSync(d('bundle/public/media'))) {
  if (!/^(?!terrain_).*\.jpe?g$/i.test(f)) continue; const p = d('bundle/public/media', f); const buf = fs.readFileSync(p);
  const out = await sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toBuffer(); before += buf.length; if (out.length < buf.length) { fs.writeFileSync(p, out); after += out.length; } else after += buf.length;
}
console.log(`woff ${(freed / 1e6).toFixed(1)}MB 삭제 · 샘플 사진 ${(before / 1e6).toFixed(1)}→${(after / 1e6).toFixed(1)}MB`);

step('4/4 확인');
const need = [d('ui/index.html'), d('bundle/index.html'), d('dist/server.mjs'), d('dist/travel-worker.mjs'), d('dist/fetch-data.mjs')];
for (const f of need) if (!fs.existsSync(f)) { console.error('없음:', f); process.exit(1); }
const mb = (p) => { let n = 0; const w = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) e.isDirectory() ? w(path.join(x, e.name)) : (n += fs.statSync(path.join(x, e.name)).size); }; w(p); return (n / 1e6).toFixed(1) + 'MB'; };
console.log(`ui ${mb(d('ui'))} · bundle ${mb(d('bundle'))} · dist ${mb(d('dist'))}`);
