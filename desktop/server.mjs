// 데스크톱 앱 내부 서버: 스튜디오 화면(정적 파일) + studio/plugin.mjs 의 API를 한 포트(127.0.0.1)에서 제공한다.
// 개발용 Vite 서버 대신 쓰므로 Vite 없이 동작한다. esbuild로 묶어 desktop/dist/server.mjs 가 된다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { studio } from '../studio/plugin.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };

/** 정적 파일: 요청 경로가 기준 폴더 밖으로 나가지 못하게 막는다 */
function fileIn(base, rel) {
  const f = path.resolve(base, '.' + path.posix.normalize('/' + decodeURIComponent(rel)));
  if (f !== base && !f.startsWith(base + path.sep)) return null;
  try { return fs.statSync(f).isFile() ? f : null; } catch { return null; }
}

export async function startServer({ uiDir, mediaDir, bundleDir, dataDir, workerFile, fetchScript, cacheDir, root, onEngine }) {
  const stack = [], middlewares = { use: (fn) => stack.push(fn) };
  let port = 0;
  const serveStatic = (req, res) => {
    const p = new URL(req.url, 'http://local').pathname;
    let f = p.startsWith('/media/') ? fileIn(mediaDir, p.slice('/media/'.length)) : fileIn(uiDir, p === '/' ? '/index.html' : p);
    if (!f && !path.extname(p) && !p.startsWith('/api/')) f = path.join(uiDir, 'index.html'); // 화면 주소는 모두 index.html
    if (!f) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream');
    if (f.includes(`${path.sep}assets${path.sep}`)) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    fs.createReadStream(f).pipe(res);
  };
  const httpServer = http.createServer((req, res) => {
    let i = 0;
    const fail = (e) => { if (!res.headersSent) { res.statusCode = 500; res.setHeader('content-type', 'application/json; charset=utf-8'); } res.end(JSON.stringify({ error: String(e?.message ?? e) })); };
    const next = (err) => {
      if (err) return fail(err);
      const fn = stack[i++]; if (!fn) return serveStatic(req, res);
      try { const r = fn(req, res, next); if (r && typeof r.catch === 'function') r.catch(fail); } catch (e) { fail(e); }
    };
    next();
  });
  // 인증이 없는 로컬 API이므로 ① 이 서버 주소로 온 요청만 받고(DNS 리바인딩 방지) ② 다른 사이트에서 온 쓰기 요청은 거절한다(렌더러가 사진을 읽는 GET은 허용)
  middlewares.use((req, res, next) => {
    const host = String(req.headers.host ?? ''), origin = req.headers.origin;
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) { res.statusCode = 403; return res.end('forbidden host'); }
    if (origin && origin !== `http://${host}` && req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 403; return res.end('forbidden origin'); }
    next();
  });
  middlewares.use(async (req, res, next) => {
    if (new URL(req.url, 'http://local').pathname !== '/api/engine') return next();
    res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(onEngine?.() ?? { state: 'ready' }));
  });
  studio({ root, dataDir, bundleDir, cacheDir, workerFile, fetchScript }).configureServer({ middlewares, httpServer });
  await new Promise((ok, no) => { httpServer.once('error', no); httpServer.listen(0, '127.0.0.1', ok); });
  port = httpServer.address().port;
  return { port, close: () => new Promise((ok) => { httpServer.close(() => ok()); httpServer.closeAllConnections?.(); }) };
}
