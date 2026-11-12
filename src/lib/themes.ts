export type Theme = {
  id: string;
  name: string;
  bg: string;      // 어두운 배경
  bg2: string;     // 보조 배경
  fg: string;      // 본문 텍스트
  accent: string;  // 포인트
  accent2: string; // 보조 포인트
  paper: string;   // 밝은 종이 배경(에디토리얼용)
  sky: [string, string, string]; // 샘플 사진 하늘 그라데이션
  ground: string;  // 샘플 사진 지면 색
};

export const THEMES: Theme[] = [
  { id: 'classic', name: '클래식', bg: '#0b0b0e', bg2: '#17171d', fg: '#f4efe6', accent: '#d9b26f', accent2: '#8c6a2f', paper: '#efe9dc',
    sky: ['#1d2233', '#6b5b73', '#e9b872'], ground: '#1a1a22' },
  { id: 'spring', name: '봄 · 벚꽃', bg: '#14101a', bg2: '#251a2b', fg: '#fff4f6', accent: '#ff9fb8', accent2: '#8fd3a4', paper: '#f7ece9',
    sky: ['#8fb7e8', '#f3c6d6', '#fff0e6'], ground: '#4f7a5a' },
  { id: 'summer', name: '여름 · 바다', bg: '#03121f', bg2: '#08283f', fg: '#f2fbff', accent: '#37d6e8', accent2: '#ffd166', paper: '#e7f3f6',
    sky: ['#0b4f8a', '#35b4e6', '#ffe9a8'], ground: '#0c3a5b' },
  { id: 'autumn', name: '가을 · 단풍', bg: '#140a07', bg2: '#2a140c', fg: '#fff1e0', accent: '#ff8a3d', accent2: '#c0392b', paper: '#f1e4d3',
    sky: ['#3a1d16', '#c4642a', '#ffc778'], ground: '#2a120b' },
  { id: 'winter', name: '겨울 · 설경', bg: '#070b14', bg2: '#12203a', fg: '#f3f8ff', accent: '#9fd3ff', accent2: '#ffffff', paper: '#e9eff5',
    sky: ['#1b2a4a', '#6f8fbf', '#dce9f7'], ground: '#cfdced' },
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
