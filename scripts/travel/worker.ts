// 스튜디오 서버가 자식 프로세스로 띄우는 여행 빌드 작업자. 무거운 지도 데이터(수십~수백 MB)와 CPU 작업을 서버 프로세스 밖에서 처리한다.
// 메시지(부모 → 작업자): { id, cmd: 'build' | 'reroute', ... }   메시지(작업자 → 부모): { id, t: 'stage' | 'done' | 'error', ... }
import fs from 'node:fs';
import path from 'node:path';
import type { TravelProps } from '../../src/travel/types.ts';
import { analyzePhotos } from './analyze-photos.ts';
import { buildTravel, rerouteTravel, TravelError, Stage } from './pipeline.ts';

type Msg =
  | { id: string; cmd: 'build'; out: string; prefix: string; files: { path: string; name: string }[]; attachNoGps?: boolean; osm?: boolean; terrain?: boolean }
  | { id: string; cmd: 'reroute'; out: string; prefix: string; props: TravelProps; reuse?: any[]; cruise?: number[]; osm?: boolean; terrain?: boolean };
const send = (m: object) => process.send?.(m);
// 단계별 진행률 구간(0~1)
const RANGE: Record<Stage, [number, number]> = { analyze: [0, 0.3], stops: [0.3, 0.34], routes: [0.34, 0.55], layers: [0.55, 0.62], terrain: [0.62, 0.98], done: [1, 1] };

process.on('message', async (m: Msg) => {
  const stage = (s: Stage, msg: string, f = 0) => send({ id: m.id, t: 'stage', stage: s, msg, progress: RANGE[s][0] + (RANGE[s][1] - RANGE[s][0]) * f });
  try {
    fs.mkdirSync(m.out, { recursive: true });
    if (m.cmd === 'build') {
      stage('analyze', `사진 ${m.files.length}장 분석 중`, 0);
      const a = await analyzePhotos(m.files, m.out, (d, t) => stage('analyze', `사진 분석 ${d}/${t}`, d / t));
      const r = await buildTravel({ raw: a.raw, failed: a.failed.length, srcOf: (p: any) => (p.thumb ? m.prefix + p.thumb : null) }, { out: m.out, assetPrefix: m.prefix, rev: Date.now().toString(36), attachNoGps: m.attachNoGps ?? true, osm: m.osm, terrain: m.terrain, stage });
      if (a.failed.length) { r.warnings.unshift({ code: 'unreadable', level: 'warn', msg: `읽지 못한 파일 ${a.failed.length}개: ${a.failed.slice(0, 5).map((f) => f.name).join(', ')}${a.failed.length > 5 ? ' …' : ''} (JPG·PNG·WebP만 지원)` }); r.meta.warnings = r.warnings; fs.writeFileSync(path.join(m.out, 'travel-meta.json'), JSON.stringify(r.meta)); }
      send({ id: m.id, t: 'done', props: r.props, meta: r.meta });
    } else {
      const r = await rerouteTravel(m.props, { out: m.out, assetPrefix: m.prefix, rev: Date.now().toString(36), osm: m.osm, terrain: m.terrain, stage }, m.reuse, m.cruise);
      fs.writeFileSync(path.join(m.out, 'travel-props.json'), JSON.stringify(r.props));
      send({ id: m.id, t: 'done', props: r.props, warnings: r.warnings, log: r.log });
    }
  } catch (e: any) {
    send({ id: m.id, t: 'error', code: e instanceof TravelError ? e.code : 'internal', message: String(e?.message ?? e).slice(0, 500), hint: e instanceof TravelError ? e.hint : undefined });
  }
});
send({ t: 'ready' });
