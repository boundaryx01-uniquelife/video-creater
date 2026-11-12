import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { flowChapter, planVideo, VideoProps } from '../analysis/videoData.ts';
import { BgAudio } from '../audio/BgAudio';
import { DataIntro } from './DataIntro';
import { ChapterCard } from './ChapterCard';
import { FlowScene } from './FlowScene';
import { Outro } from './Outro';

/** 전체 영상: 인트로 → (챕터 카드 → 사진 플로우) × N → 아웃트로 */
export const FullVideo: React.FC<VideoProps> = (props) => {
  const { scenes } = React.useMemo(() => planVideo(props), [props]);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <BgAudio audio={props.audio} />
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          {s.type === 'intro' && <DataIntro {...props.intro} />}
          {s.type === 'card' && <ChapterCard ch={props.chapters[s.ch!]} intro={props.intro} />}
          {s.type === 'flow' && <FlowScene ch={flowChapter(props, s.ch!, s.from)} />}
          {s.type === 'outro' && <Outro o={props.outro} accent={props.intro.accent} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
