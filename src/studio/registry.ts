import type React from 'react';
import { EventVideo } from '../events/EventVideo';
import { eventSample } from '../events/sample.ts';
import { planEvent } from '../events/plan.ts';
import { TravelVideo } from '../travel/TravelVideo';
import { planTravel } from '../travel/plan.ts';
import { legsOf } from '../travel/geo.ts';
import travelBuilt from '../travel/sample-built.json';
import { ElemVideo } from '../elem/ElemVideo';
import { elemSample } from '../elem/sample.ts';
import { planElem } from '../elem/types.ts';
import { ModeVideo } from '../modes/ModeVideo';
import { planMode } from '../modes/video.ts';
import { siteSample, storeSample, productSample, schoolSample, clubSample, gradSample } from '../modes/samples.ts';

export type SceneMark = { label: string; from: number };
export type StudioMode = {
  id: string; name: string; desc: string; comp: string; Component: React.FC<any>; sample: () => any;
  plan: (p: any) => { total: number; scenes: SceneMark[] };
  sections: string[];            // 폼에 보여줄 최상위 항목 순서
  bulk: 'agenda' | 'even' | 'gaps' | 'none'; // 사진 일괄 넣기 방식
  chip: 'time' | 'date' | 'none';   // 사진 자막 칩에 넣을 촬영 정보
  note?: string;
};
const KO: Record<string, string> = { intro: '인트로', open: '오프닝', card: '카드', flow: '사진', beat: '데이터', close: '마무리', outro: '아웃트로', agenda: '일정', quote: '인용문', stats: '숫자', leg: '이동' };
const marks = (scenes: { type: string; from: number; i?: number }[]) => scenes.map((s) => ({ label: KO[s.type] + (s.i != null && !['open', 'close'].includes(s.type) ? ` ${s.i + 1}` : ''), from: s.from }));
const modeVideo = (id: string, name: string, desc: string, sample: () => any, chip: StudioMode['chip'] = 'none'): StudioMode => ({ id, name, desc, comp: `${id}-video-sample`, Component: ModeVideo, sample, plan: (p) => { const r = planMode(p); return { total: r.total, scenes: marks(r.scenes) }; }, sections: ['intro', 'introPhoto', 'colors', 'bug', 'opening', 'chapters', 'closing', 'outro'], bulk: 'even', chip });

const ELEM_KO: Record<string, string> = { intro: '인트로', title: '활동', page: '사진', quote: '한마디', stats: '기록', outro: '마무리' };
export const STUDIO_MODES: StudioMode[] = [
  { id: 'elem', name: '초등 활동 영상', desc: '현장체험학습·운동회·학예회 등 학교 활동 기록 (학부모 공유용)', comp: 'elem-video-sample', Component: ElemVideo, sample: elemSample, plan: (p) => { const r = planElem(p); return { total: r.total, scenes: r.scenes.filter((s) => s.type !== 'page' || s.photos[0] === 0).map((s) => ({ label: ELEM_KO[s.type] + ('ci' in s ? ` ${s.ci + 1}` : ''), from: s.from })) }; }, sections: ['school', 'klass', 'kicker', 'title', 'day', 'place', 'introPhotos', 'chapters', 'stats', 'outro'], bulk: 'gaps', chip: 'time' },
  { id: 'event', name: '행사 · 컨퍼런스', desc: '일정표, 연사 자막, 인용문, 숫자 요약', comp: 'event-video-sample', Component: EventVideo, sample: eventSample, plan: (p) => { const r = planEvent(p); return { total: r.total, scenes: marks(r.scenes) }; }, sections: ['info', 'introPhoto', 'colors', 'agenda', 'sessions', 'quote', 'stats', 'statsPhoto', 'outro'], bulk: 'agenda', chip: 'time' },
  { id: 'travel', name: '여행 · 출장', desc: '지구본, 지형 지도, 이동 경로', comp: 'travel-video-sample', Component: TravelVideo, sample: () => travelBuilt, plan: (p) => { const r = planTravel(p, legsOf(p)); return { total: r.total, scenes: marks(r.scenes) }; }, sections: ['info', 'colors', 'stops'], bulk: 'none', chip: 'time', note: '지금 보이는 것은 미리 계산된 샘플입니다. 아래 \'사진으로 여행 만들기\'에 GPS·촬영 시각이 있는 사진을 올리면 정차지·경로·지형을 자동으로 만듭니다. 샘플 상태에서는 문구와 사진만 바꿀 수 있습니다.' },
  modeVideo('site', '현장 · 시공', '공정률, Before/After, 점검 결과', siteSample),
  modeVideo('store', '매장 · 공간', '공간별 면적·소재, 오시는 길', storeSample),
  modeVideo('product', '상품 소개', '스펙, 컬러, 가격, 사전예약', productSample),
  modeVideo('school', '학교 홍보', '학교 숫자, 재학생 한마디, 입학 일정', schoolSample),
  modeVideo('club', '동아리 홍보', '활동 숫자, 1년 일정, 모집 안내', clubSample),
  modeVideo('grad', '졸업 영상', '3년 타임라인, 학년 챕터, 명단', gradSample, 'date'),
];
