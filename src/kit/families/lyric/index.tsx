import type { StyleFamily } from '../../schema.ts';
import { stubParts } from '../stub';

/** 계열: 감성 슬라이드쇼 — (작업 중 자리표시) */
export const family: StyleFamily = {
  id: 'lyric', label: '감성 슬라이드쇼',
  note: '졸업, 추억, 학년 말, 가족처럼 사진이 주인공이고 느리게 감정을 쌓는 영상.',
  palette: { bg: '#f4efe9', surface: '#ebe3da', ink: '#2a2420', muted: '#7d7068', accents: ['#c9826b', '#8a9a7b', '#b79d6a', '#7f8fa6'], onAccent: '#fffaf5' },
  fonts: { display: "'Noto Serif KR',serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['fade'],
  parts: stubParts('#c9826b'),
};
