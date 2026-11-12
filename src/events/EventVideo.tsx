import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import type { EventProps } from './types.ts';
import { cardSpec, introSpec, outroSpec, planEvent, sessionChapter, E_AGENDA } from './plan.ts';
import { ModeCard, ModeIntro, ModeOutro } from '../modes/ModeScenes';
import { FlowScene } from '../intros/FlowScene';
import { AgendaScene, QuoteScene, StatsScene } from './EventScenes';
import { easeInOut, prog } from '../lib/common';
import { BgAudio } from '../audio/BgAudio';

const Wipe: React.FC<{ color: string; dur: number }> = ({ color, dur }) => { const f = useCurrentFrame(); return <div style={{ position: 'absolute', inset: 0, background: color, transform: `translateX(${(prog(f, dur - 10, 10, easeInOut) - 1) * 100}%)` }} />; };

/** 행사 영상: 인트로 → 일정 → (하이라이트 카드 → 사진 플로우) × N → 인용문 → 숫자 요약 → 아웃트로 */
export const EventVideo: React.FC<EventProps> = (p) => {
  const { scenes } = React.useMemo(() => planEvent(p), [p]);
  const last = p.sessions.length - 1;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <BgAudio audio={p.audio} />
      {scenes.map((s, k) => {
        const i = s.i ?? 0, sess = p.sessions[i];
        return (
          <Sequence key={k} from={s.from} durationInFrames={s.dur}>
            {s.type === 'intro' && <><ModeIntro mode="event" spec={introSpec(p)} photos={{ intro: p.introPhoto }} /><Wipe color={p.colors.light} dur={s.dur} /></>}
            {s.type === 'agenda' && <AgendaScene p={p} />}
            {s.type === 'card' && <ModeCard mode="event" spec={cardSpec(p, sess, i)} photos={{ card: sess.photos[0].src }} matchCut={sess.photos[0].aspect >= 1.2} dur={s.dur} />}
            {s.type === 'flow' && <FlowScene ch={sessionChapter(p, sess, i, s.from)} wipe={i === last ? p.colors.ink : p.colors.light} bug={p.info.bug} />}
            {s.type === 'quote' && <QuoteScene p={p} />}
            {s.type === 'stats' && <StatsScene p={p} />}
            {s.type === 'outro' && <ModeOutro mode="event" spec={outroSpec(p)} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
export { E_AGENDA };
