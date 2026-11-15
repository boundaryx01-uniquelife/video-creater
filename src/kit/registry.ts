import type { StyleFamily } from './schema.ts';
import { family as scrapbook } from './families/scrapbook/index';
import { family as editorial } from './families/editorial/index';
import { family as documentary } from './families/documentary/index';
import { family as lyric } from './families/lyric/index';

/** 스타일 계열 목록. 새 계열은 families/<id>/index.tsx 를 만들고 여기에 한 줄 추가한다 */
export const FAMILIES: Record<string, StyleFamily> = { scrapbook, editorial, documentary, lyric };
export const familyOf = (id: string) => FAMILIES[id] ?? FAMILIES.scrapbook;
