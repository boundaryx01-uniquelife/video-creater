// 합성 HEIC 만들기(테스트용): ffmpeg(libx265)로 HEVC 한 프레임을 만들고 HEIF 컨테이너(ISOBMFF)를 직접 조립한다.
// 사용: node scripts/gen-test-heic.mjs <출력.heic> [--rotate] [--when "2026:11:03 14:32:10"]
// 촬영 시각 EXIF(DateTimeOriginal)를 넣고, --rotate는 irot(90도 회전) 속성을 추가해 세로 사진으로 만든다. 사진 내용은 합성 그라디언트·도형뿐이다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const out = process.argv[2], rotate = process.argv.includes('--rotate'), wi = process.argv.indexOf('--when'), when = wi > 0 ? process.argv[wi + 1] : '2026:11:03 14:32:10';
if (!out) { console.error('출력 경로가 필요합니다'); process.exit(1); }
const W = 640, H = 480;
const hevc = execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${W}x${H}:rate=1`, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-c:v', 'libx265', '-x265-params', 'keyint=1:repeat-headers=1:log-level=error', '-f', 'hevc', '-'], { maxBuffer: 1 << 26 });

// Annex B → NAL 목록
const nals = []; { const idx = []; for (let i = 0; i + 3 < hevc.length; i++) if (hevc[i] === 0 && hevc[i + 1] === 0 && (hevc[i + 2] === 1 || (hevc[i + 2] === 0 && hevc[i + 3] === 1))) { idx.push([i, hevc[i + 2] === 1 ? 3 : 4]); i += 2; }
  idx.forEach(([p, n], k) => { let end = k + 1 < idx.length ? idx[k + 1][0] : hevc.length; nals.push(hevc.subarray(p + n, end)); }); }
const type = (n) => (n[0] >> 1) & 0x3f, vps = nals.find((n) => type(n) === 32), sps = nals.find((n) => type(n) === 33), pps = nals.find((n) => type(n) === 34), slices = nals.filter((n) => type(n) < 32);
if (!vps || !sps || !pps || !slices.length) throw new Error('HEVC 스트림에서 VPS/SPS/PPS/슬라이스를 찾지 못했습니다');

const u8 = (...a) => Buffer.from(a), u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; }, u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
const box = (t, ...c) => { const body = Buffer.concat(c); return Buffer.concat([u32(8 + body.length), Buffer.from(t, 'latin1'), body]); };
const full = (t, v, ...c) => box(t, u8(v, 0, 0, 0), ...c);

// SPS의 profile_tier_level(에뮬레이션 방지 바이트 제거 후)에서 hvcC 값을 읽는다
const rbsp = []; for (let i = 0; i < sps.length; i++) { if (i >= 2 && sps[i] === 3 && sps[i - 1] === 0 && sps[i - 2] === 0) continue; rbsp.push(sps[i]); }
const ptl = Buffer.from(rbsp.slice(3, 15)); // profile_space/tier/idc(1) + 호환 플래그(4) + 제약 플래그(6) + level(1)
const arr = (t, n) => Buffer.concat([u8(0x80 | t), u16(1), u16(n.length), n]);
const hvcC = box('hvcC', u8(1), ptl.subarray(0, 11), u8(ptl[11]), u16(0xf000), u8(0xfc), u8(0xfc | 1), u8(0xf8), u8(0xf8), u16(0), u8(0x0f), u8(3), arr(32, vps), arr(33, sps), arr(34, pps));
const ispe = full('ispe', 0, u32(W), u32(H));
const irot = box('irot', u8(1));
const props = [hvcC, ispe, ...(rotate ? [irot] : [])];
const ipma = full('ipma', 0, u32(1), u16(1), u8(props.length), ...props.map((_, i) => u8((i === 0 ? 0x80 : 0) | (i + 1))));

// EXIF(TIFF) 항목: IFD0 → ExifIFD → DateTimeOriginal
const dt = Buffer.from(when + '\0', 'latin1');
const tiff = Buffer.concat([Buffer.from('II*\0', 'latin1'), Buffer.from([8, 0, 0, 0]), Buffer.from([1, 0]), Buffer.from([0x69, 0x87, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0]), Buffer.from([0, 0, 0, 0]),
  Buffer.from([1, 0]), Buffer.from([0x03, 0x90, 2, 0, dt.length, 0, 0, 0, 44, 0, 0, 0]), Buffer.from([0, 0, 0, 0]), dt]);
const exif = Buffer.concat([u32(0), tiff]);
const img = Buffer.concat(slices.map((s) => Buffer.concat([u32(s.length), s])));

const infe = (id, t) => full('infe', 2, u16(id), u16(0), Buffer.from(t, 'latin1'), u8(0));
const iinf = full('iinf', 0, u16(2), infe(1, 'hvc1'), infe(2, 'Exif'));
const iref = full('iref', 0, box('cdsc', u16(2), u16(1), u16(1)));
const hdlr = full('hdlr', 0, u32(0), Buffer.from('pict', 'latin1'), u32(0), u32(0), u32(0), u8(0));
const pitm = full('pitm', 0, u16(1));
const iprp = box('iprp', box('ipco', ...props), ipma);
const ftyp = box('ftyp', Buffer.from('heic', 'latin1'), u32(0), Buffer.from('mif1heic', 'latin1'));
const iloc = (o1, o2) => full('iloc', 0, u8(0x44), u8(0x00), u16(2), u16(1), u16(0), u16(1), u32(o1), u32(img.length), u16(2), u16(0), u16(1), u32(o2), u32(exif.length));
const mk = (o1, o2) => box('meta', u8(0, 0, 0, 0), hdlr, pitm, iloc(o1, o2), iinf, iref, iprp);
const metaLen = mk(0, 0).length, base = ftyp.length + metaLen + 8; // mdat 헤더 8바이트 뒤가 데이터 시작
fs.writeFileSync(out, Buffer.concat([ftyp, mk(base, base + img.length), box('mdat', img, exif)]));
console.log(`${out}: ${W}x${H}${rotate ? ' (irot 90°)' : ''}, ${fs.statSync(out).size} bytes, DateTimeOriginal=${when}`);
