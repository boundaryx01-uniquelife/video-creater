/** 업로드(재시도 포함)와 서버에 저장되지 않은 사진(blob:) 다시 올리기 */

export const RETRY_DELAYS = [0, 500, 1500]; // 시도 간 대기(ms): 최대 3회

const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
/** 서버에 올리고 /uploads/... 주소를 돌려준다. 네트워크 오류·5xx는 재시도하고, 끝내 안 되면 null(서버 없음) */
export async function uploadBlob(blob: Blob, onRetry?: (n: number) => void): Promise<string | null> {
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    if (RETRY_DELAYS[i]) { onRetry?.(i); await wait(RETRY_DELAYS[i]); }
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob });
      if (res.ok) return (await res.json()).src as string;
      if (res.status < 500) return null; // 4xx는 다시 해도 같다
    } catch { /* 네트워크 오류: 재시도 */ }
  }
  return null;
}

const walk = (v: any, f: (s: string) => string): any => (typeof v === 'string' ? f(v) : Array.isArray(v) ? v.map((x) => walk(x, f)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, f)])) : v);
export const mapStrings = walk;
export const countBlobs = (props: unknown) => { const s = new Set<string>(); walk(props, (x) => { if (x.startsWith('blob:')) s.add(x); return x; }); return s.size; };

/** blob: 사진을 서버에 다시 올려 /uploads/ 주소로 바꾼다. 이미 사라진 blob은 실패로 센다 */
export async function retryUnsaved(props: any, onStep?: (done: number, total: number) => void): Promise<{ props: any; ok: number; fail: number }> {
  const urls = new Set<string>(); walk(props, (x) => { if (x.startsWith('blob:')) urls.add(x); return x; });
  const map = new Map<string, string>(); let ok = 0, fail = 0, n = 0;
  for (const u of urls) {
    try { const src = await uploadBlob(await (await fetch(u)).blob()); if (src) { map.set(u, src); ok++; } else fail++; } catch { fail++; }
    onStep?.(++n, urls.size);
  }
  return { props: ok ? walk(props, (x) => map.get(x) ?? x) : props, ok, fail };
}
