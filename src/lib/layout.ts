import { useVideoConfig } from 'remotion';

/** 화면 비율에 따라 달라지는 값을 한곳에서 돌려준다. 가로(16:9)는 기존 값 그대로, 세로(9:16)는 portrait=true */
export type Layout = { W: number; H: number; portrait: boolean; PAD: number };

export const isPortrait = (W: number, H: number) => H > W;

export function useLayout(): Layout {
  const { width: W, height: H } = useVideoConfig();
  const portrait = isPortrait(W, H);
  return { W, H, portrait, PAD: Math.round(W * (portrait ? 0.07 : 0.0625)) };
}

/** 세로 화면용 줄바꿈: 이미 줄이 나뉜 제목에서 maxChars보다 긴 줄을 공백 기준으로 균형 있게 둘로 나눈다(공백이 없으면 그대로) */
export function wrapTitle(lines: string[], maxChars: number): string[] {
  const out: string[] = [];
  for (const l of lines) {
    const chars = Array.from(l);
    if (chars.length <= maxChars || !l.includes(' ')) { out.push(l); continue; }
    const mid = chars.length / 2; let best = -1, bd = Infinity;
    chars.forEach((c, i) => { if (c === ' ' && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); best = i; } });
    out.push(chars.slice(0, best).join(''), chars.slice(best + 1).join(''));
  }
  return out;
}

/** 컴포지션 크기: 가로(기본 id)와 세로(`-vertical`). Root·스튜디오·렌더 서버가 같은 정의를 쓴다 */
export const SIZES = [
  { suffix: '', width: 1920, height: 1080, label: '16:9' },
  { suffix: '-vertical', width: 1080, height: 1920, label: '9:16' },
] as const;
export type Aspect = '16:9' | '9:16';
