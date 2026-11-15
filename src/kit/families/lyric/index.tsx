import type { StyleFamily } from '../../schema.ts';
import { DataList, DataNumbers, DataSchedule } from './data';
import { OpenerCollage, OpenerTitle, OutroThanks, SectionTitle } from './openers';
import { PhotoFull, PhotoGrid, PhotoPair, PhotoSide, PhotoStrip, PhotoTrio } from './photos';
import { TextQuote, TextStatement } from './texts';

/** 계열: 감성 슬라이드쇼 — 사진이 주인공. 천천히 다가가는 사진, 흐릿한 배경 위 액자(2.5D), 가는 명조와 넓은 자간의 작은 글, 은은한 가장자리 빛 */
export const family: StyleFamily = {
  id: 'lyric', label: '감성 슬라이드쇼',
  note: '졸업, 추억, 학년 말, 가족 행사, 한 해 돌아보기처럼 사진이 주인공이고 느리게 감정을 쌓는 영상. 글은 작고 가볍게(가는 명조), 사진은 꽉 차거나 흐릿한 배경 위 액자로 천천히 움직인다. 전환은 부드러운 페이드 중심이라 빠른 정보 전달보다 여운을 남기는 영상에 어울린다.',
  palette: { bg: '#f4efe9', surface: '#ebe3da', ink: '#2a2420', muted: '#7d7068', accents: ['#c9826b', '#8a9a7b', '#b79d6a', '#7f8fa6'], onAccent: '#fffaf5' },
  fonts: { display: "'Noto Serif KR',serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['fade', 'fade', 'fade', 'wipe', 'fade', 'iris'],
  parts: {
    'opener.title': OpenerTitle, 'opener.collage': OpenerCollage, 'section.title': SectionTitle,
    'photo.full': PhotoFull, 'photo.side': PhotoSide, 'photo.pair': PhotoPair, 'photo.trio': PhotoTrio, 'photo.grid': PhotoGrid, 'photo.strip': PhotoStrip,
    'text.statement': TextStatement, 'text.quote': TextQuote,
    'data.numbers': DataNumbers, 'data.schedule': DataSchedule, 'data.list': DataList,
    'outro.thanks': OutroThanks,
  },
};
