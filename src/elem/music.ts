import type { AudioSpec } from '../audio/spec.ts';

/** 기본 배경 음악 3곡: scripts/make-music.mjs 가 직접 작곡·합성한 음원(public/music). 모두 0초에 첫 박이 온다 */
export const BUILTIN_MUSIC = {
  lively: { file: 'music/lively.mp3', bpm: 112, label: '밝게(마림바·우쿨렐레)' },
  warm: { file: 'music/warm.mp3', bpm: 92, label: '따뜻하게(전자 피아노·철금)' },
  calm: { file: 'music/calm.mp3', bpm: 76, label: '차분하게(피아노·패드)' },
} as const;
export type MusicName = keyof typeof BUILTIN_MUSIC;
/** 기본 음악을 영상에 붙이는 설정: 장면 전환을 박자에 맞춘다 */
export const builtinAudio = (name: MusicName): AudioSpec => ({ src: BUILTIN_MUSIC[name].file, volume: 0.7, fadeInSec: 0.3, fadeOutSec: 2.5, startFromSec: 0, loop: true, bpm: BUILTIN_MUSIC[name].bpm, beatOffsetSec: 0, syncCuts: true });
