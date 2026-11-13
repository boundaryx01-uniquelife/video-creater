import '../lib/fonts';
import React from 'react';
import { Composition } from 'remotion';
import { INTROS } from '../intros';
import { themeById } from '../lib/themes';
import type { IntroProps } from '../lib/common';
import { DataIntro } from '../intros/DataIntro';
import { demoDataIntro } from '../lib/demoData';
import { FullVideo } from '../intros/FullVideo';
import { demoVideoProps } from '../lib/demoVideo';
import { planVideo } from '../analysis/videoData.ts';
import { ModeIntro, ModeCard, ModeBeat, ModeOutro } from '../modes/ModeScenes';
import { ChapterCard } from '../intros/ChapterCard';
import { FlowScene } from '../intros/FlowScene';
import { Outro } from '../intros/Outro';
import { EventVideo } from '../events/EventVideo';
import { eventSample } from '../events/sample.ts';
import { planEvent } from '../events/plan.ts';
import { TravelVideo } from '../travel/TravelVideo';
import { travelSample } from '../travel/sample.ts';
import { planTravel } from '../travel/plan.ts';
import { legsOf } from '../travel/geo.ts';
import { ModeVideo } from '../modes/ModeVideo';
import { planMode } from '../modes/video.ts';
import { ElemVideo } from '../elem/ElemVideo';
import { elemSample } from '../elem/sample.ts';
import { planElem } from '../elem/types.ts';
import { siteSample, storeSample, productSample, schoolSample, clubSample, gradSample } from '../modes/samples.ts';
import { SIZES } from '../lib/layout';

// 결산(Recap) 모드: 기존 데이터 인트로/챕터 카드/아웃트로를 블러 샘플로 표시
const RECAP = demoVideoProps((portrait, i) => `media/recap_${portrait ? 'P' : 'L'}${(i % (portrait ? 4 : 6)) + 1}.jpg`);
const RecapCard: React.FC = () => <ChapterCard ch={RECAP.chapters[1]} intro={RECAP.intro} />;
const RecapBeat: React.FC = () => <FlowScene ch={RECAP.chapters[0]} />;
const RecapOutro: React.FC = () => <Outro o={RECAP.outro} accent={RECAP.intro.accent} />;

export const DEFAULT_PROPS: IntroProps = {
  title: 'Summer 2025', subtitle: 'Jeju Island Journey', dateRange: '2025.07.12 — 07.19', location: 'JEJU, KOREA', photos: [], theme: themeById('summer'),
};

/** 같은 컴포넌트를 가로(기본 id)와 세로(`-vertical`) 두 크기로 등록한다. 세로는 컴포넌트가 useLayout()으로 배치를 바꾼다 */
const Both: React.FC<{ id: string; component: React.FC<any>; durationInFrames: number; defaultProps?: Record<string, unknown>; calculateMetadata?: (o: { props: any }) => { durationInFrames: number } }> = ({ id, component, durationInFrames, defaultProps, calculateMetadata }) => (
  <>
    {SIZES.map((z) => (
      <Composition key={z.suffix} id={id + z.suffix} component={component} durationInFrames={durationInFrames} fps={30} width={z.width} height={z.height} defaultProps={defaultProps as any} calculateMetadata={calculateMetadata as any} />
    ))}
  </>
);

export const Root: React.FC = () => (
  <>
    {INTROS.map((i) => (
      <Composition key={i.id} id={`intro-${i.id}`} component={i.Component} durationInFrames={150} fps={30} width={1920} height={1080} defaultProps={DEFAULT_PROPS} />
    ))}
    <Both id="data-intro-chrono" component={DataIntro} durationInFrames={150} defaultProps={demoDataIntro() as any} />
    <Both id="full-video-sample" component={FullVideo} durationInFrames={1} defaultProps={demoVideoProps() as any} calculateMetadata={({ props }) => ({ durationInFrames: planVideo(props).total })} />
    {([['mode-intro', ModeIntro, 90], ['mode-card', ModeCard, 84], ['mode-beat', ModeBeat, 90], ['mode-outro', ModeOutro, 100]] as const).map(([id, C, d]) => (
      <Both key={id} id={id} component={C as React.FC<any>} durationInFrames={d} defaultProps={{ mode: 'event' }} />
    ))}
    <Both id="event-video-sample" component={EventVideo} durationInFrames={1} defaultProps={eventSample() as any} calculateMetadata={({ props }) => ({ durationInFrames: planEvent(props).total })} />
    <Both id="travel-video-sample" component={TravelVideo} durationInFrames={1} defaultProps={travelSample() as any} calculateMetadata={({ props }) => ({ durationInFrames: planTravel(props, legsOf(props)).total })} />
    {([['site', siteSample], ['store', storeSample], ['product', productSample], ['school', schoolSample], ['club', clubSample], ['grad', gradSample]] as const).map(([id, f]) => (
      <Both key={id} id={`${id}-video-sample`} component={ModeVideo} durationInFrames={1} defaultProps={f() as any} calculateMetadata={({ props }) => ({ durationInFrames: planMode(props).total })} />
    ))}
    <Both id="elem-video-sample" component={ElemVideo} durationInFrames={1} defaultProps={elemSample() as any} calculateMetadata={({ props }) => ({ durationInFrames: planElem(props).total })} />
    <Both id="recap-intro" component={DataIntro} durationInFrames={150} defaultProps={RECAP.intro as any} />
    <Both id="recap-card" component={RecapCard} durationInFrames={84} />
    <Both id="recap-beat" component={RecapBeat} durationInFrames={120} />
    <Both id="recap-outro" component={RecapOutro} durationInFrames={150} />
  </>
);
