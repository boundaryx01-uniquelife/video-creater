import type { StyleFamily } from '../../schema.ts';
import { stubParts } from '../stub';

/** 계열: 스크랩북 — 작업 전 자리표시. 이 폴더 안의 파일만 고친다 */
export const family: StyleFamily = {
  id: 'scrapbook', label: '스크랩북', note: '',
  palette: { bg: '#f5f1e8', surface: '#ffffff', ink: '#1f1d24', muted: '#6b6670', accents: ['#c96a4b', '#3d7bd9', '#2f9e74'], onAccent: '#ffffff' },
  fonts: { display: "'Pretendard','Noto Sans KR',sans-serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['slide'],
  parts: stubParts('#c96a4b'),
};
