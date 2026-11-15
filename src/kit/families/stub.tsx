import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { PartId, PartProps, StyleFamily } from '../schema.ts';
import { PART_IDS, PART_SPEC } from '../schema.ts';

/** 아직 만들지 않은 부품 자리표시(계열 작업 중에만 쓰인다) */
export const stubParts = (fill: string): StyleFamily['parts'] => Object.fromEntries(PART_IDS.map((id) => [id, ((_: PartProps) => <AbsoluteFill style={{ background: fill, color: '#fff', fontSize: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Pretendard' }}>{PART_SPEC[id as PartId].label} (준비 중)</AbsoluteFill>) as React.FC<any>])) as StyleFamily['parts'];
