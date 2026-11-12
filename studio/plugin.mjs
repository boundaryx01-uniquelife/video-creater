// 스튜디오 로컬 서버(Vite 개발 서버에 붙는 API): 사진 업로드, 업로드 파일 제공, MP4 렌더 대기열, 저장 공간 정리.
// 로컬에서만 쓰는 용도이며 인증이 없다. 외부에 공개된 서버에 올리지 말 것.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { travelApi, studioAssetUrls } from './travel-api.mjs';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const AUDIO_TYPES = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/vnd.wave': 'wav', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'm4a', 'audio/ogg': 'ogg', 'application/ogg': 'ogg' };
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg' };
const AUDIO_MAX = 60e6;
// 확장자만 믿지 않고 파일 머리(매직 바이트)로 실제 형식을 확인한다
const sniffAudio = (b) => {
  if (b.length < 12) return null; const t = b.toString('latin1', 0, 4);
  if (t === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE') return 'wav';
  if (t === 'OggS') return 'ogg';
  if (b.toString('latin1', 4, 8) === 'ftyp') return 'm4a';
  if (t.startsWith('ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
  return null;
};
const COMPS = new Set(['event-video-sample', 'travel-video-sample', 'site-video-sample', 'store-video-sample', 'product-video-sample', 'school-video-sample', 'club-video-sample', 'grad-video-sample']);
const DEFAULTS = { rendersDays: 14, uploadsDays: 60, autoClean: true }; // 정리 정책 기본값(설정에서 바꿀 수 있다)
const MAX_QUEUE = 20, DAY = 86400e3;

const dirStat = (d, ext) => { let count = 0, bytes = 0; try { for (const f of fs.readdirSync(d)) if (!ext || f.endsWith(ext)) { try { bytes += fs.statSync(path.join(d, f)).size; count++; } catch { /* 사라진 파일 */ } } } catch { /* 폴더 없음 */ } return { count, bytes }; };
const clampDays = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(3650, Math.round(n))) : d; };

/** 렌더 실패 원인을 사람이 읽을 한 줄 안내로 */
export function explain(msg) {
  const m = String(msg);
  if (/ENOSPC|no space left/i.test(m)) return '디스크 공간이 부족합니다. 아래 "저장 공간"에서 오래된 파일을 정리한 뒤 다시 시도하세요.';
  if (/browser|chrom|executable/i.test(m) && /(not found|could not|failed to launch|ENOENT)/i.test(m)) return '렌더용 Chrome을 찾지 못했습니다. CHROME_BIN 환경 변수에 Chrome 실행 파일 경로를 지정하세요.';
  if (/ERR_CONNECTION|net::|Failed to (load|fetch)|404/i.test(m)) return '사진 또는 글꼴 주소를 불러오지 못했습니다. 서버에 저장되지 않은 사진이 있는지 확인하세요.';
  if (/delayRender|Timed out|timeout/i.test(m)) return '장면을 준비하는 시간이 초과되었습니다. 사진이 너무 크거나 컴퓨터가 바쁜 경우입니다. 다시 시도하세요.';
  if (/memory|OOM|heap/i.test(m)) return '메모리가 부족합니다. 화질을 720p로 낮추거나 다른 프로그램을 닫고 다시 시도하세요.';
  if (/cancel/i.test(m)) return '취소되었습니다.';
  return '';
}

export function studio() {
  const root = process.cwd(), dir = path.join(root, '.studio'), up = path.join(dir, 'uploads'), out = path.join(dir, 'renders'), settingsFile = path.join(dir, 'settings.json');
  const jobs = new Map(), queue = []; let bundling = null, current = null, lastRate = 0, srv = null;
  const send = (res, code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
  const body = (req, limit) => new Promise((ok, no) => { const ch = []; let n = 0; req.on('data', (c) => { n += c.length; if (n > limit) { no(new Error('파일이 너무 큽니다')); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch))); req.on('error', no); });
  const settings = () => { try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile, 'utf8')) }; } catch { return { ...DEFAULTS }; } };
  const log = (job, line) => { job.log.push(`${new Date().toTimeString().slice(0, 8)} ${String(line).slice(0, 200)}`); if (job.log.length > 40) job.log.shift(); };

  /** 화면에 보낼 작업 정보(props 제외). 남은 시간은 렌더 시작 후 진행률로 추정한다 */
  const view = (j) => {
    const { props, cancel, ...r } = j; let etaSec = null;
    if (j.status === 'running' && j.renderStart && j.progress > 0.02) etaSec = Math.round(((Date.now() - j.renderStart) / 1000) * (1 - j.progress) / j.progress);
    else if (j.status === 'running' && j.frames && lastRate) etaSec = Math.round(j.frames / lastRate);
    const qi = queue.indexOf(j.id);
    return { ...r, log: j.log.slice(-8), etaSec, queuePos: qi >= 0 ? qi + 1 : 0 };
  };
  const metaPath = (id) => path.join(out, id + '.json'), mp4Path = (id) => path.join(out, id + '.mp4');
  const diskJobs = () => { const list = []; try { for (const f of fs.readdirSync(out)) if (f.endsWith('.json')) { try { const m = JSON.parse(fs.readFileSync(path.join(out, f), 'utf8')), id = f.slice(0, -5); if (!jobs.has(id) && fs.existsSync(mp4Path(id))) list.push({ ...m, status: 'done', progress: 1, stage: '완료', url: `/renders/${id}.mp4`, size: fs.statSync(mp4Path(id)).size, log: [], etaSec: null, queuePos: 0 }); } catch { /* 손상된 메타 */ } } } catch { /* 폴더 없음 */ } return list; };

  async function run(job) {
    current = job; job.status = 'running'; job.startedAt = Date.now(); job.stage = '영상 엔진 준비'; log(job, '렌더 시작');
    try {
      const { bundle } = await import('@remotion/bundler'); const { renderMedia, selectComposition, makeCancelSignal } = await import('@remotion/renderer');
      bundling ??= bundle({ entryPoint: path.join(root, 'src/remotion/index.ts'), publicDir: path.join(root, 'public') });
      const serveUrl = await bundling, browserExecutable = process.env.CHROME_BIN || undefined;
      if (job.canceled) throw new Error('cancelled');
      // 업로드 사진은 번들에 없으므로 이 서버의 주소로 바꿔서 렌더러가 받아 가게 한다
      const port = srv.httpServer.address().port, inputProps = JSON.parse(studioAssetUrls(JSON.stringify(job.props).replaceAll('"/uploads/', `"http://127.0.0.1:${port}/uploads/`), port));
      const composition = await selectComposition({ serveUrl, id: job.comp, inputProps, browserExecutable });
      const last = composition.durationInFrames - 1, end = job.seconds ? Math.min(last, Math.round(job.seconds * composition.fps) - 1) : last;
      job.stage = '렌더링'; job.frames = end + 1; job.renderStart = Date.now(); log(job, `${job.frames}프레임 (${(job.frames / composition.fps).toFixed(1)}초) 렌더링`);
      const { cancelSignal, cancel } = makeCancelSignal(); job.cancel = cancel; if (job.canceled) cancel();
      // 일부만 렌더할 때는 영상 길이도 그만큼으로 줄여, 음악이 잘린 끝이 아니라 그 구간 끝에서 페이드 아웃되게 한다
      await renderMedia({ composition: { ...composition, durationInFrames: end + 1 }, serveUrl, codec: 'h264', outputLocation: mp4Path(job.id), inputProps, browserExecutable, chromiumOptions: { gl: 'angle' }, crf: 18, scale: job.scale === '720' ? 2 / 3 : 1, frameRange: [0, end], cancelSignal,
        onBrowserLog: (l) => { if (l.type === 'error' || l.type === 'warning') log(job, `[브라우저 ${l.type}] ${l.text}`); }, onProgress: ({ progress }) => { job.progress = progress; } });
      job.status = 'done'; job.progress = 1; job.stage = '완료'; job.url = `/renders/${job.id}.mp4`; job.size = fs.statSync(mp4Path(job.id)).size; job.finishedAt = Date.now();
      job.durationSec = +(job.frames / composition.fps).toFixed(2);
      lastRate = job.frames / Math.max(1, (job.finishedAt - job.renderStart) / 1000);
      fs.writeFileSync(metaPath(job.id), JSON.stringify({ id: job.id, comp: job.comp, name: job.name, scale: job.scale, seconds: job.seconds, frames: job.frames, createdAt: job.createdAt, finishedAt: job.finishedAt, durationSec: job.durationSec }));
      log(job, `완료 ${(job.size / 1e6).toFixed(1)}MB`);
    } catch (e) {
      const msg = String(e?.message ?? e); try { fs.rmSync(mp4Path(job.id), { force: true }); } catch { /* 무시 */ }
      if (job.canceled || /cancel/i.test(msg)) { job.status = 'canceled'; job.stage = '취소됨'; job.error = ''; log(job, '취소됨'); }
      else { job.status = 'error'; job.error = msg.split('\n').find((x) => x.trim())?.slice(0, 240) || '알 수 없는 오류'; job.hint = explain(msg); job.detail = msg.slice(0, 1500); log(job, `오류: ${job.error}`); if (/bundle/i.test(msg)) bundling = null; }
      job.finishedAt = Date.now();
    } finally { current = null; job.cancel = undefined; job.props = undefined; setImmediate(pump); }
  }
  function pump() { if (current) return; while (queue.length) { const id = queue.shift(), j = jobs.get(id); if (j && j.status === 'queued') { run(j); return; } } }

  /** 오래된 파일 정리. keep에 든 업로드와 대기·진행 중 작업이 쓰는 업로드는 지우지 않는다 */
  function cleanup({ keep = [], rendersDays, uploadsDays, dryRun = false, skipUploads = false } = {}) {
    const s = settings(), rd = clampDays(rendersDays, s.rendersDays), ud = clampDays(uploadsDays, s.uploadsDays), now = Date.now(), res = { renders: 0, uploads: 0, bytes: 0 };
    const protectedUp = new Set(keep.map((k) => path.basename(String(k)))); for (const j of jobs.values()) if (j.props) for (const m of JSON.stringify(j.props).matchAll(/uploads\/([\w.-]+)/g)) protectedUp.add(m[1]);
    const sweep = (d, days, skip, kind) => { if (!days) return; try { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); let st; try { st = fs.statSync(p); } catch { continue; } if (!st.isFile() || now - st.mtimeMs < days * DAY || skip(f)) continue; if (kind !== 'renders' || f.endsWith('.mp4')) res[kind]++; res.bytes += st.size; if (!dryRun) fs.rmSync(p, { force: true }); } } catch { /* 폴더 없음 */ } };
    const activeIds = new Set([...jobs.values()].filter((j) => j.status === 'queued' || j.status === 'running').map((j) => j.id));
    sweep(out, rd, (f) => activeIds.has(f.replace(/\.(mp4|json)$/, '')), 'renders');
    if (!skipUploads) sweep(up, ud, (f) => protectedUp.has(f), 'uploads');
    return res;
  }
  const storage = () => { let disk = null; try { const s = fs.statfsSync(dir); disk = { free: s.bavail * s.bsize, total: s.blocks * s.bsize }; } catch { /* 지원 안 함 */ } return { uploads: dirStat(up), renders: dirStat(out, '.mp4'), disk, settings: settings(), dir }; };

  return {
    name: 'studio-api',
    configureServer(server) {
      fs.mkdirSync(up, { recursive: true }); fs.mkdirSync(out, { recursive: true });
      srv = server;
      try { if (settings().autoClean) cleanup({ skipUploads: true }); } catch { /* 정리 실패는 무시 */ }
      travelApi(server, { root, send, body }); // 여행 모드 API (studio/travel-api.mjs)
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://local'), p = url.pathname;
        try {
          if (p === '/api/health') return send(res, 200, { ok: true });
          if (p === '/api/upload' && req.method === 'POST') {
            const ext = TYPES[String(req.headers['content-type']).split(';')[0]]; if (!ext) return send(res, 415, { error: 'JPG, PNG, WebP만 올릴 수 있습니다' });
            const buf = await body(req, 60e6), name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20) + '.' + ext;
            fs.writeFileSync(path.join(up, name), buf); return send(res, 200, { src: '/uploads/' + name });
          }
          if (p === '/api/upload-audio' && req.method === 'POST') {
            const ext = AUDIO_TYPES[String(req.headers['content-type']).split(';')[0].trim().toLowerCase()]; if (!ext) return send(res, 415, { error: 'MP3, WAV, M4A, OGG만 올릴 수 있습니다' });
            if (Number(req.headers['content-length']) > AUDIO_MAX) { req.resume(); return send(res, 413, { error: '음원은 60MB 이하만 올릴 수 있습니다' }); }
            let buf; try { buf = await body(req, AUDIO_MAX); } catch { return send(res, 413, { error: '음원은 60MB 이하만 올릴 수 있습니다' }); }
            const real = sniffAudio(buf); if (!real) return send(res, 415, { error: '오디오 파일이 아니거나 손상된 파일입니다' });
            const name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20) + '.' + real;
            fs.writeFileSync(path.join(up, name), buf); return send(res, 200, { src: '/uploads/' + name });
          }
          if (p.startsWith('/uploads/') || p.startsWith('/renders/')) {
            const f = path.join(p.startsWith('/uploads/') ? up : out, path.basename(p)); if (!fs.existsSync(f)) return send(res, 404, { error: '파일이 없습니다' });
            const ext = f.split('.').pop(), size = fs.statSync(f).size; res.setHeader('content-type', MIME[ext] ?? 'application/octet-stream'); res.setHeader('access-control-allow-origin', '*'); res.setHeader('accept-ranges', 'bytes');
            if (ext === 'mp4') res.setHeader('content-disposition', `attachment; filename="${url.searchParams.get('name')?.replace(/[^\w.-]/g, '') || path.basename(f)}"`);
            else { const t = new Date(); fs.utimes(f, t, t, () => {}); } // 쓰는 중인 업로드는 정리 대상에서 멀어지게
            // 음원은 미리보기에서 구간 이동(seek)하므로 Range 요청을 지원한다
            const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
            if (m && (m[1] || m[2])) {
              let a = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])), b = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
              if (a > b || a >= size) { res.statusCode = 416; res.setHeader('content-range', `bytes */${size}`); return res.end(); }
              res.statusCode = 206; res.setHeader('content-range', `bytes ${a}-${b}/${size}`); res.setHeader('content-length', b - a + 1);
              return fs.createReadStream(f, { start: a, end: b }).pipe(res);
            }
            res.setHeader('content-length', size);
            return fs.createReadStream(f).pipe(res);
          }
          if (p === '/api/render' && req.method === 'POST') {
            if (queue.length >= MAX_QUEUE) return send(res, 429, { error: `대기열이 가득 찼습니다(최대 ${MAX_QUEUE}개)` });
            const j = JSON.parse((await body(req, 30e6)).toString('utf8')); if (!COMPS.has(j.comp)) return send(res, 400, { error: '알 수 없는 영상 종류' });
            if (j.props?.audio?.src && j.audioLicensed !== true) return send(res, 400, { error: '음원 사용 권한을 확인해야 음악이 든 MP4를 만들 수 있습니다' });
            const id = crypto.randomBytes(6).toString('hex'), job = { id, comp: j.comp, name: String(j.name || j.comp).slice(0, 80), props: j.props, scale: j.scale === '1080' ? '1080' : '720', seconds: Number(j.seconds) || 0, status: 'queued', stage: '대기 중', progress: 0, createdAt: Date.now(), log: [] };
            jobs.set(id, job); queue.push(id); log(job, '대기열에 추가'); pump(); return send(res, 200, { id });
          }
          if (p === '/api/renders' && req.method === 'GET') { const mem = [...jobs.values()].map(view); return send(res, 200, { jobs: [...mem, ...diskJobs()].sort((a, b) => b.createdAt - a.createdAt), storage: storage() }); }
          const m = p.match(/^\/api\/render\/([\w]+)(\/cancel)?$/);
          if (m) {
            const id = m[1], job = jobs.get(id);
            if (m[2] && req.method === 'POST') {
              if (!job) return send(res, 404, { error: '작업이 없습니다' });
              if (job.status === 'queued') { queue.splice(queue.indexOf(id), 1); job.status = 'canceled'; job.stage = '취소됨'; job.props = undefined; job.finishedAt = Date.now(); log(job, '대기 중 취소'); }
              else if (job.status === 'running') { job.canceled = true; job.stage = '취소하는 중'; job.cancel?.(); }
              return send(res, 200, view(job));
            }
            if (req.method === 'DELETE') {
              if (job && (job.status === 'running' || job.status === 'queued')) return send(res, 409, { error: '진행 중인 작업입니다. 먼저 취소하세요' });
              jobs.delete(id); for (const f of [mp4Path(id), metaPath(id)]) fs.rmSync(f, { force: true }); return send(res, 200, { ok: true });
            }
            if (req.method === 'GET') { if (!job) { const d = diskJobs().find((x) => x.id === id); return d ? send(res, 200, d) : send(res, 404, { error: '작업이 없습니다' }); } return send(res, 200, view(job)); }
          }
          if (p === '/api/storage' && req.method === 'GET') return send(res, 200, storage());
          if (p === '/api/settings' && req.method === 'POST') {
            const j = JSON.parse((await body(req, 1e5)).toString('utf8')), s = { rendersDays: clampDays(j.rendersDays, DEFAULTS.rendersDays), uploadsDays: clampDays(j.uploadsDays, DEFAULTS.uploadsDays), autoClean: j.autoClean !== false };
            fs.writeFileSync(settingsFile, JSON.stringify(s)); return send(res, 200, s);
          }
          if (p === '/api/cleanup' && req.method === 'POST') { const j = JSON.parse((await body(req, 5e6)).toString('utf8') || '{}'); return send(res, 200, { ...cleanup({ keep: j.keep ?? [], rendersDays: j.rendersDays, uploadsDays: j.uploadsDays, dryRun: !!j.dryRun, skipUploads: !!j.skipUploads }), storage: storage() }); }
        } catch (e) { return send(res, 500, { error: String(e?.message ?? e) }); }
        next();
      });
    },
  };
}
