import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { realpathSync } from 'node:fs';
import { studio } from './studio/plugin.mjs';

// node_modules가 심볼릭 링크인 작업 폴더(여러 작업 폴더가 공유)에서도 폰트 등을 불러올 수 있게 실제 경로를 허용
const nm = (() => { try { return realpathSync('node_modules'); } catch { return 'node_modules'; } })();

export default defineConfig({
  plugins: [react(), studio()],
  cacheDir: '.cache/vite', // 사전 번들 캐시를 프로젝트 안에 둔다(여러 작업 폴더가 node_modules/.vite를 공유하며 서로 덮어쓰지 않게)
  optimizeDeps: { include: ['libheif-js/wasm-bundle'] }, // HEIC 변환(WebAssembly)은 동적으로만 불러오므로 미리 번들 대상에 명시
  server: { host: true, port: 5173, fs: { allow: [process.cwd(), nm] }, watch: { ignored: ['**/.studio/**', '**/data/**', '**/.cache/**', '**/out/**'] } },
});
