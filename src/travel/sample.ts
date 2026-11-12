import type { PhotoSpec } from '../analysis/videoData.ts';
import type { TravelProps } from './types.ts';

const ph = (kind: string, n: number, port: boolean, time: string, cap?: PhotoSpec['cap']): PhotoSpec => ({ src: `media/trip_${kind}_${port ? 'P' : 'L'}${n}.jpg`, aspect: port ? 0.75 : 1.78, time, date: '', wd: '', hex: '#ff6b4a', exif: '', model: '', fy: 0.4, fx: 0.5, cap });
const T = (chip: string, title = '', sub = '') => ({ chip, title, sub });

/** 가상의 여행(실제 사진·개인정보 없음). 정차지 좌표와 시각만 입력하면 이동 구간·이동수단·거리·속도는 자동 계산된다 */
export function travelSample(): TravelProps {
  return {
    info: { kicker: 'TRAVEL LOG', title: '일본\n2박 3일', sub: '인천에서 교토까지', range: '2026.05.03 – 05.05' },
    colors: { accent: '#ff6b4a', light: '#efe9dc', ink: '#0f2a35', ocean: '#0f2b36', land: '#e8e0cf' },
    stops: [
      { name: '인천', sub: '인천국제공항 출발', lat: 37.4602, lon: 126.4407, arrive: '2026-05-03T09:00', depart: '2026-05-03T09:20', photos: [] },
      { name: '도쿄', sub: '하네다공항 도착', lat: 35.5494, lon: 139.7798, arrive: '2026-05-03T11:40', depart: '2026-05-03T15:10', photos: [
        ph('plane', 1, false, '11:42', T('11:42', '도쿄 도착', '하네다공항')), ph('tokyo', 1, false, '12:30', T('12:30')), ph('tokyo', 1, true, '13:05', T('13:05')), ph('tokyo', 2, true, '13:07', T('13:07')), ph('tokyo', 2, false, '14:20', T('14:20', '시부야', '도쿄')), ph('tokyo', 3, false, '14:50', T('14:50'))] },
      { name: '하코네', sub: '온천 마을', lat: 35.2326, lon: 139.107, arrive: '2026-05-03T17:00', depart: '2026-05-04T09:30', photos: [
        ph('hakone', 1, false, '17:30', T('17:30', '하코네 도착', '아시노코 호수')), ph('hakone', 2, false, '18:10', T('18:10')), ph('hakone', 1, true, '18:40', T('18:40')), ph('hakone', 2, true, '18:41', T('18:41')), ph('hakone', 3, false, '07:50', T('07:50', '아침 산책', '후지산 전망')), ph('hakone', 1, false, '08:40', T('08:40'))] },
      { name: '교토', sub: '신칸센으로 도착', lat: 35.0116, lon: 135.7681, arrive: '2026-05-04T12:10', depart: '2026-05-05T15:10', photos: [
        ph('kyoto', 1, false, '13:20', T('13:20', '교토 도착', '기온 거리')), ph('kyoto', 2, false, '15:00', T('15:00')), ph('kyoto', 1, true, '16:30', T('16:30')), ph('kyoto', 2, true, '16:31', T('16:31')), ph('kyoto', 3, false, '18:20', T('18:20', '저녁 산책', '가모강'))] },
      { name: '후시미 이나리', sub: '천 개의 도리이', lat: 34.9671, lon: 135.7727, arrive: '2026-05-05T16:00', photos: [
        ph('inari', 1, false, '16:05', T('16:05', '도보 도착', '후시미 이나리 신사')), ph('inari', 2, false, '16:30', T('16:30')), ph('inari', 1, true, '16:50', T('16:50')), ph('inari', 2, true, '16:52', T('16:52')), ph('inari', 3, false, '17:20', T('17:20', '산 정상', '이나리산'))] },
    ],
  };
}
