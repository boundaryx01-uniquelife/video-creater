import type { StyleFamily } from '../../schema.ts';
import { stubParts } from '../stub';

/** 계열: 에디토리얼 — 작업 전 자리표시. 이 폴더 안의 파일만 고친다 */
export const family: StyleFamily = {
  id: 'editorial', label: '에디토리얼', note: '',
  palette: { bg: '#f5f1e8', surface: '#ffffff', ink: '#1f1d24', muted: '#6b6670', accents: ['#222', '#3d7bd9', '#2f9e74'], onAccent: '#ffffff' },
  fonts: { display: "'Pretendard','Noto Sans KR',sans-serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['slide'],
  parts: stubParts('#222'),
};
