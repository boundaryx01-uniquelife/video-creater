// 배경 음악 설정과 박자 격자 계산(순수 함수). React/Remotion에 의존하지 않아 계획(plan) 단계에서 그대로 쓸 수 있다.

/** 영상 props에 붙는 선택 필드. 없으면 영상은 이전과 100% 같다 */
export type AudioSpec = {
  src: string;            // '/uploads/…' 또는 public 안의 상대 경로 또는 https 주소
  volume: number;         // 0~1
  fadeInSec: number;      // 시작 페이드 인
  fadeOutSec: number;     // 영상 끝에서 자동 페이드 아웃
  startFromSec: number;   // 음원의 이 지점부터 재생
  loop: boolean;          // 영상이 음원보다 길면 반복
  bpm?: number;           // 분당 박자 수
  beatOffsetSec?: number; // 음원 파일 안에서 어느 한 박이 있는 시각(초)
  syncCuts?: boolean;     // 사진 컷 길이를 박자 배수로 맞춤
};

export const DEFAULT_AUDIO = (src: string): AudioSpec => ({ src, volume: 0.8, fadeInSec: 1, fadeOutSec: 2, startFromSec: 0, loop: true, syncCuts: false });

/** 영상 시간축 위의 박자 격자: k번째 박 = phase + k × period (프레임, k는 임의의 정수) */
export type BeatGrid = { period: number; phase: number };

/** syncCuts이고 BPM이 40~240일 때만 격자를 만든다. 아니면 null(= 기존 동작) */
export function beatGrid(a: AudioSpec | undefined, fps: number): BeatGrid | null {
  if (!a || !a.syncCuts || !a.bpm || !(a.bpm >= 40 && a.bpm <= 240)) return null;
  const period = (fps * 60) / a.bpm;
  // 영상 0초에서 재생되는 음원 위치가 startFromSec이므로, 음원 속 박 위치에서 그만큼 뺀 것이 영상 속 박 위치다
  const phase = (((a.beatOffsetSec ?? 0) - (a.startFromSec ?? 0)) * fps) % period;
  return { period, phase };
}
export const beatFrame = (g: BeatGrid, k: number) => Math.round(g.phase + k * g.period);
/** 프레임 x에서 가장 가까운 박 번호 */
export const nearestBeat = (g: BeatGrid, x: number) => Math.round((x - g.phase) / g.period);
/** 프레임 x 이후(x 포함)의 첫 박 번호 */
export const nextBeat = (g: BeatGrid, x: number) => { let k = Math.ceil((x - g.phase) / g.period - 1e-9); while (beatFrame(g, k) < x) k++; return k; };

/** 페이드 인/아웃과 음량을 합친 프레임별 음량 */
export function audioVolume(a: AudioSpec, frame: number, total: number, fps: number): number {
  const v = Math.max(0, Math.min(1, Number.isFinite(a.volume) ? a.volume : 1));
  const fi = Math.max(0, a.fadeInSec) * fps, fo = Math.max(0, a.fadeOutSec) * fps;
  const up = fi > 0 ? Math.min(1, frame / fi) : 1, down = fo > 0 ? Math.min(1, Math.max(0, (total - 1 - frame) / fo)) : 1;
  return v * Math.max(0, up) * down;
}
