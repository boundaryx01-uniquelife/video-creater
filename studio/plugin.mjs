// 스튜디오 로컬 서버(Vite 개발 서버에 붙는 API): 사진 업로드, 업로드 파일 제공, MP4 렌더 작업.
// 로컬에서만 쓰는 용도이며 인증이 없다. 외부에 공개된 서버에 올리지 말 것.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4' };
// 허용하는 컴포지션: 가로(기본 id)와 세로(`-vertical`, 1080×1920)
const BASE_COMPS = ['event-video-sample', 'travel-video-sample', 'site-video-sample', 'store-video-sample', 'product-video-sample', 'school-video-sample', 'club-video-sample', 'grad-video-sample'];
const COMPS = new Set(BASE_COMPS.flatMap((c) => [c, c + '-vertical']));

export function studio() {
  const root = process.cwd(), dir = path.join(root, '.studio'), up = path.join(dir, 'uploads'), out = path.join(dir, 'renders');
  const jobs = new Map(); let bundling = null, running = false;
  const send = (res, code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
  const body = (req, limit) => new Promise((ok, no) => { const ch = []; let n = 0; req.on('data', (c) => { n += c.length; if (n > limit) { no(new Error('파일이 너무 큽니다')); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch))); req.on('error', no); });

  async function render(job, port) {
    try {
      const { bundle } = await import('@remotion/bundler'); const { renderMedia, selectComposition } = await import('@remotion/renderer');
      job.stage = '영상 엔진 준비';
      bundling ??= bundle({ entryPoint: path.join(root, 'src/remotion/index.ts'), publicDir: path.join(root, 'public') });
      const serveUrl = await bundling, browserExecutable = process.env.CHROME_BIN || undefined;
      // 업로드 사진은 번들에 없으므로 이 서버의 주소로 바꿔서 렌더러가 받아 가게 한다
      const inputProps = JSON.parse(JSON.stringify(job.props).replaceAll('"/uploads/', `"http://127.0.0.1:${port}/uploads/`));
      const composition = await selectComposition({ serveUrl, id: job.comp, inputProps, browserExecutable });
      const last = composition.durationInFrames - 1, end = job.seconds ? Math.min(last, Math.round(job.seconds * composition.fps) - 1) : last;
      job.stage = '렌더링'; job.frames = end + 1;
      await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: path.join(out, job.id + '.mp4'), inputProps, browserExecutable, chromiumOptions: { gl: 'angle' }, crf: 18, scale: job.scale === '720' ? 2 / 3 : 1, frameRange: [0, end], onProgress: ({ progress }) => { job.progress = progress; } });
      job.status = 'done'; job.progress = 1; job.url = `/renders/${job.id}.mp4`;
    } catch (e) { job.status = 'error'; job.error = String(e?.message ?? e).slice(0, 600); if (String(e).includes('bundle')) bundling = null; }
    finally { running = false; }
  }

  return {
    name: 'studio-api',
    configureServer(server) {
      fs.mkdirSync(up, { recursive: true }); fs.mkdirSync(out, { recursive: true });
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://local'), p = url.pathname;
        try {
          if (p === '/api/health') return send(res, 200, { ok: true });
          if (p === '/api/upload' && req.method === 'POST') {
            const ext = TYPES[String(req.headers['content-type']).split(';')[0]]; if (!ext) return send(res, 415, { error: 'JPG, PNG, WebP만 올릴 수 있습니다' });
            const buf = await body(req, 60e6), name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20) + '.' + ext;
            fs.writeFileSync(path.join(up, name), buf); return send(res, 200, { src: '/uploads/' + name });
          }
          if (p.startsWith('/uploads/') || p.startsWith('/renders/')) {
            const f = path.join(p.startsWith('/uploads/') ? up : out, path.basename(p)); if (!fs.existsSync(f)) return send(res, 404, { error: '파일이 없습니다' });
            const ext = f.split('.').pop(); res.setHeader('content-type', MIME[ext] ?? 'application/octet-stream'); res.setHeader('access-control-allow-origin', '*'); res.setHeader('content-length', fs.statSync(f).size);
            if (ext === 'mp4') res.setHeader('content-disposition', `attachment; filename="${url.searchParams.get('name')?.replace(/[^\w.-]/g, '') || path.basename(f)}"`);
            return fs.createReadStream(f).pipe(res);
          }
          if (p === '/api/render' && req.method === 'POST') {
            if (running) return send(res, 409, { error: '이미 렌더 중인 작업이 있습니다' });
            const j = JSON.parse((await body(req, 30e6)).toString('utf8')); if (!COMPS.has(j.comp)) return send(res, 400, { error: '알 수 없는 영상 종류' });
            const id = crypto.randomBytes(6).toString('hex'), job = { id, comp: j.comp, props: j.props, scale: j.scale, seconds: Number(j.seconds) || 0, status: 'running', stage: '시작', progress: 0 };
            jobs.set(id, job); running = true; render(job, server.httpServer.address().port); return send(res, 200, { id });
          }
          if (p.startsWith('/api/render/')) { const job = jobs.get(p.split('/').pop()); if (!job) return send(res, 404, { error: '작업이 없습니다' }); const { props, ...rest } = job; return send(res, 200, rest); }
        } catch (e) { return send(res, 500, { error: String(e?.message ?? e) }); }
        next();
      });
    },
  };
}
