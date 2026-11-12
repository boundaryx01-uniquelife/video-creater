import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { studio } from './studio/plugin.mjs';

export default defineConfig({
  plugins: [react(), studio()],
  cacheDir: '.cache/vite', // 사전 번들 캐시를 프로젝트 안에 둔다(여러 작업 폴더가 node_modules/.vite를 공유하며 서로 덮어쓰지 않게)
  optimizeDeps: { include: ['libheif-js/wasm-bundle'] }, // HEIC 변환(WebAssembly)은 동적으로만 불러오므로 미리 번들 대상에 명시
  server: { host: true, port: 5173, watch: { ignored: ['**/.studio/**', '**/data/**', '**/.cache/**', '**/out/**'] } },
});
