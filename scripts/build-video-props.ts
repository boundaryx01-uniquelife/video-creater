// 사용: node --experimental-strip-types --no-warnings scripts/build-video-props.ts <photo-bundle.zip> <outDir> [--chapters=6]
// outDir/props.json + outDir/media/pXXXX.jpg 생성. 사진은 outDir(프로젝트 밖 권장)에만 기록된다.
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import sharp from 'sharp';
import { analyze, hamming } from '../src/analysis/analyze.ts';
import { buildDataIntro, dotColor, mainCluster } from '../src/analysis/introData.ts';
import type { ChapterSpec, OutroData, PhotoSpec, VideoProps } from '../src/analysis/videoData.ts';
import type { Photo } from '../src/analysis/types.ts';

const args = process.argv.slice(2); const [zipPath, outDir] = args.filter((a) => !a.startsWith('--'));
const nCh = Number(args.find((a) => a.startsWith('--chapters='))?.split('=')[1] ?? 6);
const z = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));
const raw = JSON.parse(strFromU8(z['metadata.json'])).photos;
const { story, photos } = analyze(raw, {});
fs.mkdirSync(path.join(outDir, 'media'), { recursive: true });

const WD = ['일', '월', '화', '수', '목', '금', '토'], SEASON: Record<string, string> = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const TOD: Record<string, string> = { dawn: '새벽', morning: '아침', day: '낮', golden: '오후', evening: '저녁', night: '밤' };
const z2 = (n: number) => String(n).padStart(2, '0');
const exif = (p: Photo) => [p.FNumber ? `f/${p.FNumber}` : '', p.ExposureTime ? (p.ExposureTime >= 1 ? `${p.ExposureTime}s` : `1/${Math.round(1 / p.ExposureTime)}`) : '', p.ISO ? `ISO ${p.ISO}` : '', (p as any).FocalLengthIn35mmFormat || p.FocalLength ? `${Math.round((p as any).FocalLengthIn35mmFormat || p.FocalLength!)}mm` : ''].filter(Boolean).join(' · ');
const focus = new Map<number, { cx: number; cy: number }>();
async function calcFocus(p: Photo) {
  const { data } = await sharp(Buffer.from(z[p.thumb!])).resize(64, 48, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sx = 0, sy = 0, n = 0; for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2]; if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15 && Math.max(r, g, b) - Math.min(r, g, b) > 15) { sx += x; sy += y; n++; } }
  focus.set(p.id, n > 40 ? { cx: sx / n / 64, cy: sy / n / 48 } : { cx: 0.5, cy: 0.42 });
}
const posFor = (c: number, iSize: number, cSize: number) => (iSize - cSize < 4 ? 0.5 : Math.min(1, Math.max(0, (c * iSize - cSize / 2) / (iSize - cSize))));
const spec = (p: Photo): PhotoSpec => { const d = new Date(p.t * 60000); return { src: `media/p${String(p.id).padStart(4, '0')}.jpg`, aspect: p.aspect ?? 1, time: `${z2(d.getUTCHours())}:${z2(d.getUTCMinutes())}`, date: `${d.getUTCFullYear()}.${z2(d.getUTCMonth() + 1)}.${z2(d.getUTCDate())}`, wd: WD[d.getUTCDay()], hex: dotColor(p), exif: exif(p), model: String(p.Model ?? ''), ...(() => { const a = p.aspect ?? 1, f = focus.get(p.id) ?? { cx: 0.5, cy: 0.42 }; const W = 1920, H = 1080, PW = 810;
    // fy: 풀블리드(16:9) 또는 세로 분할(960x1080) 크롭 기준, fx: 오른쪽 세로 패널(810x1080) 크롭 기준
    const tgt = a < 0.9 ? 960 / H : W / H; const iH = a >= tgt ? H : (H * tgt) / a; const fy = a >= tgt ? 0.5 : posFor(f.cy, (W * (a >= 1.2 ? 1 : 0.5)) / a, H);
    const iW = H * a; return { fy: a < 0.9 ? posFor(f.cy, 960 / a, H) : a < 1.78 ? posFor(f.cy, W / a, H) : 0.5, fx: iW > PW ? posFor(f.cx, iW, PW) : 0.5 }; })() }; };
const save = (p: Photo) => { const s = spec(p); fs.writeFileSync(path.join(outDir, s.src), z[p.thumb!]); return s; };

// 1) 인트로 히어로: 제목 영역이 조용한 가로 사진
const thumbs = photos.filter((p) => p.thumb);
const cand = thumbs.filter((p) => (p.aspect ?? 1) >= 1.2);
async function fit(p: Photo) {
  const px = await sharp(Buffer.from(z[p.thumb!])).resize(64, 36, { fit: 'cover' }).greyscale().raw().toBuffer();
  const zone = (x0: number, x1: number, y0: number, y1: number) => { const v: number[] = []; for (let y = Math.floor(y0 * 36); y < y1 * 36; y++) for (let x = Math.floor(x0 * 64); x < x1 * 64; x++) v.push(px[y * 64 + x] / 255); const m = v.reduce((a, b) => a + b, 0) / v.length; return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) }; };
  const t = zone(0.04, 0.66, 0.55, 0.88), tl = zone(0.04, 0.36, 0.03, 0.13);
  return 0.35 * p.score + 0.3 * (1 - Math.min(1, t.sd / 0.22)) + 0.2 * (1 - Math.min(1, Math.max(0, t.m - 0.45) / 0.4)) + 0.15 * (1 - Math.min(1, Math.max(0, tl.m - 0.5) / 0.4) * 0.6 - Math.min(1, tl.sd / 0.25) * 0.4);
}
const ranked = await Promise.all(cand.map(async (p) => ({ p, v: await fit(p) })));
const heroP = ranked.sort((a, b) => b.v - a.v)[0].p;
await calcFocus(heroP);
const heroSpec = save(heroP);
const intro = buildDataIntro(photos, story, { mode: 'light', hero: { src: heroSpec.src, fx: 0.5, fy: 0.42, id: heroP.id } });

// 2) 챕터: 중요도 상위 N개(이벤트 우선), 사진은 썸네일 있는 것 중 그룹 대표만
const dayOfT = (t: number) => Math.floor(t / 1440);
const cl = mainCluster(photos); const day0 = dayOfT(cl[0].t);
const eps = story.episodes.filter((e) => e.suggested && e.kind === 'event').sort((a, b) => b.importance - a.importance).slice(0, nCh + 2);
const chapters: ChapterSpec[] = [];
for (const e of eps.sort((a, b) => a.from.localeCompare(b.from))) {
  const t0 = Date.parse(e.from + 'Z') / 60000, t1 = Date.parse(e.to + 'Z') / 60000;
  const inEp = photos.filter((p) => p.t >= t0 && p.t <= t1 && p.thumb);
  const best = new Map<number, Photo>(); inEp.forEach((p) => { const b = best.get(p.group!); if (!b || p.score > b.score) best.set(p.group!, p); });
  const cands = [...best.values()].sort((a, b) => b.score - a.score); const kept: Photo[] = [];
  for (const p of cands) if (!kept.some((k) => hamming(k.dhash, p.dhash) <= 18 && Math.abs(k.t - p.t) <= 45)) kept.push(p);
  const list = kept.sort((a, b) => a.t - b.t); if (list.length < 4) continue; for (const p of list) await calcFocus(p);
  const land = list.filter((p) => (p.aspect ?? 1) >= 1.2); const hero = (land.length ? land : list).sort((a, b) => b.score - a.score)[0];
  const rest = list.filter((p) => p !== hero).sort((a, b) => b.score - a.score).slice(0, 13).sort((a, b) => a.t - b.t);
  const f = new Date(t0 * 60000), l = new Date(t1 * 60000); const same = f.getUTCMonth() === l.getUTCMonth();
  const big = e.days > 1 ? (same ? `${z2(f.getUTCMonth() + 1)}.${z2(f.getUTCDate())}–${z2(l.getUTCDate())}` : `${z2(f.getUTCMonth() + 1)}.${z2(f.getUTCDate())}–${z2(l.getUTCMonth() + 1)}.${z2(l.getUTCDate())}`) : `${z2(f.getUTCMonth() + 1)}.${z2(f.getUTCDate())}`;
  const tod = Object.entries(e.timeOfDay).sort((a, b) => b[1] - a[1])[0][0];
  const allT = photos.filter((p) => p.t >= t0 && p.t <= t1).map((p) => p.t % 1440).sort((a, b) => a - b);
  const hm = (m: number) => `${z2(Math.floor(m / 60))}:${z2(Math.floor(m % 60))}`;
  chapters.push({
    index: 0, total: 0, big, small: `${f.getUTCFullYear()}년 ${SEASON[e.season]}`, kicker: TOD[tod],
    meta: [{ v: String(e.photos), l: '장의 사진' }, e.days > 1 ? { v: `${e.days}일`, l: '에 걸친 기록' } : { v: `${hm(allT[0])} — ${hm(allT[allT.length - 1])}`, l: '촬영 시간' }, { v: TOD[tod], l: '주로 찍은 시간대' }],
    accent: e.palette.accent, light: e.palette.light, fromDay: dayOfT(t0) - day0, toDay: dayOfT(t1) - day0, style: e.rhythm.style,
    photos: [hero, ...rest].map(save), matchCut: (hero.aspect ?? 1) >= 1.2,
  });
  if (chapters.length === nCh) break;
}
chapters.forEach((c, i) => ((c.index = i), (c.total = chapters.length)));

// 3) 아웃트로 통계
const hours = Array(24).fill(0); intro.points.forEach((p) => hours[Math.min(23, Math.floor(p.h))]++);
const dev: Record<string, number> = {}; photos.forEach((p) => { const k = String(p.Model ?? ''); if (k) dev[k] = (dev[k] ?? 0) + 1; });
const [device, deviceCount] = Object.entries(dev).sort((a, b) => b[1] - a[1])[0];
const outro: OutroData = { photos: intro.points.length, days: Number(intro.title.replace(/\D/g, '')) || 0, regions: intro.stats[1].n, chapters: chapters.length, hours, peakHour: hours.indexOf(Math.max(...hours)), busiest: intro.busiest.label, busiestCount: intro.busiest.count, device, deviceCount, title: intro.title, range: intro.range };
const props: VideoProps = { intro, chapters, outro };
fs.writeFileSync(path.join(outDir, 'props.json'), JSON.stringify(props));
console.log('chapters', chapters.map((c) => `${c.big}(${c.photos.length}장 ${c.style} ${c.matchCut ? 'match' : 'edit'})`).join(' | '));
console.log('media files', fs.readdirSync(path.join(outDir, 'media')).length, '| outro', JSON.stringify({ ...outro, hours: undefined }));
