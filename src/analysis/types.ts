export type RawPhoto = {
  id: number; file: string; width?: number; height?: number; aspect?: number; bytes?: number;
  DateTimeOriginal?: string; fileModified?: string; timeSource?: string;
  latitude?: number; longitude?: number; Make?: string; Model?: string;
  FNumber?: number; ExposureTime?: number; ISO?: number; FocalLength?: number;
  brightness?: number; saturation?: number; sharpness?: number; dhash?: string;
  palette?: { hex: string; share: number }[]; thumb?: string; decodeFailed?: boolean;
};

export type Photo = RawPhoto & {
  t: number;            // 촬영 시각(분 단위 epoch, 현지 벽시계 기준)
  score: number;        // 0~1 품질 점수
  place?: number;       // 장소 클러스터 id
  placeInferred?: boolean;
  group?: number;       // 연사/유사컷 그룹 id
};

export type Swatch = { hex: string; weight: number };
export type Episode = {
  id: number; from: string; to: string; days: number; season: 'spring' | 'summer' | 'autumn' | 'winter';
  photos: number; groups: number; timeOfDay: Record<string, number>; portraitShare: number;
  places: { id: number; share: number; lat: number; lon: number }[];
  hero: number; picks: number[];
  palette: { mode: 'vivid' | 'muted'; accent: string; dark: string; light: string; swatches: Swatch[]; warmth: number; brightness: number };
  rhythm: { style: 'fast' | 'steady' | 'slow'; secondsPerPhoto: number; burstShare: number };
  kind: 'event' | 'roundup'; importance: number; suggested: boolean; label: string;
};
export type Story = {
  summary: { photos: number; dated: number; undated: number; groups: number; episodes: number; scraps: number; from: string; to: string; cameras: Record<string, number>; portraitShare: number; gpsShare: number };
  hero: number; episodes: Episode[]; undated: number[]; places: { id: number; lat: number; lon: number; count: number }[];
};
