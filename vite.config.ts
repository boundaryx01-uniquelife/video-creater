import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { studio } from './studio/plugin.mjs';

export default defineConfig({
  plugins: [react(), studio()],
  server: { host: true, port: 5173, watch: { ignored: ['**/.studio/**', '**/data/**', '**/.cache/**', '**/out/**'] } },
});
