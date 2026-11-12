// 브라우저에서 음원 BPM·첫 박 위치를 추정한다(Web Audio 디코딩 + 스펙트럼 플럭스 온셋 + 자기상관/빗살 점수).
// 외부 서버나 라이브러리를 쓰지 않는다. 박이 뚜렷한 곡에서 잘 맞고, 템포가 변하는 곡·박이 약한 앰비언트는 틀릴 수 있으니 수동 수정이 가능해야 한다.

const ONSET_LAG = 0.033;
const SR = 22050, WIN = 1024, HOP = 256, MAX_SEC = 90, MIN_BPM = 70, MAX_BPM = 180;

export type BpmResult = { bpm: number; offsetSec: number; durationSec: number; confidence: number };

function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** 온셋 강도 곡선(프레임당 HOP 샘플): 저·중음역 로그 스펙트럼의 양의 변화량 합 */
export function onsetEnvelope(x: Float32Array): Float32Array {
  const n = Math.max(0, Math.floor((x.length - WIN) / HOP)), env = new Float32Array(n), win = new Float32Array(WIN);
  for (let i = 0; i < WIN; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WIN - 1));
  const re = new Float32Array(WIN), im = new Float32Array(WIN), bins = 190; // ≈ 4kHz까지
  let prev = new Float32Array(bins);
  for (let f = 0; f < n; f++) {
    for (let i = 0; i < WIN; i++) { re[i] = x[f * HOP + i] * win[i]; im[i] = 0; }
    fft(re, im);
    let flux = 0; const cur = new Float32Array(bins);
    for (let b = 1; b < bins; b++) { cur[b] = Math.log1p(Math.hypot(re[b], im[b]) * 20); const d = cur[b] - prev[b]; if (d > 0) flux += d * (b <= 12 ? 1 : 0.12); }  // 저음(킥, ≈ 260Hz 이하)을 크게 반영: 하이햇 같은 고음 박이 위상을 끌고 가는 것을 막는다
    env[f] = f ? flux : 0; prev = cur;
  }
  // 이동 평균을 빼서 지속음·음량 변화의 영향을 줄이고, 음수는 버린다
  const out = new Float32Array(n), r = 43; // ≈ 0.5초
  let sum = 0;
  for (let i = 0; i < n; i++) { sum += env[i]; if (i > 2 * r) sum -= env[i - 2 * r - 1]; const c = i - r, cnt = Math.min(i, 2 * r) + 1; if (c >= 0) out[c] = Math.max(0, env[c] - sum / cnt); }
  return out;
}

/** 온셋 곡선에서 BPM과 첫 박 위치를 추정한다. 순수 함수라 합성 신호로 시험할 수 있다 */
export function estimateTempo(env: Float32Array): { bpm: number; offsetSec: number; confidence: number } | null {
  const fr = SR / HOP; // 초당 프레임 수
  if (env.length < fr * 6) return null;
  // 1) 자기상관으로 대략적인 주기
  const minLag = Math.floor((fr * 60) / MAX_BPM), maxLag = Math.ceil((fr * 60) / MIN_BPM), ac = new Float32Array(maxLag + 2);
  for (let l = minLag - 1; l <= maxLag + 1; l++) { let s = 0; for (let i = 0; i + l < env.length; i++) s += env[i] * env[i + l]; ac[l] = s / (env.length - l); }
  let best = -1, bestScore = 0;
  for (let l = minLag; l <= maxLag; l++) {
    const bpm = (fr * 60) / l, prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.8, 2)); // 120 근처를 선호(옥타브 혼동 완화)
    // 배수 주기(2배, 3배)의 자기상관도 함께 더해 안정화
    const sc = (ac[l] + 0.5 * (ac[l * 2] ?? 0)) * prior; if (sc > bestScore) { bestScore = sc; best = l; }
  }
  if (best < 0) return null;
  const bpm0 = (fr * 60) / best;
  // 2) bpm0 ±4% 범위를 0.05 간격으로 훑으며 빗살(주기×k + 위상) 점수가 최대인 BPM·위상을 찾는다
  let top = { bpm: bpm0, phase: 0, score: -1 };
  const scoreOf = (period: number, phase: number) => { let s = 0, cnt = 0; for (let t = phase; t < env.length - 1; t += period) { const i = Math.floor(t), w = t - i; s += env[i] * (1 - w) + env[i + 1] * w; cnt++; } return s / Math.max(1, cnt); };
  for (let bpm = bpm0 * 0.96; bpm <= bpm0 * 1.04; bpm += 0.05) {
    const period = (fr * 60) / bpm;
    for (let ph = 0; ph < period; ph += 0.5) { const sc = scoreOf(period, ph); if (sc > top.score) top = { bpm, phase: ph, score: sc }; }
  }
  const mean = env.reduce((a, b) => a + b, 0) / env.length || 1;
  // 플럭스는 창이 소리를 처음 덮는 시점에 오르므로 실제 타격보다 ≈33ms 빠르다(합성 킥으로 측정한 보정값)
  const period = (fr * 60) / top.bpm;
  return { bpm: top.bpm, offsetSec: (((top.phase / fr + ONSET_LAG) * fr) % period) / fr, confidence: top.score / mean };
}

/** 음원 파일에서 BPM 분석(처음 90초). 디코딩이 안 되는 형식(브라우저가 못 읽는 m4a 등)이면 null */
export async function analyzeBpm(file: Blob): Promise<BpmResult | null> {
  const buf = await file.arrayBuffer();
  let audio: AudioBuffer;
  try { audio = await new OfflineAudioContext(1, 1, SR).decodeAudioData(buf); } catch { return null; }
  const n = Math.min(audio.length, MAX_SEC * audio.sampleRate), ch = audio.numberOfChannels, mono = new Float32Array(n);
  for (let c = 0; c < ch; c++) { const d = audio.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
  const r = estimateTempo(onsetEnvelope(mono));
  if (!r) return null;
  return { bpm: +r.bpm.toFixed(2), offsetSec: +r.offsetSec.toFixed(3), durationSec: audio.duration, confidence: r.confidence };
}
