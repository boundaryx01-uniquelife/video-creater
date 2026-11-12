import type React from 'react';
import type { IntroProps } from '../lib/common';
import { Cinematic } from './Cinematic';
import { FilmStrip } from './FilmStrip';
import { Particles } from './Particles';
import { Glitch } from './Glitch';
import { Editorial } from './Editorial';
import { Mosaic } from './Mosaic';

export type IntroDef = {
  id: string; name: string; desc: string; mood: string[]; style: string;
  poster: number; Component: React.FC<IntroProps>;
};

export const INTROS: IntroDef[] = [
  { id: 'cinematic', name: '시네마틱', desc: '레터박스와 켄번즈 위에 글자가 마스크로 솟아오르고 라이트 스윕이 지나감', mood: ['여행', '가족', '웨딩'], style: '영화 오프닝 타이틀 / 다큐 시퀀스', poster: 96, Component: Cinematic },
  { id: 'filmstrip', name: '필름 스트립', desc: '기울어진 3D 필름 롤이 흘러가다 셔터 플래시와 함께 타이틀 패널로 수렴', mood: ['추억', '레트로', '기록'], style: '아날로그 필름 / 포토 아카이브 리일', poster: 100, Component: FilmStrip },
  { id: 'particles', name: '파티클 리빌', desc: '흩어진 입자가 소용돌이치며 제목 형태로 모이고 빛남', mood: ['밤', '겨울', '감성'], style: '애플 키노트 / 테크 키비주얼', poster: 100, Component: Particles },
  { id: 'glitch', name: '글리치 키네틱', desc: 'RGB 분리와 슬라이스 변위, REC 타임코드 HUD가 있는 사이버 타이포', mood: ['액티비티', '스포츠', '도시'], style: '뮤직비디오 / 게임 트레일러', poster: 104, Component: Glitch },
  { id: 'editorial', name: '에디토리얼', desc: '매거진 레이아웃: 괘선 드로잉, 세리프 마스크 타이포, 사진 윈도우, 회전 배지', mood: ['감성', '일상', '봄'], style: 'Kinfolk / Cereal 매거진', poster: 100, Component: Editorial },
  { id: 'mosaic', name: '포토 모자이크', desc: '사진 타일이 중심에서 물결치며 등장하고 카메라가 빠지며 타이틀 패널로 수렴', mood: ['모임', '기념일', '연말'], style: '소셜 리캡 / 연말 결산 영상', poster: 110, Component: Mosaic },
];
