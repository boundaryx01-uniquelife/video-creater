import React from 'react';
import { Audio, useVideoConfig } from 'remotion';
import { resolveSrc } from '../lib/common';
import { audioVolume, type AudioSpec } from './spec.ts';

/** 영상 최상위에 한 번 두는 배경 음악. 미리보기(Player)와 MP4 렌더 모두 같은 코드로 재생되고, 끝에서 자동으로 페이드 아웃한다 */
export const BgAudio: React.FC<{ audio?: AudioSpec }> = ({ audio }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const vol = React.useCallback((f: number) => (audio ? audioVolume(audio, f, durationInFrames, fps) : 0), [audio, durationInFrames, fps]);
  if (!audio || !audio.src) return null;
  // loopVolumeCurveBehavior=extend: 반복해도 페이드 곡선은 영상 전체 시간축 기준
  return <Audio src={resolveSrc(audio.src)} volume={vol} startFrom={Math.max(0, Math.round(audio.startFromSec * fps))} loop={audio.loop} loopVolumeCurveBehavior="extend" />;
};
