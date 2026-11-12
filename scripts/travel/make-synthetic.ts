// 테스트용 가상 사진 메타데이터 생성(실제 사진·개인정보 없음). photo-ingest 도구의 metadata.json 과 같은 형식.
import fs from 'node:fs';
import { travelSample } from '../../src/travel/sample.ts';

let seed = 20260503; const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 0.9;
const T = (s: string) => Date.parse(s + ':00Z') / 60000, iso = (m: number) => new Date(m * 60000).toISOString().slice(0, 19);
const kinds = ['plane', 'tokyo', 'hakone', 'kyoto', 'inari'], counts = [4, 14, 12, 16, 9];
const photos: any[] = []; const s = travelSample().stops;
const add = (lat: number, lon: number, t: number, kind: string, gps = true) => { const port = rnd() < 0.4, n = 1 + Math.floor(rnd() * (port ? 2 : 3));
  photos.push({ id: photos.length, file: `IMG_${String(photos.length).padStart(4, '0')}.jpg`, DateTimeOriginal: iso(t), timeSource: 'exif', Make: 'samsung', Model: 'Galaxy S23', ...(gps ? { latitude: lat, longitude: lon } : {}), width: port ? 3000 : 4000, height: port ? 4000 : 3000, aspect: port ? 0.75 : 1.78,
    sharpness: 2000 + rnd() * 9000, brightness: 0.35 + rnd() * 0.3, saturation: 0.3 + rnd() * 0.4, dhash: Array.from({ length: 16 }, () => Math.floor(rnd() * 16).toString(16)).join(''), palette: [{ hex: '#557799', share: 0.4 }], thumb: `media/trip_${kind}_${port ? 'P' : 'L'}${n}.jpg`, hasExif: true }); };
s.forEach((st, i) => { const t0 = T(st.arrive) + 3, t1 = T(st.depart ?? st.arrive) + (st.depart ? -4 : 95); for (let k = 0; k < counts[i]; k++) add(st.lat + gauss() * 0.006, st.lon + gauss() * 0.007, t0 + ((t1 - t0) * (k + rnd() * 0.6)) / counts[i], kinds[i], rnd() > 0.06); });
// 이동 중(신칸센 창밖) 사진 2장, 고속도로 휴게소 1장 → 정차지로 잡히면 안 된다
add(35.05, 138.2, T('2026-05-04T10:20'), 'hakone'); add(34.95, 137.1, T('2026-05-04T11:05'), 'kyoto'); add(35.35, 139.4, T('2026-05-03T16:10'), 'tokyo');
photos.sort((a, b) => a.DateTimeOriginal.localeCompare(b.DateTimeOriginal)).forEach((p, i) => (p.id = i));
fs.writeFileSync(process.argv[2], JSON.stringify({ summary: { count: photos.length, tool: 'synthetic' }, photos }));
console.log('synthetic photos', photos.length, 'with GPS', photos.filter((p) => p.latitude != null).length);
