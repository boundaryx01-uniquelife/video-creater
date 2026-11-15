import type { StyleFamily } from '../../schema.ts';
import { DataList, DataNumbers, DataSchedule } from './data';
import { OpenerCollage, OpenerTitle, OutroThanks, SectionTitle } from './openers';
import { PhotoFull, PhotoGrid, PhotoPair, PhotoSide, PhotoStrip, PhotoTrio } from './photos';
import { TextQuote, TextStatement } from './texts';

/** 계열: 다큐 — 사진이 화면을 채우고 하단 자막·챕터 카드·현장 시각 스탬프로 진행하는 뉴스 피처/기록 영상 */
export const family: StyleFamily = {
  id: 'documentary', label: '다큐',
  note: '공식 행사 기록, 현장 보고, 시간 순서로 이어지는 이야기처럼 사진이 주인공이고 차분한 하단 자막과 챕터 카드로 진행하는 영상에 어울린다.',
  palette: { bg: '#141517', surface: '#1e2023', ink: '#f3f1ec', muted: '#a09d96', accents: ['#e5533d', '#35a69c', '#e08a3c'], onAccent: '#ffffff' },
  fonts: { display: "'Noto Serif KR','Pretendard','Noto Sans KR',serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['cut', 'fade', 'wipe'],
  parts: {
    'opener.title': OpenerTitle, 'opener.collage': OpenerCollage, 'section.title': SectionTitle,
    'photo.full': PhotoFull, 'photo.side': PhotoSide, 'photo.pair': PhotoPair, 'photo.trio': PhotoTrio, 'photo.grid': PhotoGrid, 'photo.strip': PhotoStrip,
    'text.statement': TextStatement, 'text.quote': TextQuote,
    'data.numbers': DataNumbers, 'data.schedule': DataSchedule, 'data.list': DataList,
    'outro.thanks': OutroThanks,
  },
};
