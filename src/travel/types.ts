import type { PhotoSpec } from '../analysis/videoData.ts';
import type { AudioSpec } from '../audio/spec.ts';

export type LL = [number, number];
export type Mode = 'plane' | 'train' | 'car' | 'walk' | 'ship' | 'bike';
export type Stop = { name: string; sub: string; lat: number; lon: number; arrive: string; depart?: string; tz?: string; photos: PhotoSpec[] };
/** 이동 구간. path는 [lon,lat] 목록. routed=true면 실제 도로/철도 데이터를 따라간 경로 */
export type Leg = { a: number; b: number; mode: Mode; km: number; straightKm: number; min: number; speed: number; path: LL[]; cum: number[]; t0: number; t1: number; routed: boolean };
/** 지형 텍스처: 위경도 등간격 격자 이미지(행 0 = 북쪽) */
export type Texture = { src: string; w: number; h: number; lon0: number; lon1: number; lat0: number; lat1: number };
export type GeoExtras = { roads: LL[][]; rails: LL[][]; rivers: { r: number; c: LL[] }[]; lakes: LL[][]; urban: LL[][]; cities: { n: string; lon: number; lat: number; pop: number }[]; streets?: { k: number; c: LL[] }[]; credits?: string[] };
/** 여행 영상 입력. stops만 있으면 동작하고, legs/assets는 빌드 스크립트가 미리 계산해 넣는다(도로 경로, 지형, 지도 레이어). */
export type TravelProps = {
  info: { kicker: string; title: string; sub: string; range: string };
  colors: { accent: string; light: string; ink: string; ocean: string; land: string };
  stops: Stop[]; modeOverride?: Record<number, Mode>;
  legs?: Omit<Leg, 'cum'>[]; assets?: { geo?: string; terrain?: Texture[] };
  audio?: AudioSpec;
};
