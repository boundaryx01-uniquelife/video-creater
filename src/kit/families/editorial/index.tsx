import type { StyleFamily } from '../../schema.ts';
import { DataList, DataNumbers, DataSchedule } from './data';
import { OpenerCollage, OpenerTitle, OutroThanks } from './openers';
import { PhotoGrid, PhotoTrio, SectionTitle } from './photos';
import { PhotoFull, PhotoPair, PhotoSide, PhotoStrip } from './spreads';
import { TextQuote, TextStatement } from './texts';

/** 계열: 에디토리얼 — 잡지 표지·학교 안내 영상처럼 비대칭 격자, 큰 명조 제목과 작은 본문의 대비, 헤어라인과 마스크 등장 */
export const family: StyleFamily = {
  id: 'editorial', label: '에디토리얼',
  note: '학교·기관 소개, 공식 행사, 제품·브랜드 이야기처럼 단정하고 신뢰감 있는 잡지풍 영상에 어울린다. 큰 명조 제목과 풀블리드 사진, 절제된 선과 칼 같은 움직임이 특징.',
  palette: { bg: '#f1ede4', surface: '#e6e0d2', ink: '#16150f', muted: '#6f6a5e', accents: ['#c2402a', '#1f5c4d', '#3a4fa3', '#a8602a'], onAccent: '#f7f3ea' },
  fonts: { display: "'Playfair Display','Noto Serif KR',serif", body: "'Pretendard','Noto Sans KR',sans-serif" },
  transitions: ['wipe', 'cut', 'slide', 'up', 'wipe', 'fade'],
  parts: {
    'opener.title': OpenerTitle, 'opener.collage': OpenerCollage, 'section.title': SectionTitle,
    'photo.full': PhotoFull, 'photo.side': PhotoSide, 'photo.pair': PhotoPair, 'photo.trio': PhotoTrio, 'photo.grid': PhotoGrid, 'photo.strip': PhotoStrip,
    'text.statement': TextStatement, 'text.quote': TextQuote,
    'data.numbers': DataNumbers, 'data.schedule': DataSchedule, 'data.list': DataList,
    'outro.thanks': OutroThanks,
  },
};
