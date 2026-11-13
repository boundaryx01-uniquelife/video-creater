import exifr from 'exifr';
import type { PhotoSpec } from '../analysis/videoData.ts';
import { ImportError, borderCrop, decodeImage, photoQuality } from './image.ts';
import { uploadBlob } from './uploads.ts';

export type Path = (string | number)[];
export const setIn = (o: any, path: Path, v: any): any => { if (!path.length) return v; const [h, ...r] = path, c: any = Array.isArray(o) ? [...o] : { ...o }; c[h] = setIn(o?.[h], r, v); return c; };
export const getIn = (o: any, path: Path) => path.reduce((x, k) => x?.[k], o);
export const urlOf = (src: string) => (/^(data:|blob:|https?:|\/)/.test(src) ? src : '/' + src);
const z2 = (n: number) => String(n).padStart(2, '0'), WD = ['일', '월', '화', '수', '목', '금', '토'];

/** 사진 1장 가져오기: EXIF 촬영 시각을 읽고, 긴 변 2560px로 줄여 로컬 서버에 저장(EXIF는 제거됨). 서버가 없으면 미리보기 전용 주소를 쓴다 */
export async function importPhoto(file: File, chip: 'time' | 'date' | 'none', info?: { warning?: string }): Promise<PhotoSpec> {
  const { bmp, warning } = await decodeImage(file); if (warning && info) info.warning = warning; // 형식·손상 검사 포함, HEIC는 여기서 변환
  let when: Date | null = null;
  try { const ex = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] } as any); const d = ex?.DateTimeOriginal ?? ex?.CreateDate; if (d instanceof Date && !isNaN(+d)) when = d; } catch { /* EXIF 없음 */ }
  const cr = borderCrop(bmp); // 사진에 이미 들어 있는 단색 테두리는 잘라낸다
  const k = Math.min(1, 2560 / Math.max(cr.sw, cr.sh)), c = document.createElement('canvas'); c.width = Math.round(cr.sw * k); c.height = Math.round(cr.sh * k);
  c.getContext('2d')!.drawImage(bmp, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, c.width, c.height); const aspect = +(c.width / c.height).toFixed(3), q = photoQuality(c); bmp.close();
  const blob: Blob = await new Promise((r, no) => c.toBlob((b) => (b ? r(b) : no(new ImportError('사진을 JPEG로 변환하지 못했습니다.'))), 'image/jpeg', 0.9));
  const src = (await uploadBlob(blob)) ?? URL.createObjectURL(blob); // 서버 저장 실패 시 미리보기 전용 주소
  const time = when ? `${z2(when.getHours())}:${z2(when.getMinutes())}` : '', date = when ? `${when.getFullYear()}.${z2(when.getMonth() + 1)}.${z2(when.getDate())}` : '';
  return { src, aspect, time, date, wd: when ? WD[when.getDay()] : '', hex: '#888888', exif: '', model: '', fy: aspect < 0.9 ? 0.36 : 0.45, fx: 0.5, cap: { chip: chip === 'time' ? time : chip === 'date' ? date : '', title: '', sub: '' }, q, ts: when ? +when : undefined };
}
export type ImportResult = { photos: PhotoSpec[]; failed: string[]; errors: { name: string; reason: string }[]; warnings: string[] };
export async function importPhotos(files: File[], chip: 'time' | 'date' | 'none', onStep?: (done: number, total: number) => void): Promise<ImportResult> {
  const photos: PhotoSpec[] = [], failed: string[] = [], errors: ImportResult['errors'] = [], warnings: string[] = []; let n = 0;
  for (const f of files) {
    const info: { warning?: string } = {};
    try { photos.push(await importPhoto(f, chip, info)); if (info.warning) warnings.push(`${f.name}: ${info.warning}`); }
    catch (e) { failed.push(f.name); errors.push({ name: f.name, reason: e instanceof ImportError ? e.message : '읽을 수 없는 파일입니다.' }); }
    onStep?.(++n, files.length);
  }
  return { photos, failed, errors, warnings };
}
/** 가져오기 결과를 한 줄 안내문으로 */
export const importSummary = (r: ImportResult) => [r.errors.length ? `읽지 못한 파일 ${r.errors.length}개: ${r.errors.slice(0, 3).map((x) => `${x.name}(${x.reason})`).join(' / ')}${r.errors.length > 3 ? ' …' : ''}` : '', ...r.warnings.slice(0, 2)].filter(Boolean).join(' · ');
export const byTime = (a: PhotoSpec, b: PhotoSpec) => (a.ts ?? Infinity) - (b.ts ?? Infinity);
const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };

const isSampleSrc = (v: unknown) => typeof v === 'string' && /^\/?media\//.test(v);
/**
 * 일괄 넣기 뒤처리: ① 샘플 사진이 남은 칸(오프닝·마무리·남는 슬롯)을 실사진으로 채우고(모자라면 돌려 쓰되 같은 사진이 붙어 나오지 않게),
 * ② 샘플이 들어 있는 인트로·숫자 배경 사진을 대표 사진(가로형 중 품질 최고)으로 바꾼다. 사용자가 이미 넣은 실사진은 건드리지 않는다.
 */
export function fillSamples(props: any, photos: PhotoSpec[]): { props: any; filled: number; intro: boolean } {
  if (!photos.length) return { props, filled: 0, intro: false };
  const q = (p: PhotoSpec) => p.q ?? 0.5, wide = photos.filter((p) => p.aspect >= 1.2), pool = wide.length ? wide : photos;
  const hero = [...pool].sort((a, b) => q(b) - q(a))[0], order = [...photos].sort(byTime);
  let k = Math.max(0, order.indexOf(hero)), filled = 0, intro = false, last: string | null = null;
  const next = (): PhotoSpec => { // 직전에 쓴 사진과 같으면 다음 사진으로
    let p = order[k % order.length]; k++; if (order.length > 1 && p.src === last) { p = order[k % order.length]; k++; } last = p.src; return p; };
  const walk = (v: any, key = ''): any => {
    if (Array.isArray(v)) {
      if ((key === 'photos' || key === 'beatPhotos') && v.some((x) => isSampleSrc(x) || (x && isSampleSrc(x.src)))) // 사진 칸: 문자열 주소 또는 PhotoSpec
        return v.map((x) => (isSampleSrc(x) ? (filled++, next().src) : x && isSampleSrc(x.src) ? (filled++, ((r) => ({ ...r, cap: x.cap ?? r.cap }))(next())) : x));
      return v.map((x) => walk(x, key));
    }
    if (v && typeof v === 'object') { const o: any = {}; for (const [kk, x] of Object.entries(v)) o[kk] = walk(x, kk); return o; }
    if (typeof v === 'string' && /Photo$/.test(key) && isSampleSrc(v)) { if (key === 'introPhoto') { intro = true; return hero.src; } filled++; return next().src; }
    return v;
  };
  return { props: walk(props), filled, intro };
}
const finishAssign = (res: { props: any; msg: string }, photos: PhotoSpec[]) => {
  const f = fillSamples(res.props, photos); const extra = [f.intro ? '인트로 사진을 가장 선명한 가로 사진으로 지정' : '', f.filled ? `샘플 사진이 남은 ${f.filled}칸을 실사진으로 채움` : ''].filter(Boolean).join(' · ');
  return { props: f.props, msg: extra ? `${res.msg} · ${extra}` : res.msg };
};
/** 행사: 촬영 시각이 세션 시간(±10분)에 드는 사진을 그 세션에 배정 */
export function assignByAgenda(props: any, photos: PhotoSpec[]): { props: any; msg: string } {
  const buckets: PhotoSpec[][] = props.sessions.map(() => []); let un = 0;
  for (const p of [...photos].sort(byTime)) { if (p.ts == null) { un++; continue; } const d = new Date(p.ts), m = d.getHours() * 60 + d.getMinutes();
    const i = props.sessions.findIndex((s: any) => { const a = props.agenda[s.agenda]; return a && m >= hm(a.start) - 10 && m < hm(a.end) + 10; }); if (i < 0) un++; else buckets[i].push(p); }
  const sessions = props.sessions.map((s: any, i: number) => (buckets[i].length ? { ...s, photos: withTitle(buckets[i], s.title, `${s.speaker} · ${s.role}`) } : s));
  return finishAssign({ props: { ...props, sessions }, msg: `세션별 ${buckets.map((b) => b.length).join(' · ')}장 배정, 미배정 ${un}장` + (buckets.some((b) => !b.length) ? ' (사진이 없는 세션은 기존 사진 유지)' : '') }, photos);
}
/** 그 외: 촬영 시각순으로 정렬해 챕터에 순서대로 고르게 나눈다 */
export function assignEvenly(props: any, photos: PhotoSpec[]): { props: any; msg: string } {
  const sorted = [...photos].sort(byTime), n = props.chapters.length, per = Math.ceil(sorted.length / n);
  const chapters = props.chapters.map((c: any, i: number) => { const part = sorted.slice(i * per, (i + 1) * per); return part.length ? { ...c, photos: withTitle(part, c.card.big, c.card.small) } : c; });
  return finishAssign({ props: { ...props, chapters }, msg: `${sorted.length}장을 촬영 시각순으로 ${n}개 챕터에 나눔 (챕터당 최대 ${per}장)` }, photos);
}
// 가로 사진을 대표(첫 장)로 올리고, 첫 장에 챕터 제목 자막을 붙인다
function withTitle(list: PhotoSpec[], title: string, sub: string): PhotoSpec[] {
  const hero = list.find((p) => p.aspect >= 1.2) ?? list[0], rest = list.filter((p) => p !== hero);
  return [{ ...hero, cap: { chip: hero.cap?.chip ?? '', title, sub } }, ...rest];
}
