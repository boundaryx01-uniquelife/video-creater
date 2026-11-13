// Photo Reel Studio 데스크톱 앱(Electron 메인 프로세스).
// 내부 서버를 127.0.0.1 임의 포트에 띄우고 그 주소를 창에 연다. 사용자 데이터는 앱 데이터 폴더(userData)에 저장된다.
import { app, BrowserWindow, Menu, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fork } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const engine = { state: 'checking', detail: '', percent: 0 }; // 렌더용 Chrome 준비 상태
let win = null, server = null;

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

/** PC에 설치된 Chrome/Edge 실행 파일 찾기(렌더 엔진 내려받기가 막힌 환경의 대비책) */
function findSystemBrowser() {
  const pf = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const list = process.platform === 'win32' ? pf.flatMap((b) => [`${b}\\Google\\Chrome\\Application\\chrome.exe`, `${b}\\Microsoft\\Edge\\Application\\msedge.exe`])
    : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  return list.find((f) => { try { return fs.statSync(f).isFile(); } catch { return false; } }) ?? null;
}

/** 렌더용 Chrome(Headless Shell)을 준비한다. 첫 실행에는 내려받기가 필요하다(약 100MB). 시스템 Chrome 경로를 CHROME_BIN으로 주면 건너뛴다.
 *  내려받기는 별도 프로세스에서 하고, 실패하면 PC에 설치된 Chrome/Edge를 쓴다 */
async function prepareEngine() {
  if (process.env.CHROME_BIN) { engine.state = 'ready'; return; }
  engine.state = 'downloading'; engine.detail = '렌더 엔진을 내려받는 중입니다(처음 한 번, 약 100MB)';
  const err = await new Promise((ok) => {
    let done = false; const fin = (e) => { if (!done) { done = true; ok(e); } };
    try {
      const ch = fork(path.join(here, 'engine-setup.mjs'), [], { cwd: process.cwd(), env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, execArgv: [], stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      ch.on('message', (m) => { if (m.t === 'progress') engine.percent = m.percent; else if (m.t === 'done') fin(null); else if (m.t === 'error') fin(m.message); });
      ch.on('exit', () => fin('엔진 설치 프로세스가 중단되었습니다')); ch.on('error', (e) => fin(String(e.message)));
    } catch (e) { fin(String(e.message)); }
  });
  if (!err) { engine.state = 'ready'; engine.detail = ''; return; }
  const sys = findSystemBrowser();
  if (sys) { process.env.CHROME_BIN = sys; engine.state = 'ready'; engine.detail = `렌더 엔진을 내려받지 못해 설치된 브라우저를 사용합니다: ${path.basename(sys)}`; return; }
  engine.state = 'error'; engine.detail = `렌더 엔진을 준비하지 못했습니다: ${err}. 인터넷 연결을 확인하고 앱을 다시 실행하세요.`;
}

async function start() {
  const userData = app.getPath('userData'), dataDir = path.join(userData, 'studio');
  fs.mkdirSync(dataDir, { recursive: true });
  // Remotion은 현재 폴더의 package.json 위치 기준으로 Chrome을 내려받는다 → 쓰기 가능한 앱 데이터 폴더를 작업 폴더로 쓴다
  const work = path.join(userData, 'engine'); fs.mkdirSync(work, { recursive: true });
  const pkg = path.join(work, 'package.json'); if (!fs.existsSync(pkg)) fs.writeFileSync(pkg, '{"name":"engine","private":true}');
  process.chdir(work);
  process.env.NE_DIR ??= path.join(userData, 'data', 'ne');
  process.env.OSM_DIR ??= path.join(userData, 'data', 'osm');
  process.env.TILE_DIR ??= path.join(userData, 'data', 'tiles');
  const { startServer } = await import(pathToFileURL(path.join(here, 'dist/server.mjs')).href);
  server = await startServer({
    root: work, dataDir, cacheDir: path.join(userData, 'cache'),
    uiDir: path.join(here, 'ui'), bundleDir: path.join(here, 'bundle'), mediaDir: path.join(here, 'bundle', 'public', 'media'),
    workerFile: path.join(here, 'dist/travel-worker.mjs'), fetchScript: path.join(here, 'dist/fetch-data.mjs'),
    onEngine: () => engine,
  });
  prepareEngine();
  win = new BrowserWindow({ width: 1440, height: 920, minWidth: 1100, minHeight: 700, title: 'Photo Reel Studio', icon: path.join(here, 'icon.png'), backgroundColor: '#0e0f12', autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } });
  // 앱 화면 밖 주소는 기본 브라우저로 연다(앱 안에서 다른 사이트를 열지 않음)
  const origin = `http://127.0.0.1:${server.port}`;
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url) && !url.startsWith(origin)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  // MP4 내려받기: 저장 위치를 묻는다
  win.webContents.session.on('will-download', (_e, item) => { item.setSaveDialogOptions({ title: 'MP4 저장', defaultPath: item.getFilename() }); });
  await win.loadURL(origin);
  win.on('closed', () => { win = null; });
}

Menu.setApplicationMenu(Menu.buildFromTemplate([
  { label: '파일', submenu: [{ label: '앱 데이터 폴더 열기', click: () => shell.openPath(app.getPath('userData')) }, { type: 'separator' }, { role: 'quit', label: '종료' }] },
  { label: '보기', submenu: [{ role: 'reload', label: '새로고침' }, { role: 'togglefullscreen', label: '전체 화면' }, { role: 'zoomIn', label: '확대' }, { role: 'zoomOut', label: '축소' }, { role: 'resetZoom', label: '원래 크기' }, ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: '개발자 도구' }])] },
]));

app.whenReady().then(start).catch((e) => { dialog.showErrorBox('Photo Reel Studio', `시작하지 못했습니다.\n${String(e?.stack ?? e).slice(0, 800)}`); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { server?.close(); });
