import type { PhotoSpec } from '../analysis/videoData.ts';
import type { AudioSpec } from '../audio/spec.ts';

/** 행사 영상 입력 데이터. 폼/CSV/JSON으로 받는 것을 가정한다(사진 메타데이터에는 없는 정보). */
export type AgendaItem = { start: string; end: string; title: string; speaker: string; room: string; highlight?: boolean };
export type EventSession = { agenda: number; title: string; speaker: string; role: string; room: string; attendees: number; style: 'fast' | 'steady' | 'slow'; photos: PhotoSpec[] };
export type EventProps = {
  info: { kicker: string; name: string; tagline: string; date: string; dateLabel: string; venue: string; attendees: string; bug: string };
  colors: { accent: string; ink: string; light: string; onAccent: string };
  introPhoto: string; agenda: AgendaItem[]; sessions: EventSession[];
  quote: { text: string; speaker: string; role: string; photo: string };
  stats: { n: number; l: string }[]; statsPhoto: string;
  outro: { title: string; rows: { k: string; v: string }[] };
  audio?: AudioSpec;
};
