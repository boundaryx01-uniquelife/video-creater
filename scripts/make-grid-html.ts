// 사용: node --experimental-strip-types --no-warnings scripts/make-grid-html.ts <gridDir> <part: 1|2>
import fs from 'node:fs';
import { MODES, MODE_IDS } from '../src/modes/config.ts';

const [dir, part = '1'] = process.argv.slice(2);
const rows = [...MODE_IDS.map((id) => ({ id, name: MODES[id].name, use: MODES[id].use, data: MODES[id].data, accent: MODES[id].accent })),
  { id: 'recap', name: '결산 · 리캡', use: '연말·분기 결산, 개인/팀 아카이브', data: ['촬영 날짜 분포', '촬영 시간대', '가장 몰린 날', '기기·지역 통계'], accent: '#d96b4f' }];
const sel = part === '1' ? rows.slice(0, 4) : rows.slice(4);
const cols = ['① 인트로', '② 챕터 카드', '③ 사진 컷 · 데이터 오버레이', '④ 아웃트로'], keys = ['intro', 'card', 'beat', 'outro'];
const css = `@import url('file:///home/user/photo-video/node_modules/@fontsource/pretendard/400.css');@import url('file:///home/user/photo-video/node_modules/@fontsource/pretendard/800.css');@import url('file:///home/user/photo-video/node_modules/@fontsource/pretendard/900.css');
*{box-sizing:border-box}body{margin:0;background:#0f1013;color:#eceef2;font-family:'Pretendard',sans-serif;padding:28px 32px}
.g{display:grid;grid-template-columns:300px repeat(4,560px);gap:14px 16px;align-items:start}
.h{font-size:19px;font-weight:800;color:#9aa0ad;padding:4px 0 8px}
.l{padding-right:14px}.l b{display:block;font-size:30px;font-weight:900;letter-spacing:-.03em;line-height:1.15}.l i{display:block;width:44px;height:7px;margin:12px 0}
.l p{margin:0 0 12px;font-size:16px;color:#aab0bd;line-height:1.45}.l span{display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border:1px solid #3a3e4a;border-radius:99px;font-size:14px;font-weight:600;color:#d5d9e2}
img{width:560px;height:315px;display:block;border-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,.5)}`;
const html = `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="g"><div></div>${cols.map((c) => `<div class="h">${c}</div>`).join('')}
${sel.map((r) => `<div class="l"><b>${r.name}</b><i style="background:${r.accent}"></i><p>${r.use}</p>${r.data.map((d) => `<span>${d}</span>`).join('')}</div>${keys.map((k) => `<img src="${r.id}-${k}.png">`).join('')}`).join('\n')}</div>`;
fs.writeFileSync(`${dir}/grid${part}.html`, html); console.log('html', part, sel.length, 'rows');
