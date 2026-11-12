import type { VideoProps, ChapterSpec, PhotoSpec } from '../analysis/videoData.ts';
import { demoDataIntro } from './demoData';
import { samplePhotos } from './samplePhotos';
import { themeById } from './themes';

/** 개인정보 없는 가상 데이터 (저장소/미리보기용) */
export function demoVideoProps(photoPath?: (portrait: boolean, i: number) => string): VideoProps {
  const intro = demoDataIntro(); const imgs = samplePhotos(themeById('summer'));
  const mk = (i: number, h: number): PhotoSpec => ({ src: photoPath ? photoPath(i % 3 === 0, i) : imgs[i % imgs.length], aspect: i % 3 === 0 ? 0.75 : 1.5, time: `${String(h).padStart(2, '0')}:${String(10 + i * 7).slice(-2)}`, date: '2023.06.20', wd: '화', hex: '#e2553a', exif: 'f/1.8 · 1/250 · ISO 50 · 24mm', model: 'Camera A', fy: 0.4, fx: 0.5 });
  const names = [['06.20', '2023년 여름'], ['09.05', '2023년 가을'], ['01.12', '2024년 겨울']];
  const chapters: ChapterSpec[] = names.map(([big, small], k) => ({
    index: k, total: 3, big, small, kicker: '낮', meta: [{ v: String(24 + k * 9), l: '장의 사진' }, { v: '09:20 — 17:40', l: '촬영 시간' }, { v: '낮', l: '주로 찍은 시간대' }],
    accent: ['#d96b4f', '#3d8f8a', '#7a5ab0'][k], light: ['#f3e3dc', '#dcefec', '#e6def2'][k], fromDay: 90 + k * 100, toDay: 90 + k * 100, style: (['fast', 'steady', 'slow'] as const)[k],
    photos: Array.from({ length: 9 }, (_, i) => mk(k * 3 + i, 9 + i)), matchCut: false,
  }));
  chapters.forEach((c) => (c.matchCut = c.photos[0].aspect >= 1.2));
  const hours = Array.from({ length: 24 }, (_, h) => Math.round(Math.max(0, 40 * Math.exp(-((h - 14) ** 2) / 30))));
  if (photoPath) intro.hero.src = photoPath(false, 0);
  return { intro, chapters, outro: { photos: intro.points.length, days: 100, regions: 4, chapters: 3, hours, peakHour: 14, busiest: '06.20', busiestCount: 48, device: 'Camera A', deviceCount: 120, title: intro.title, range: intro.range } };
}
