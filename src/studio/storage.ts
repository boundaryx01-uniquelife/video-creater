/** 브라우저 저장소(localStorage): 용량 초과 처리와 사라진 사진 주소 정리 */
import { mapStrings } from './uploads.ts';

export const KEY = (id: string) => `studio:v1:${id}`;
export const NEAR_CHARS = 3_500_000; // 대략 5MB 한도의 70%
export type SaveResult = 'ok' | 'near' | 'stripped' | 'failed';

const firstMedia = (v: any): string => { let r = ''; mapStrings(v, (s) => { if (!r && /^media\//.test(s)) r = s; return s; }); return r; };
const usedChars = () => { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; n += k.length + (localStorage.getItem(k)?.length ?? 0); } } catch { /* 무시 */ } return n; };

/** 저장. 용량이 모자라면 data:/blob: 사진 데이터를 샘플 사진으로 바꿔 다시 저장한다 */
export function saveProps(id: string, props: unknown, fallback: string): SaveResult {
  const put = (v: unknown) => localStorage.setItem(KEY(id), JSON.stringify(v));
  try { put(props); return usedChars() > NEAR_CHARS ? 'near' : 'ok'; } catch { /* 용량 초과 또는 저장 불가 */ }
  try { put(mapStrings(props, (s) => (/^(data|blob):/.test(s) ? fallback : s))); return 'stripped'; } catch { return 'failed'; }
}

/** 불러오기. 이전 방문의 blob: 주소는 이미 죽었으므로 샘플 사진으로 바꾸고 개수를 알려준다 */
export function loadProps(id: string, sample: () => any): { props: any; dead: number } {
  try {
    const s = localStorage.getItem(KEY(id));
    if (s) { const fb = firstMedia(sample()); let dead = 0; const props = mapStrings(JSON.parse(s), (x) => (x.startsWith('blob:') ? (dead++, fb) : x)); return { props, dead }; }
  } catch { /* 손상된 저장값은 무시하고 샘플로 */ }
  return { props: sample(), dead: 0 };
}

/** 모든 모드의 저장값에서 /uploads/ 사진 주소를 모은다(정리 시 보호 목록) */
export function referencedUploads(): string[] {
  const out = new Set<string>();
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (!k.startsWith('studio:v1:')) continue; (localStorage.getItem(k) ?? '').replace(/\/?uploads\/[\w.-]+/g, (m) => (out.add(m.replace(/^\//, '/')), m)); } } catch { /* 무시 */ }
  return [...out].map((x) => (x.startsWith('/') ? x : '/' + x));
}
