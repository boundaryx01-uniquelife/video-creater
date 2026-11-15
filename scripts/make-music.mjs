// 초등 영상용 배경 음악 3곡을 코드로 작곡·합성한다(외부 음원·샘플을 쓰지 않으므로 이 프로젝트 안에서 저작권 걱정 없이 쓸 수 있다).
// 사용: node scripts/make-music.mjs  → public/music/{lively,warm,calm}.mp3  (ffmpeg 필요)
// 모든 곡은 0초에 첫 박이 오도록 만든다(영상 장면 길이를 박자에 맞추기 위해).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const NOTE = (s) => { const m = s.match(/^([A-G])(#|b)?(\d)$/); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 12 * (Number(m[3]) + 1) + base; };
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/* ---------- 버스(채널)와 기본 악기 ---------- */
function makeBus(len) { return { L: new Float32Array(len), R: new Float32Array(len) }; }
function add(bus, start, sig, gain, panv = 0) {
  const s0 = Math.round(start * SR), gl = gain * Math.cos((panv + 1) * Math.PI / 4), gr = gain * Math.sin((panv + 1) * Math.PI / 4);
  for (let i = 0; i < sig.length; i++) { const k = s0 + i; if (k < 0 || k >= bus.L.length) continue; bus.L[k] += sig[i] * gl; bus.R[k] += sig[i] * gr; }
}
const env = (n, a, d) => { const e = new Float32Array(n), A = Math.max(1, Math.round(a * SR)); for (let i = 0; i < n; i++) e[i] = (i < A ? i / A : 1) * Math.exp(-(i / SR) / d); return e; };
const release = (sig, r = 0.04) => { const R = Math.round(r * SR); for (let i = 0; i < R && i < sig.length; i++) sig[sig.length - 1 - i] *= i / R; return sig; };

/** 나일론 줄 뜯는 소리(카플러스-스트롱) */
function pluck(f, dur, bright = 0.5) {
  const n = Math.round(dur * SR), N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N), out = new Float32Array(n);
  let prev = 0; for (let i = 0; i < N; i++) { const r = rnd() * 2 - 1; prev = prev + (r - prev) * (0.35 + bright * 0.5); buf[i] = prev; }
  let idx = 0; const decay = 0.9965;
  for (let i = 0; i < n; i++) { const a = buf[idx], b = buf[(idx + 1) % N]; out[i] = a; buf[idx] = (a + b) * 0.5 * decay; idx = (idx + 1) % N; }
  return release(out, 0.05);
}
/** 전자 피아노(FM): 부드러운 종소리 같은 건반 */
function epiano(f, dur, vel = 1) {
  const n = Math.round(dur * SR), out = new Float32Array(n), e = env(n, 0.004, 1.1);
  for (let i = 0; i < n; i++) { const t = i / SR, idxm = 1.1 * Math.exp(-t * 3) + 0.15; out[i] = Math.sin(2 * Math.PI * f * t + idxm * Math.sin(2 * Math.PI * f * t)) * e[i] * vel + 0.12 * Math.sin(4 * Math.PI * f * t) * e[i] * Math.exp(-t * 4); }
  return release(out);
}
/** 마림바: 짧고 둥근 나무 건반 */
function marimba(f, dur) {
  const n = Math.round(Math.min(dur, 0.9) * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 6) + 0.25 * Math.sin(2 * Math.PI * f * 3.93 * t) * Math.exp(-t * 22)) * Math.min(1, i / 60); }
  return release(out, 0.02);
}
/** 글로켄슈필(철금): 맑은 높은 종 */
function glock(f, dur) {
  const n = Math.round(Math.min(Math.max(dur, 0.8), 1.6) * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6) + 0.12 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 12)) * Math.exp(-t * 2.4) * Math.min(1, i / 30); }
  return release(out, 0.03);
}
/** 패드: 살짝 어긋난 삼각파 세 겹을 부드럽게 깎은 배경 화음 */
function pad(fs, dur) {
  const n = Math.round(dur * SR), out = new Float32Array(n), A = 0.5 * SR, Rl = 0.7 * SR; let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR; let v = 0;
    for (const f of fs) for (const dt of [-0.004, 0, 0.0045]) { const ph = (f * (1 + dt) * t) % 1; v += (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph); }
    lp += (v / (fs.length * 3) - lp) * 0.08; // 한 극 저역통과(약 600Hz)
    out[i] = lp * Math.min(1, i / A) * Math.min(1, (n - i) / Rl);
  }
  return out;
}
/** 베이스: 둥근 사인 + 약한 배음 */
function bass(f, dur) {
  const n = Math.round(dur * SR), out = new Float32Array(n), e = env(n, 0.006, 0.9);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(4 * Math.PI * f * t)) * e[i]; }
  return release(out, 0.03);
}
function kick() { const n = Math.round(0.32 * SR), out = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = 45 + 75 * Math.exp(-t * 28); ph += f / SR; out[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 9) * Math.min(1, i / 20); } return out; }
function noiseHit(len, decay, hp) { const n = Math.round(len * SR), out = new Float32Array(n); let x1 = 0, y = 0; for (let i = 0; i < n; i++) { const x = rnd() * 2 - 1; y = hp * (y + x - x1); x1 = x; out[i] = y * Math.exp(-(i / SR) / decay); } return out; }
const clap = () => { const a = noiseHit(0.18, 0.05, 0.85), out = new Float32Array(a.length + 900); for (const off of [0, 300, 650]) for (let i = 0; i < a.length; i++) out[i + off] += a[i] * (off ? 0.6 : 1); return out; };
const shaker = () => noiseHit(0.06, 0.018, 0.97);
const snap = () => noiseHit(0.09, 0.022, 0.92);

/** 잔향(슈뢰더): 콤 4개 + 올패스 2개 */
function reverb(bus, wet = 0.2) {
  const out = makeBus(bus.L.length);
  for (const ch of ['L', 'R']) {
    const x = bus[ch], y = new Float32Array(x.length), spread = ch === 'R' ? 23 : 0;
    for (const [ms, fb] of [[29.7, 0.8], [37.1, 0.79], [41.1, 0.78], [43.7, 0.77]]) { const D = Math.round((ms * SR) / 1000) + spread, buf = new Float32Array(D); let k = 0, lp = 0; for (let i = 0; i < x.length; i++) { const o = buf[k]; lp = lp + (o - lp) * 0.45; buf[k] = x[i] + lp * fb; k = (k + 1) % D; y[i] += o * 0.25; } }
    for (const ms of [5.0, 1.7]) { const D = Math.round((ms * SR) / 1000), buf = new Float32Array(D); let k = 0; for (let i = 0; i < y.length; i++) { const b = buf[k], v = y[i] + b * 0.5; buf[k] = v; y[i] = b - v * 0.5; k = (k + 1) % D; } }
    for (let i = 0; i < x.length; i++) out[ch][i] = x[i] + y[i] * wet;
  }
  return out;
}

/* ---------- 곡 ---------- */
// 화음: 근음과 구성음(미디 번호). 선율: [음, 시작 박, 길이 박] (한 마디 = 4박)
const TRACKS = {
  lively: { bpm: 112, key: 'C', title: '밝게 — 마림바와 우쿨렐레, 손뼉',
    chords: [['C3', ['C4', 'E4', 'G4']], ['G2', ['B3', 'D4', 'G4']], ['A2', ['C4', 'E4', 'A4']], ['F2', ['C4', 'F4', 'A4']]],
    A: [[['E5', 0, 1], ['G5', 1, 0.5], ['E5', 1.5, 0.5], ['D5', 2, 1], ['C5', 3, 1]], [['D5', 0, 1.5], ['B4', 1.5, 0.5], ['D5', 2, 1], ['G5', 3, 1]], [['E5', 0, 1], ['C5', 1, 0.5], ['E5', 1.5, 0.5], ['A5', 2, 1.5], ['G5', 3.5, 0.5]], [['F5', 0, 1], ['E5', 1, 0.5], ['D5', 1.5, 0.5], ['C5', 2, 2]]],
    B: [[['G5', 0, 0.5], ['A5', 0.5, 0.5], ['G5', 1, 0.5], ['E5', 1.5, 0.5], ['C6', 2, 1.5], ['G5', 3.5, 0.5]], [['B5', 0, 1], ['A5', 1, 0.5], ['G5', 1.5, 0.5], ['D5', 2, 2]], [['C6', 0, 1], ['B5', 1, 0.5], ['A5', 1.5, 0.5], ['E5', 2, 1], ['A5', 3, 1]], [['A5', 0, 1], ['G5', 1, 1], ['F5', 2, 0.5], ['E5', 2.5, 0.5], ['C5', 3, 1]]],
    form: ['intro', 'A', 'B', 'A', 'B', 'A2', 'B2', 'outro'], lead: 'marimba', comp: 'strum', drums: 'full' },
  warm: { bpm: 92, key: 'G', title: '따뜻하게 — 전자 피아노와 철금',
    chords: [['G2', ['B3', 'D4', 'G4']], ['E2', ['B3', 'E4', 'G4']], ['C3', ['C4', 'E4', 'G4']], ['D3', ['A3', 'D4', 'F#4']]],
    A: [[['B4', 0, 1.5], ['D5', 1.5, 0.5], ['G5', 2, 2]], [['E5', 0, 1], ['G5', 1, 1], ['B4', 2, 2]], [['C5', 0, 1], ['E5', 1, 1], ['G5', 2, 1], ['E5', 3, 1]], [['F#5', 0, 1.5], ['E5', 1.5, 0.5], ['D5', 2, 2]]],
    B: [[['D5', 0, 0.5], ['G5', 0.5, 0.5], ['B5', 1, 1.5], ['A5', 2.5, 0.5], ['G5', 3, 1]], [['G5', 0, 1.5], ['F#5', 1.5, 0.5], ['E5', 2, 2]], [['E5', 0, 1], ['G5', 1, 1], ['C6', 2, 1.5], ['B5', 3.5, 0.5]], [['A5', 0, 2], ['F#5', 2, 1], ['D5', 3, 1]]],
    form: ['intro', 'A', 'B', 'A', 'B', 'outro'], lead: 'glock', comp: 'keys', drums: 'soft' },
  calm: { bpm: 76, key: 'F', title: '차분하게 — 피아노 분산화음과 패드',
    chords: [['F2', ['A3', 'C4', 'F4']], ['C3', ['G3', 'C4', 'E4']], ['D3', ['A3', 'D4', 'F4']], ['A#2', ['A#3', 'D4', 'F4']]],
    A: [[], [], [], []],
    B: [[['C5', 0, 2], ['A4', 2, 2]], [['G4', 0, 2], ['E5', 2, 2]], [['F5', 0, 2], ['D5', 2, 2]], [['D5', 0, 3], ['C5', 3, 1]]],
    form: ['intro', 'A', 'B', 'A', 'B', 'outro'], lead: 'glock', comp: 'arp', drums: 'none' },
};

function render(name, T) {
  seed = 11 + name.length;
  const beat = 60 / T.bpm, bar = beat * 4, sections = T.form.map((s) => ({ s, bars: s === 'intro' || s === 'outro' ? 4 : 8 }));
  const totalBars = sections.reduce((a, x) => a + x.bars, 0), len = Math.round((totalBars * bar + 3) * SR);
  const dry = makeBus(len), wetBus = makeBus(len);
  let b0 = 0;
  for (const { s, bars } of sections) {
    for (let bi = 0; bi < bars; bi++) {
      const t0 = (b0 + bi) * bar, [root, tones] = T.chords[bi % 4], last = s === 'outro' && bi === bars - 1, full = s !== 'intro' && s !== 'outro', high = s.startsWith('B') || s === 'A2';
      const fr = midi(NOTE(root)), ftones = tones.map((x) => midi(NOTE(x)));
      // 배경 화음
      add(wetBus, t0, pad(ftones.map((f) => f / 2), last ? bar * 2 : bar + 0.25), last ? 0.07 : s === 'intro' ? 0.09 : 0.06, 0);
      // 반주
      if (T.comp === 'strum') {
        const pat = [[0, 'd'], [1, 'd'], [1.5, 'u'], [2.5, 'u'], [3, 'd'], [3.5, 'u']];
        for (const [bt, dir] of pat) { if (s === 'intro' && bt % 1) continue; const order = dir === 'd' ? ftones : [...ftones].reverse(); order.forEach((f, k) => add(wetBus, t0 + bt * beat + k * 0.012, pluck(f, 1.2, dir === 'd' ? 0.6 : 0.4), dir === 'd' ? 0.16 : 0.11, -0.25)); if (last) break; }
      } else if (T.comp === 'keys') {
        for (const bt of last ? [0] : [0, 2]) ftones.forEach((f, k) => add(wetBus, t0 + bt * beat + k * 0.008, epiano(f, last ? bar * 1.5 : beat * 2.2, 0.8), 0.11, (k - 1) * 0.3));
        if (full) for (const [bt, k] of [[0.5, 1], [1.5, 2], [2.5, 0], [3.5, 2]]) add(wetBus, t0 + bt * beat, pluck(ftones[k] * 2, 0.9, 0.3), 0.06, 0.35);
      } else {
        const seq = [0, 1, 2, 1, 0, 1, 2, 1].map((k, j) => ftones[k] * (j >= 4 && j % 2 === 0 ? 2 : 1));
        seq.forEach((f, j) => { if (last && j > 0) return; add(wetBus, t0 + j * beat * 0.5, epiano(f, last ? bar * 1.5 : beat * 1.6, 0.7), 0.13, j % 2 ? 0.25 : -0.25); });
      }
      // 베이스
      if (s !== 'intro' || T.drums === 'none') { if (last) add(dry, t0, bass(fr, bar * 1.5), 0.32); else if (T.drums === 'full') { add(dry, t0, bass(fr, beat * 1.4), 0.32); add(dry, t0 + 2 * beat, bass(fr, beat * 1.2), 0.3); add(dry, t0 + 3.5 * beat, bass(fr * 1.5, beat * 0.45), 0.2); } else add(dry, t0, bass(fr, beat * (T.drums === 'none' ? 3.8 : 2.6)), T.drums === 'none' ? 0.26 : 0.3); }
      // 북·손뼉
      if (full && !last && T.drums !== 'none') {
        if (T.drums === 'full') { for (const bt of [0, 2]) add(dry, t0 + bt * beat, kick(), 0.5); for (const bt of [1, 3]) add(wetBus, t0 + bt * beat, clap(), 0.12, 0.05); for (let j = 0; j < 8; j++) add(dry, t0 + j * beat * 0.5, shaker(), j % 2 ? 0.05 : 0.08, 0.45); }
        else { add(dry, t0, kick(), 0.32); add(wetBus, t0 + 2 * beat, snap(), 0.07, -0.1); for (let j = 1; j < 8; j += 2) add(dry, t0 + j * beat * 0.5, shaker(), 0.035, 0.4); }
      }
      if (s === 'outro' && bi === 0 && T.drums === 'full') add(dry, t0, kick(), 0.4);
      // 선율
      const phrase = (s.startsWith('B') ? T.B : s === 'A' || s === 'A2' ? T.A : [])[bi % 4] ?? [];
      if (!last) for (const [n, bt, lb] of phrase) {
        const f = midi(NOTE(n)), at = t0 + bt * beat;
        if (T.lead === 'marimba') { add(wetBus, at, marimba(f, lb * beat), 0.24, 0.15); if (high) add(wetBus, at, glock(f * 2, lb * beat), 0.045, -0.3); }
        else add(wetBus, at, glock(f, lb * beat), T.drums === 'none' ? 0.1 : 0.12, 0.1);
      } else add(wetBus, t0, (T.lead === 'marimba' ? glock : glock)(midi(NOTE(tones[2])) * 2, 2), 0.06, 0);
    }
    b0 += bars;
  }
  const rv = reverb(wetBus, T.drums === 'none' ? 0.32 : 0.22), L = new Float32Array(len), R = new Float32Array(len);
  let peak = 0; for (let i = 0; i < len; i++) { L[i] = Math.tanh((dry.L[i] + rv.L[i]) * 1.1); R[i] = Math.tanh((dry.R[i] + rv.R[i]) * 1.1); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const g = 0.89 / (peak || 1), cut = Math.round((totalBars * bar + 2.5) * SR), fade = Math.round(2 * SR);
  const pcm = Buffer.alloc(cut * 4);
  for (let i = 0; i < cut; i++) { const fo = i > cut - fade ? (cut - i) / fade : 1; pcm.writeInt16LE(Math.round(L[i] * g * fo * 32767), i * 4); pcm.writeInt16LE(Math.round(R[i] * g * fo * 32767), i * 4 + 2); }
  const hdr = Buffer.alloc(44); hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  return { wav: Buffer.concat([hdr, pcm]), seconds: cut / SR };
}

const outDir = path.join(ROOT, 'public', 'music'); fs.mkdirSync(outDir, { recursive: true });
const meta = {};
for (const [name, T] of Object.entries(TRACKS)) {
  const { wav, seconds } = render(name, T), tmp = path.join(os.tmpdir(), `music-${name}.wav`), mp3 = path.join(outDir, `${name}.mp3`);
  fs.writeFileSync(tmp, wav);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', mp3]);
  fs.rmSync(tmp);
  meta[name] = { file: `music/${name}.mp3`, bpm: T.bpm, seconds: +seconds.toFixed(1), title: T.title };
  console.log(`${name}: ${seconds.toFixed(1)}초, ${T.bpm} BPM → ${path.relative(ROOT, mp3)} (${(fs.statSync(mp3).size / 1e6).toFixed(2)}MB)`);
}
fs.writeFileSync(path.join(outDir, 'tracks.json'), JSON.stringify(meta, null, 1));
fs.writeFileSync(path.join(outDir, 'LICENSE.txt'), '이 폴더의 음원(lively.mp3, warm.mp3, calm.mp3)은 scripts/make-music.mjs 가 코드로 작곡·합성한 것이다.\n외부 음원·샘플·녹음을 쓰지 않았으며, 이 프로젝트로 만든 영상(상업적 이용 포함)에 자유롭게 쓸 수 있다.\n');
