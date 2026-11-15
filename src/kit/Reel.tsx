import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { BgAudio } from '../audio/BgAudio';
import type { AudioSpec } from '../audio/spec.ts';
import { KitCtx, type KitStyle } from './context';
import { Transition } from './motion';
import { familyOf } from './registry';
import { PART_SPEC, type KPhoto, type Palette, type PartData, type PartId, type TransitionKind } from './schema.ts';

/** 연출 설계도: AI(또는 사람)가 쓰는 영상 한 편의 설계. 부품 순서·데이터·사진·전환·스타일만 담는다 */
export type ReelScene<K extends PartId = PartId> = { part: K; data: PartData[K]; photos?: number[]; dur?: number; transition?: TransitionKind; section?: number };
export type Reel = {
  family: string;                 // 스타일 계열 id
  palette?: Partial<Palette>;     // 사진에서 뽑은 색 등으로 덮어쓰기
  brand?: string;                 // 화면 구석 표시
  photos: KPhoto[];               // 사진 목록(장면은 번호로 참조)
  scenes: ReelScene[];
  pace?: number;                  // 길이 배율 0.7–1.5
  audio?: AudioSpec;
};

export function planReel(r: Reel) {
  const k = Math.max(0.7, Math.min(1.5, Number(r.pace) || 1)); let t = 0, sec = -1;
  const scenes = r.scenes.map((s, i) => {
    if (s.part === 'section.title') sec = typeof s.section === 'number' ? s.section : sec + 1;
    const n = s.photos?.length ?? 0, dur = Math.max(24, Math.round((s.dur ?? PART_SPEC[s.part].dur(n)) * k)), out = { ...s, from: t, dur, index: i, section: s.part.startsWith('opener') ? -1 : (s.section ?? Math.max(0, sec)) };
    t += dur; return out;
  });
  return { scenes, total: Math.max(1, t), sections: Math.max(1, sec + 1) };
}

export const ReelVideo: React.FC<Reel> = (r) => {
  const fam = familyOf(r.family), palette: Palette = { ...fam.palette, ...(r.palette ?? {}) } as Palette, style: KitStyle = { family: fam, palette, fonts: fam.fonts };
  const { scenes, sections } = React.useMemo(() => planReel(r), [r]);
  return (
    <KitCtx.Provider value={style}><AbsoluteFill style={{ background: palette.bg }}>
      <BgAudio audio={r.audio} />
      {scenes.map((s) => {
        const Part = fam.parts[s.part] as React.FC<any>, photos = (s.photos ?? []).map((i) => r.photos[i]).filter(Boolean), kind = s.transition ?? fam.transitions[s.index % fam.transitions.length];
        const a = palette.accents[Math.max(0, s.section) % palette.accents.length];
        return (
          <Sequence key={s.index} from={s.from} durationInFrames={s.dur}>
            <Part data={s.data} photos={photos} dur={s.dur} scene={{ index: s.index, section: s.section, sections, brand: r.brand }} />
            {s.index > 0 && <Transition kind={kind} a={a} b={palette.bg} />}
          </Sequence>
        );
      })}
    </AbsoluteFill></KitCtx.Provider>
  );
};

/** 부품 하나만 보여 주는 구성(갤러리·검수용) */
export const PartPreview: React.FC<{ family: string; part: PartId; data: any; photos: KPhoto[]; dur: number; section?: number }> = ({ family, part, data, photos, dur, section = 0 }) => {
  const fam = familyOf(family), style: KitStyle = { family: fam, palette: fam.palette, fonts: fam.fonts }, Part = fam.parts[part] as React.FC<any>;
  return <KitCtx.Provider value={style}><AbsoluteFill style={{ background: fam.palette.bg }}><Part data={data} photos={photos} dur={dur} scene={{ index: 1, section, sections: 3, brand: '샘플 브랜드' }} /></AbsoluteFill></KitCtx.Provider>;
};
