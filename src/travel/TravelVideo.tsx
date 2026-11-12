import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type { TravelProps } from './types.ts';
import { legsOf } from './geo.ts';
import { useTravelAssets } from './TravelMap';
import { planTravel, stopCardSpec, stopChapter, T_CARD } from './plan.ts';
import { TravelIntro, TravelLeg, TravelOutro } from './TravelScenes';
import { ModeCard } from '../modes/ModeScenes';
import { FlowScene } from '../intros/FlowScene';

/** 여행 영상: 지구본 인트로 → (이동 구간 지도 → 도착 카드 → 사진 플로우) × N → 요약 아웃트로 */
export const TravelVideo: React.FC<TravelProps> = (p) => {
  const legs = React.useMemo(() => legsOf(p), [p]);
  const assets = useTravelAssets(p);
  const { scenes } = React.useMemo(() => planTravel(p, legs), [p, legs]);
  if (!assets) return <AbsoluteFill style={{ background: '#08161c' }} />;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {scenes.map((s, k) => {
        const i = s.i ?? 0;
        return (
          <Sequence key={k} from={s.from} durationInFrames={s.dur}>
            {s.type === 'intro' && <TravelIntro p={p} legs={legs} assets={assets} />}
            {s.type === 'leg' && <TravelLeg p={p} legs={legs} assets={assets} i={i} dur={s.dur} />}
            {s.type === 'card' && <ModeCard mode="journey" spec={stopCardSpec(p, legs, i)} photos={{ card: p.stops[legs[i].b].photos[0].src }} matchCut={p.stops[legs[i].b].photos[0].aspect >= 1.2} dur={T_CARD} />}
            {s.type === 'flow' && <FlowScene ch={stopChapter(p, legs, i)} wipe="#08161c" bug="TRAVEL LOG" />}
            {s.type === 'outro' && <TravelOutro p={p} legs={legs} assets={assets} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
