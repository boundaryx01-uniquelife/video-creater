import type { StyleFamily } from '../../schema.ts';
import { DataNumbers, DataSchedule } from './data';
import { DataList, OutroThanks, PhotoPair, PhotoSide, TextQuote } from './crafted';
import { OpenerCollage, OpenerTitle, SectionTitle } from './openers';
import { PhotoFull, PhotoGrid, PhotoStrip, PhotoTrio } from './photos';
import { TextStatement } from './text';

/** 계열: 스크랩북 — 종이 바탕 + 폴라로이드 + 테이프, 둥근 글꼴, 통통 튀는 등장 */
export const family: StyleFamily = {
  id: 'scrapbook', label: '스크랩북',
  note: '아이들·가족·동아리처럼 따뜻하고 손맛 나는 기록(학교 활동, 체험학습, 돌잔치, 여행 앨범)을 사진 중심으로 가볍고 귀엽게 보여 줄 때 어울립니다.',
  palette: { bg: '#f8f2e4', surface: '#fffdf8', ink: '#2a2440', muted: '#6d6680', accents: ['#ffb824', '#3d9bff', '#ff6b57', '#2fb67c', '#8f6bff'], onAccent: '#2a2440' },
  fonts: { display: "'Jua','Pretendard','Noto Sans KR',sans-serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['slide', 'blinds', 'up', 'iris'],
  parts: {
    'opener.title': OpenerTitle, 'opener.collage': OpenerCollage, 'section.title': SectionTitle,
    'photo.full': PhotoFull, 'photo.side': PhotoSide, 'photo.pair': PhotoPair, 'photo.trio': PhotoTrio, 'photo.grid': PhotoGrid, 'photo.strip': PhotoStrip,
    'text.statement': TextStatement, 'text.quote': TextQuote,
    'data.numbers': DataNumbers, 'data.schedule': DataSchedule, 'data.list': DataList,
    'outro.thanks': OutroThanks,
  },
};
