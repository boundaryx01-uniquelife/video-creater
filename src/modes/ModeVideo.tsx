import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { baseSpec, chapterSpec, planMode, ModeVideoProps } from './video.ts';
import { ModeBeat, ModeCard, ModeIntro, ModeOutro } from './ModeScenes';
import { FlowScene } from '../intros/FlowScene';
import { easeInOut, prog } from '../lib/common';
import { BgAudio } from '../audio/BgAudio';

const Wipe: React.FC<{ color: string; dur: number }> = ({ color, dur }) => { const f = useCurrentFrame(); return <div style={{ position: 'absolute', inset: 0, background: color, transform: `translateX(${(prog(f, dur - 10, 10, easeInOut) - 1) * 100}%)` }} />; };
const Reveal: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => { const f = useCurrentFrame(); return <AbsoluteFill style={{ background: bg }}><AbsoluteFill style={{ clipPath: `inset(${(1 - prog(f, 0, 14, easeInOut)) * 100}% 0 0 0)` }}>{children}</AbsoluteFill></AbsoluteFill>; };

/** 업무 모드 공통 영상(현장·매장·상품·교육): 모드별 차이는 색·카드 레일·데이터 장면(beat) 종류로 표현 */
export const ModeVideo: React.FC<ModeVideoProps> = (p) => {
  const { scenes } = React.useMemo(() => planMode(p), [p]); const base = baseSpec(p), n = p.chapters.length;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <BgAudio audio={p.audio} />
      {scenes.map((s, k) => {
        const i = s.i ?? 0, ch = p.chapters[i], hasClose = !!p.closing?.length, last = i === n - 1, next = last && !hasClose ? p.colors.ink : p.colors.light;
        const ex = s.type === 'open' ? p.opening![i] : s.type === 'close' ? p.closing![i] : null, exNext = s.type === 'close' && i === p.closing!.length - 1 ? p.colors.ink : p.colors.light;
        return (
          <Sequence key={k} from={s.from} durationInFrames={s.dur}>
            {s.type === 'intro' && <><ModeIntro mode={p.mode} spec={base} photos={{ intro: p.introPhoto }} /><Wipe color={p.colors.light} dur={s.dur} /></>}
            {s.type === 'card' && <ModeCard mode={p.mode} spec={{ ...base, card: ch.card }} photos={{ card: ch.photos[0].src }} matchCut={ch.photos[0].aspect >= 1.2} dur={s.dur} />}
            {s.type === 'flow' && <FlowScene ch={chapterSpec(p, i, s.from)} wipe={ch.beat ? p.colors.light : next} bug={p.bug} />}
            {s.type === 'beat' && <><Reveal bg={p.colors.light}><ModeBeat mode={p.mode} spec={{ ...base, beat: ch.beat! }} photos={ch.beatPhotos} /></Reveal><Wipe color={next} dur={s.dur} /></>}
            {ex && <><Reveal bg={p.colors.light}><ModeBeat mode={p.mode} spec={{ ...base, beat: ex.beat }} photos={ex.photos} dur={s.dur} /></Reveal><Wipe color={exNext} dur={s.dur} /></>}
            {s.type === 'outro' && <ModeOutro mode={p.mode} spec={base} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
