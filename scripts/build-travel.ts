// 여행 영상 데이터 빌드: 사진 메타데이터(또는 정차지 JSON) → 정차지·이동 구간(실제 도로/철도 경로)·지도 레이어·지형 텍스처
// 사용: npm run build:travel -- --photos <metadata.json|photo-bundle.zip> --out <dir> [--overrides <json>] [--no-terrain] [--no-osm] [--attach-nogps]
//       npm run build:travel -- --trip <stops.json> --out <dir>
// 실제 작업은 scripts/travel/pipeline.ts 에 있고, 스튜디오 서버(studio/travel-api.mjs)도 같은 모듈을 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import type { TravelProps } from '../src/travel/types.ts';
import { buildTravel, TravelError, BuildInput } from './travel/pipeline.ts';

const arg = (k: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const out = path.resolve(arg('out')!), media = path.join(out, 'media'); fs.mkdirSync(media, { recursive: true });

let input: BuildInput;
if (arg('photos')) {
  const src = arg('photos')!; let raw: any[]; let zip: Record<string, Uint8Array> | null = null;
  if (src.endsWith('.zip')) { zip = unzipSync(new Uint8Array(fs.readFileSync(src))); raw = JSON.parse(strFromU8(zip['metadata.json'])).photos; } else raw = JSON.parse(fs.readFileSync(src, 'utf8')).photos;
  const srcOf = (p: any) => { if (!p.thumb) return null; if (!zip) return p.thumb; const name = `media/tr_${String(p.id).padStart(4, '0')}.jpg`; fs.writeFileSync(path.join(out, name), zip[p.thumb]); return name; };
  input = { raw, srcOf };
} else input = { trip: JSON.parse(fs.readFileSync(arg('trip')!, 'utf8')) as TravelProps };

try {
  const r = await buildTravel(input, {
    out, terrain: !process.argv.includes('--no-terrain'), osm: !process.argv.includes('--no-osm'), attachNoGps: process.argv.includes('--attach-nogps'),
    overrides: arg('overrides') ? JSON.parse(fs.readFileSync(arg('overrides')!, 'utf8')) : undefined,
  });
  console.log(r.log.join('\n'));
  for (const w of r.warnings) console.log(`[${w.level === 'warn' ? '주의' : '참고'}] ${w.msg}`);
} catch (e) {
  if (e instanceof TravelError) { console.error(`실패(${e.code}): ${e.message}${e.hint ? '\n  ' + e.hint : ''}`); process.exit(2); }
  throw e;
}
