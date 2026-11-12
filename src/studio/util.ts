import exifr from 'exifr';
import type { PhotoSpec } from '../analysis/videoData.ts';

export type Path = (string | number)[];
export const setIn = (o: any, path: Path, v: any): any => { if (!path.length) return v; const [h, ...r] = path, c: any = Array.isArray(o) ? [...o] : { ...o }; c[h] = setIn(o?.[h], r, v); return c; };
export const getIn = (o: any, path: Path) => path.reduce((x, k) => x?.[k], o);
export const urlOf = (src: string) => (/^(data:|blob:|https?:|\/)/.test(src) ? src : '/' + src);
const z2 = (n: number) => String(n).padStart(2, '0'), WD = ['일', '월', '화', '수', '목', '금', '토'];

/** 사진 1장 가져오기: EXIF 촬영 시각을 읽고, 긴 변 2560px로 줄여 로컬 서버에 저장(EXIF는 제거됨). 서버가 없으면 미리보기 전용 주소를 쓴다 */
export async function importPhoto(file: File, chip: 'time' | 'date' | 'none'): Promise<PhotoSpec> {
  let when: Date | null = null;
  try { const ex = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] } as any); const d = ex?.DateTimeOriginal ?? ex?.CreateDate; if (d instanceof Date && !isNaN(+d)) when = d; } catch { /* EXIF 없음 */ }
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); const aspect = +(c.width / c.height).toFixed(3); bmp.close();
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9));
  let src: string;
  try { const res = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob }); if (!res.ok) throw new Error(); src = (await res.json()).src; } catch { src = URL.createObjectURL(blob); }
  const time = when ? `${z2(when.getHours())}:${z2(when.getMinutes())}` : '', date = when ? `${when.getFullYear()}.${z2(when.getMonth() + 1)}.${z2(when.getDate())}` : '';
  return { src, aspect, time, date, wd: when ? WD[when.getDay()] : '', hex: '#888888', exif: '', model: '', fy: aspect < 0.9 ? 0.36 : 0.45, fx: 0.5, cap: { chip: chip === 'time' ? time : chip === 'date' ? date : '', title: '', sub: '' }, ts: when ? +when : undefined };
}
export async function importPhotos(files: File[], chip: 'time' | 'date' | 'none', onStep?: (done: number, total: number) => void): Promise<{ photos: PhotoSpec[]; failed: string[] }> {
  const photos: PhotoSpec[] = [], failed: string[] = []; let n = 0;
  for (const f of files) { try { photos.push(await importPhoto(f, chip)); } catch { failed.push(f.name); } onStep?.(++n, files.length); }
  return { photos, failed };
}
export const byTime = (a: PhotoSpec, b: PhotoSpec) => (a.ts ?? Infinity) - (b.ts ?? Infinity);
const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };

/** 행사: 촬영 시각이 세션 시간(±10분)에 드는 사진을 그 세션에 배정 */
export function assignByAgenda(props: any, photos: PhotoSpec[]): { props: any; msg: string } {
  const buckets: PhotoSpec[][] = props.sessions.map(() => []); let un = 0;
  for (const p of [...photos].sort(byTime)) { if (p.ts == null) { un++; continue; } const d = new Date(p.ts), m = d.getHours() * 60 + d.getMinutes();
    const i = props.sessions.findIndex((s: any) => { const a = props.agenda[s.agenda]; return a && m >= hm(a.start) - 10 && m < hm(a.end) + 10; }); if (i < 0) un++; else buckets[i].push(p); }
  const sessions = props.sessions.map((s: any, i: number) => (buckets[i].length ? { ...s, photos: withTitle(buckets[i], s.title, `${s.speaker} · ${s.role}`) } : s));
  return { props: { ...props, sessions }, msg: `세션별 ${buckets.map((b) => b.length).join(' · ')}장 배정, 미배정 ${un}장` + (buckets.some((b) => !b.length) ? ' (사진이 없는 세션은 기존 사진 유지)' : '') };
}
/** 그 외: 촬영 시각순으로 정렬해 챕터에 순서대로 고르게 나눈다 */
export function assignEvenly(props: any, photos: PhotoSpec[]): { props: any; msg: string } {
  const sorted = [...photos].sort(byTime), n = props.chapters.length, per = Math.ceil(sorted.length / n);
  const chapters = props.chapters.map((c: any, i: number) => { const part = sorted.slice(i * per, (i + 1) * per); return part.length ? { ...c, photos: withTitle(part, c.card.big, c.card.small) } : c; });
  return { props: { ...props, chapters }, msg: `${sorted.length}장을 촬영 시각순으로 ${n}개 챕터에 나눔 (챕터당 최대 ${per}장)` };
}
// 가로 사진을 대표(첫 장)로 올리고, 첫 장에 챕터 제목 자막을 붙인다
function withTitle(list: PhotoSpec[], title: string, sub: string): PhotoSpec[] {
  const hero = list.find((p) => p.aspect >= 1.2) ?? list[0], rest = list.filter((p) => p !== hero);
  return [{ ...hero, cap: { chip: hero.cap?.chip ?? '', title, sub } }, ...rest];
}
