// 스튜디오 여행 모드 API (studio/plugin.mjs 에서 마운트). 로컬 전용이며 인증이 없다.
//   GET  /api/travel/status            지도 데이터 유무, 내려받기 진행 상황
//   POST /api/travel/fetch-data        지도 데이터(Natural Earth) 내려받기 시작 (scripts/fetch-data.mjs)
//   POST /api/travel/upload            사진 원본 1장 업로드(EXIF 위치·시각 유지) → { u }
//   POST /api/travel/build             { photos:[{u,n}], attachNoGps } → 작업 { job, tid }
//   POST /api/travel/reroute           { tid, props, reuse } 편집된 정차지·이동수단으로 바뀐 구간만 경로 재계산
//   GET  /api/travel/job/:id           작업 진행률·단계·결과
//   GET  /api/travel/session/:tid      저장된 결과(props, meta)
//   GET  /studio-assets/:tid/...       결과 에셋(사진·지도 레이어·지형 텍스처)
// 무거운 작업(사진 분석, 지도 데이터 읽기, 경로 탐색, 지형 생성)은 자식 프로세스(scripts/travel/worker.ts)에서 한 번에 하나씩 처리한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fork, spawn } from 'node:child_process';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', json: 'application/json; charset=utf-8' };
const ROUTE_CODES = new Set(['route-fallback', 'osm-fail', 'osm-noroute', 'terrain-fail', 'terrain-partial']);
const TID = /^[a-f0-9]{10}$/, UPLOAD = /^[a-f0-9]{20}\.(jpg|png|webp)$/;

/** 렌더러(다른 주소의 페이지)가 받을 수 있게 props 안의 스튜디오 에셋 주소를 이 서버의 전체 주소로 바꾼다 */
export const studioAssetUrls = (json, port) => json.replaceAll('"/studio-assets/', `"http://127.0.0.1:${port}/studio-assets/`);

export function travelApi(server, { root, send, body }) {
  const base = path.join(root, '.studio'), res = path.join(base, 'travel'), up = path.join(base, 'travel-uploads'), cache = path.join(root, '.cache');
  fs.mkdirSync(res, { recursive: true }); fs.mkdirSync(up, { recursive: true });
  const jobs = new Map(); const queue = []; let current = null, worker = null, workerReady = null, idle = null;
  const fetchState = { running: false, ok: null, log: [] };

  /* ---------- 지도 데이터 ---------- */
  const NE = ['ne_10m_populated_places', 'ne_10m_roads', 'ne_10m_railroads', 'ne_10m_rivers_lake_centerlines', 'ne_10m_lakes', 'ne_10m_urban_areas'];
  const neDir = path.resolve(root, process.env.NE_DIR || 'data/ne');
  const missing = () => NE.filter((n) => { try { return fs.statSync(path.join(neDir, n + '.geojson')).size < 1e6; } catch { return true; } });
  function startFetch() {
    if (fetchState.running) return;
    Object.assign(fetchState, { running: true, ok: null, log: [] });
    const ch = spawn(process.execPath, [path.join(root, 'scripts/fetch-data.mjs')], { cwd: root, env: process.env });
    const add = (d) => { for (const l of String(d).split('\n')) if (l.trim()) fetchState.log.push(l.trim()); if (fetchState.log.length > 40) fetchState.log.splice(0, fetchState.log.length - 40); };
    ch.stdout.on('data', add); ch.stderr.on('data', add);
    ch.on('close', (code) => { fetchState.running = false; fetchState.ok = code === 0; });
    ch.on('error', (e) => { fetchState.running = false; fetchState.ok = false; add('실행 실패: ' + e.message); });
  }

  /* ---------- 작업자 프로세스 ---------- */
  async function ensureWorker() {
    clearTimeout(idle);
    if (worker && worker.connected) return workerReady;
    workerReady = (async () => {
      const { build } = await import('esbuild'), outfile = path.join(cache, 'travel-worker.mjs');
      await build({ entryPoints: [path.join(root, 'scripts/travel/worker.ts')], bundle: true, platform: 'node', format: 'esm', external: ['sharp', 'exifr'], outfile, logLevel: 'silent' });
      const w = fork(outfile, [], { cwd: root, execArgv: [], env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      w.on('message', onWorker);
      w.on('exit', (code) => { if (worker === w) worker = null; if (current && !current.done) { fail(current, 'worker-exit', '작업 프로세스가 중단되었습니다(메모리 부족일 수 있습니다). 사진 수를 줄여 다시 시도해 주세요.'); } });
      worker = w; await new Promise((ok) => { const f = (m) => { if (m?.t === 'ready') { w.off('message', f); ok(); } }; w.on('message', f); });
    })();
    return workerReady;
  }
  const armIdle = () => { clearTimeout(idle); idle = setTimeout(() => { if (!current && worker) { worker.kill(); worker = null; } }, 10 * 60e3); idle.unref?.(); };
  const fail = (job, code, message, hint) => { job.done = true; job.status = 'error'; job.error = { code, message, hint }; current = null; next(); };
  function onWorker(m) {
    const job = current; if (!job || m.id !== job.id) return;
    if (m.t === 'stage') { job.stage = m.stage; job.msg = m.msg; job.progress = Math.max(job.progress, m.progress); }
    else if (m.t === 'error') fail(job, m.code, m.message, m.hint);
    else if (m.t === 'done') {
      try {
        if (job.kind === 'build') job.result = { tid: job.tid, props: m.props, meta: m.meta };
        else {
          const f = path.join(res, job.tid, 'travel-meta.json'); let meta = null;
          try { meta = JSON.parse(fs.readFileSync(f, 'utf8')); meta.warnings = [...meta.warnings.filter((w) => !ROUTE_CODES.has(w.code)), ...m.warnings]; fs.writeFileSync(f, JSON.stringify(meta)); } catch { /* 메타 없음 */ }
          job.result = { tid: job.tid, props: m.props, warnings: meta?.warnings ?? m.warnings };
        }
      } catch (e) { return fail(job, 'internal', String(e.message ?? e)); }
      job.done = true; job.status = 'done'; job.progress = 1; job.stage = 'done'; job.msg = '완료'; current = null; next();
    }
  }
  async function next() {
    if (current) { return; } const job = queue.shift(); if (!job) { armIdle(); return; }
    current = job; job.status = 'running'; job.msg = '준비 중';
    try { await ensureWorker(); worker.send(job.payload); } catch (e) { fail(job, 'internal', '작업 프로세스를 시작하지 못했습니다: ' + String(e.message ?? e).slice(0, 200)); }
  }
  function enqueue(kind, tid, payload) {
    const id = crypto.randomBytes(5).toString('hex'), job = { id, kind, tid, status: 'queued', stage: 'queued', msg: '대기 중', progress: 0, done: false, payload: { ...payload, id } };
    jobs.set(id, job); queue.push(job); next(); return job;
  }
  const publicJob = (j) => ({ id: j.id, kind: j.kind, tid: j.tid, status: j.status, stage: j.stage, msg: j.msg, progress: j.progress, error: j.error, result: j.status === 'done' ? j.result : undefined });
  const mapDataError = () => ({ error: '지도 데이터가 없습니다.', code: 'no-map-data', missing: missing(), hint: `Natural Earth 지도 데이터가 ${neDir} 에 없습니다. 터미널에서 npm run fetch:data 를 실행하거나 [지도 데이터 내려받기]를 누르세요.` });

  server.httpServer?.once('close', () => { worker?.kill(); });
  server.middlewares.use(async (req, resp, nextMw) => {
    const url = new URL(req.url, 'http://local'), p = url.pathname;
    if (!p.startsWith('/api/travel/') && !p.startsWith('/studio-assets/')) return nextMw();
    try {
      if (p === '/api/travel/status') return send(resp, 200, { ready: !missing().length, missing: missing(), dir: neDir, fetch: fetchState });
      if (p === '/api/travel/fetch-data' && req.method === 'POST') { startFetch(); return send(resp, 200, fetchState); }
      if (p === '/api/travel/upload' && req.method === 'POST') {
        const ext = TYPES[String(req.headers['content-type']).split(';')[0]]; if (!ext) return send(resp, 415, { error: 'JPG, PNG, WebP만 올릴 수 있습니다' });
        const buf = await body(req, 80e6), u = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20) + '.' + ext;
        fs.writeFileSync(path.join(up, u), buf); return send(resp, 200, { u });
      }
      if (p === '/api/travel/build' && req.method === 'POST') {
        if (missing().length) return send(resp, 409, mapDataError());
        const j = JSON.parse((await body(req, 5e6)).toString('utf8')), list = (Array.isArray(j.photos) ? j.photos : []).filter((x) => UPLOAD.test(String(x?.u)) && fs.existsSync(path.join(up, x.u)));
        if (!list.length) return send(resp, 400, { error: '올라간 사진이 없습니다. 사진을 먼저 올려 주세요.', code: 'no-photos' });
        const tid = crypto.randomBytes(5).toString('hex'), out = path.join(res, tid);
        const job = enqueue('build', tid, { cmd: 'build', out, prefix: `/studio-assets/${tid}/`, files: list.map((x) => ({ path: path.join(up, x.u), name: String(x.n ?? x.u).slice(0, 120) })), attachNoGps: j.attachNoGps !== false });
        return send(resp, 200, { job: job.id, tid });
      }
      if (p === '/api/travel/reroute' && req.method === 'POST') {
        if (missing().length) return send(resp, 409, mapDataError());
        const j = JSON.parse((await body(req, 20e6)).toString('utf8')), props = j.props;
        if (!TID.test(String(j.tid)) || !fs.existsSync(path.join(res, j.tid))) return send(resp, 404, { error: '작업 결과를 찾을 수 없습니다. 사진으로 다시 만들어 주세요.' });
        const okNum = (s) => Number.isFinite(s?.lat) && Number.isFinite(s?.lon) && typeof s?.arrive === 'string';
        if (!Array.isArray(props?.stops) || props.stops.length < 2 || !props.stops.every(okNum)) return send(resp, 400, { error: '정차지가 2곳 이상이어야 합니다.' });
        const job = enqueue('reroute', j.tid, { cmd: 'reroute', out: path.join(res, j.tid), prefix: `/studio-assets/${j.tid}/`, props, reuse: Array.isArray(j.reuse) ? j.reuse : [], cruise: Array.isArray(j.cruise) ? j.cruise.map(Number) : [] });
        return send(resp, 200, { job: job.id, tid: j.tid });
      }
      if (p.startsWith('/api/travel/job/')) { const job = jobs.get(p.split('/').pop()); return job ? send(resp, 200, publicJob(job)) : send(resp, 404, { error: '작업이 없습니다' }); }
      if (p.startsWith('/api/travel/session/')) {
        const tid = p.split('/').pop(), d = path.join(res, tid);
        if (!TID.test(tid) || !fs.existsSync(path.join(d, 'travel-props.json'))) return send(resp, 404, { error: '저장된 결과가 없습니다' });
        return send(resp, 200, { tid, props: JSON.parse(fs.readFileSync(path.join(d, 'travel-props.json'), 'utf8')), meta: JSON.parse(fs.readFileSync(path.join(d, 'travel-meta.json'), 'utf8')) });
      }
      if (p.startsWith('/studio-assets/')) {
        const parts = decodeURIComponent(p).split('/').slice(2), tid = parts[0], rel = path.normalize(parts.slice(1).join('/'));
        const f = path.join(res, tid ?? '', rel);
        if (!TID.test(tid ?? '') || rel.startsWith('..') || path.isAbsolute(rel) || !f.startsWith(path.join(res, tid) + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return send(resp, 404, { error: '파일이 없습니다' });
        resp.setHeader('content-type', MIME[f.split('.').pop()] ?? 'application/octet-stream'); resp.setHeader('access-control-allow-origin', '*'); resp.setHeader('cache-control', 'no-cache'); resp.setHeader('content-length', fs.statSync(f).size);
        return fs.createReadStream(f).pipe(resp);
      }
    } catch (e) { return send(resp, 500, { error: String(e?.message ?? e) }); }
    return nextMw();
  });
}
