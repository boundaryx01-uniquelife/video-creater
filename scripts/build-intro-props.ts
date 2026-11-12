// 사용: node --experimental-strip-types --no-warnings scripts/build-intro-props.ts <photo-bundle.zip> <out.json> [--dark]
// 번들(zip)에서 메타데이터를 분석해 데이터 인트로 props를 만든다. 사진은 히어로 1장만 data URL로 포함.
import fs from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import sharp from 'sharp';
import { analyze } from '../src/analysis/analyze.ts';
import { buildDataIntro } from '../src/analysis/introData.ts';

const [src, out] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const z = unzipSync(new Uint8Array(fs.readFileSync(src)));
const raw = JSON.parse(strFromU8(z['metadata.json'])).photos;
const { story, photos } = analyze(raw, { requireThumb: true });
// 히어로: 중요 챕터의 선정컷 중 썸네일이 있고 가로형(16:9 크롭에 유리)인 최고 점수 사진
const cand = story.episodes.filter((e) => e.suggested).sort((a, b) => b.importance - a.importance).flatMap((e) => e.picks).map((id) => photos.find((p) => p.id === id)!).filter((p) => p?.thumb && (p.aspect ?? 1) >= 1.2);
// 제목이 올라갈 영역(좌하단/좌상단)이 조용하고 너무 밝지 않은 사진을 우선
async function fit(p: (typeof cand)[number]) {
  const px = await sharp(Buffer.from(z[p.thumb!])).resize(64, 36, { fit: 'cover' }).greyscale().raw().toBuffer();
  const zone = (x0: number, x1: number, y0: number, y1: number) => { const v: number[] = []; for (let y = Math.floor(y0 * 36); y < y1 * 36; y++) for (let x = Math.floor(x0 * 64); x < x1 * 64; x++) v.push(px[y * 64 + x] / 255); const m = v.reduce((a, b) => a + b, 0) / v.length; return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) }; };
  const t = zone(0.04, 0.66, 0.55, 0.88), tl = zone(0.04, 0.36, 0.03, 0.13);
  const calm = 1 - Math.min(1, t.sd / 0.22), tame = 1 - Math.min(1, Math.max(0, t.m - 0.45) / 0.4), tlq = 1 - Math.min(1, Math.max(0, tl.m - 0.5) / 0.4) * 0.6 - Math.min(1, tl.sd / 0.25) * 0.4;
  return 0.35 * p.score + 0.3 * calm + 0.2 * tame + 0.15 * tlq;
}
const ranked = await Promise.all(cand.map(async (p) => ({ p, v: await fit(p) })));
const hero = (ranked.sort((a, b) => b.v - a.v)[0]?.p) ?? photos.find((p) => p.thumb)!;
const jpg = z[hero.thumb!]; const src64 = 'data:image/jpeg;base64,' + Buffer.from(jpg).toString('base64');
const props = buildDataIntro(photos, story, { mode: process.argv.includes('--dark') ? 'dark' : 'light', hero: { src: src64, fx: 0.5, fy: 0.42, id: hero.id } });
fs.writeFileSync(out, JSON.stringify(props));
console.log('hero id', hero.id, 'aspect', hero.aspect, '| points', props.points.length, 'days', props.spanDays, '| title', props.title, '| range', props.range, '| busiest', JSON.stringify(props.busiest), '| props KB', (fs.statSync(out).size / 1024).toFixed(0));
