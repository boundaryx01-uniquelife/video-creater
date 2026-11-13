// 렌더용 Chrome(Headless Shell) 내려받기. 별도 프로세스에서 실행한다 — 실패해도 앱 본체의 렌더 모듈 상태에 영향이 없게.
import { ensureBrowser } from '@remotion/renderer';
const send = (m) => process.send?.(m);
try {
  await ensureBrowser({ onBrowserDownload: () => ({ version: null, onProgress: ({ percent, alreadyAvailable }) => send({ t: 'progress', percent: Math.round((percent ?? 0) * 100), already: !!alreadyAvailable }) }) });
  send({ t: 'done' });
} catch (e) { send({ t: 'error', message: String(e?.message ?? e).split('\n')[0].slice(0, 200) }); }
process.exit(0);
