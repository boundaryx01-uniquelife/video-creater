import type { Theme } from './themes';

// 시드 기반 난수 (결정적 렌더링 보장)
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

function paint(seed: number, theme: Theme, w: number, h: number): string {
  const rnd = mulberry32(seed * 9973 + 17);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const shift = (rnd() - 0.5) * 0.5;
  const sky = g.createLinearGradient(0, 0, 0, h * 0.8);
  sky.addColorStop(0, mix(theme.sky[0], theme.sky[1], Math.max(0, shift)));
  sky.addColorStop(0.55, theme.sky[1]);
  sky.addColorStop(1, mix(theme.sky[2], theme.sky[1], Math.max(0, -shift)));
  g.fillStyle = sky; g.fillRect(0, 0, w, h);

  // 해/달 + 글로우
  const sx = w * (0.2 + rnd() * 0.6), sy = h * (0.22 + rnd() * 0.3), sr = h * (0.05 + rnd() * 0.05);
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 9);
  glow.addColorStop(0, 'rgba(255,240,210,0.85)'); glow.addColorStop(0.15, 'rgba(255,220,170,0.35)'); glow.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = glow; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff7e4'; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();

  // 구름
  for (let i = 0; i < 6; i++) {
    const cx = rnd() * w, cy = h * (0.1 + rnd() * 0.35), cw = w * (0.15 + rnd() * 0.25);
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, cw);
    cg.addColorStop(0, 'rgba(255,255,255,0.28)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.translate(cx, cy); g.scale(1, 0.22); g.translate(-cx, -cy);
    g.fillStyle = cg; g.fillRect(cx - cw, cy - cw, cw * 2, cw * 2); g.restore();
  }

  // 산/언덕 레이어
  const layers = 4 + Math.floor(rnd() * 2);
  for (let l = 0; l < layers; l++) {
    const t = l / (layers - 1);
    const base = h * (0.5 + t * 0.4);
    const amp = h * (0.16 - t * 0.09);
    const f1 = 1 + rnd() * 2.2, f2 = 3 + rnd() * 4, p1 = rnd() * 6, p2 = rnd() * 6;
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = base - amp * (0.6 * Math.sin((x / w) * Math.PI * f1 + p1) + 0.4 * Math.sin((x / w) * Math.PI * f2 + p2));
      g.lineTo(x, y);
    }
    g.lineTo(w, h); g.closePath();
    g.fillStyle = mix(theme.sky[1], theme.ground, 0.35 + t * 0.65);
    g.fill();
  }

  // 전경 실루엣(나무/침엽수)
  g.fillStyle = mix(theme.ground, '#000000', 0.45);
  for (let i = 0; i < 9; i++) {
    const tx = rnd() * w, th = h * (0.08 + rnd() * 0.16), ty = h * (0.93 + rnd() * 0.06);
    g.beginPath(); g.moveTo(tx, ty - th); g.lineTo(tx - th * 0.22, ty); g.lineTo(tx + th * 0.22, ty); g.closePath(); g.fill();
  }

  // 필름 그레인 + 비네트
  const img = g.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, w * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.82);
}

const cache = new Map<string, string[]>();
export function samplePhotos(theme: Theme, count = 9): string[] {
  const key = `${theme.id}:${count}`;
  if (!cache.has(key)) cache.set(key, Array.from({ length: count }, (_, i) => paint(i + 1, theme, 960, 640)));
  return cache.get(key)!;
}
