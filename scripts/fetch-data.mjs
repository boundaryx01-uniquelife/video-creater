// 여행 영상용 지도 데이터(Natural Earth, 공공 도메인) 내려받기 → data/ne/*.geojson (약 150MB, gitignore 대상)
// 사용: npm run fetch:data [-- --dir <폴더>] [-- --check]
//   --check : 내려받지 않고 어떤 파일이 있는지만 출력한다.
// 출처: https://github.com/nvkelso/natural-earth-vector (raw.githubusercontent.com 에서 받는다)
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
export const NE_FILES = ['ne_10m_populated_places', 'ne_10m_roads', 'ne_10m_railroads', 'ne_10m_rivers_lake_centerlines', 'ne_10m_lakes', 'ne_10m_urban_areas'];
const MIN_BYTES = 1e6; // 이보다 작으면 오류 페이지로 보고 다시 받는다

const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const dir = path.resolve(arg('dir') || process.env.NE_DIR || 'data/ne');
const valid = (f) => { try { const st = fs.statSync(f); if (st.size < MIN_BYTES) return false; const fd = fs.openSync(f, 'r'), b = Buffer.alloc(64); fs.readSync(fd, b, 0, 64, 0); fs.closeSync(fd); return b.toString('utf8').trimStart().startsWith('{'); } catch { return false; } };

if (process.argv.includes('--check')) {
  for (const n of NE_FILES) console.log(valid(path.join(dir, n + '.geojson')) ? '있음  ' : '없음  ', n);
  process.exit(NE_FILES.every((n) => valid(path.join(dir, n + '.geojson'))) ? 0 : 1);
}

fs.mkdirSync(dir, { recursive: true });
let failed = 0;
for (const [i, n] of NE_FILES.entries()) {
  const f = path.join(dir, n + '.geojson'), tag = `[${i + 1}/${NE_FILES.length}] ${n}`;
  if (valid(f)) { console.log(`${tag} 이미 있음 (${(fs.statSync(f).size / 1e6).toFixed(0)}MB)`); continue; }
  console.log(`${tag} 내려받는 중…`);
  const part = f + '.part';
  try {
    // 프록시 환경 변수를 따르려고 node fetch 대신 curl 을 쓴다(build-travel 의 지형 타일 받기와 같은 방식)
    await run('curl', ['-sS', '-f', '-L', '-m', '1200', '--retry', '2', '-o', part, BASE + n + '.geojson'], { maxBuffer: 1 << 20 });
    if (!valid(part)) throw new Error('받은 파일이 올바른 GeoJSON이 아닙니다');
    fs.renameSync(part, f);
    console.log(`${tag} 완료 (${(fs.statSync(f).size / 1e6).toFixed(0)}MB)`);
  } catch (e) {
    failed++; try { fs.unlinkSync(part); } catch { /* 없음 */ }
    console.error(`${tag} 실패: ${String(e.stderr || e.message || e).trim().slice(0, 200)}`);
  }
}
if (failed) { console.error(`${failed}개 파일을 받지 못했습니다. 네트워크(raw.githubusercontent.com 접근)를 확인한 뒤 다시 실행하세요.`); process.exit(1); }
console.log('지도 데이터 준비 완료:', dir);
