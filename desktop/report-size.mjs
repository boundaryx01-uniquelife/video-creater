// 패키징 결과의 용량 분포를 출력한다(CI 로그용). 사용: node desktop/report-size.mjs
import fs from 'node:fs';
import path from 'node:path';
const size = (p) => { let n = 0; try { const st = fs.lstatSync(p); if (st.isDirectory()) for (const e of fs.readdirSync(p)) n += size(path.join(p, e)); else n = st.size; } catch { /* 무시 */ } return n; };
const mb = (n) => (n / 1e6).toFixed(1).padStart(8) + 'MB';
const rel = 'release';
if (!fs.existsSync(rel)) { console.log('release 폴더 없음'); process.exit(0); }
for (const e of fs.readdirSync(rel)) {
  const p = path.join(rel, e), st = fs.statSync(p);
  if (st.isFile()) console.log('FILE', mb(st.size), e);
  else if (/unpacked$|\.app$|^mac/.test(e)) {
    console.log('DIR ', mb(size(p)), e);
    const app = ['resources/app', 'Photo Reel Studio.app/Contents/Resources/app', 'Contents/Resources/app'].map((x) => path.join(p, x)).find((x) => fs.existsSync(x));
    if (app) { const rows = fs.readdirSync(app).map((n) => [n, size(path.join(app, n))]).sort((a, b) => b[1] - a[1]).slice(0, 6); for (const [n, s] of rows) console.log('       app/' + n.padEnd(14), mb(s)); const nm = path.join(app, 'node_modules'); if (fs.existsSync(nm)) for (const [n, s] of fs.readdirSync(nm).map((n) => [n, size(path.join(nm, n))]).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log('          node_modules/' + n.padEnd(14), mb(s)); }
  }
}
