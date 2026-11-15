import type { StyleFamily } from '../../schema.ts';
import { stubParts } from '../stub';

/** 계열: 다큐 — 작업 전 자리표시. 이 폴더 안의 파일만 고친다 */
export const family: StyleFamily = {
  id: 'documentary', label: '다큐', note: '',
  palette: { bg: '#f5f1e8', surface: '#ffffff', ink: '#1f1d24', muted: '#6b6670', accents: ['#1d2b3a', '#3d7bd9', '#2f9e74'], onAccent: '#ffffff' },
  fonts: { display: "'Pretendard','Noto Sans KR',sans-serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['slide'],
  parts: stubParts('#1d2b3a'),
};
