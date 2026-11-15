import React from 'react';
import type { Palette, StyleFamily } from './schema.ts';

/** 렌더 중인 스타일(계열 + 덮어쓴 색). 부품은 색과 글꼴을 반드시 여기서 가져온다(직접 색 값을 쓰지 않는다) */
export type KitStyle = { family: StyleFamily; palette: Palette; fonts: StyleFamily['fonts'] };
export const KitCtx = React.createContext<KitStyle | null>(null);
export const useKit = (): KitStyle => { const k = React.useContext(KitCtx); if (!k) throw new Error('KitCtx 없음'); return k; };
/** 구간 번호로 강조색 고르기 */
export const accentOf = (p: Palette, section: number) => p.accents[((section % p.accents.length) + p.accents.length) % p.accents.length];
