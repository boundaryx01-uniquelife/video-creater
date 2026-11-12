import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_AUDIO, type AudioSpec } from '../audio/spec.ts';
import { analyzeBpm } from './bpm.ts';

const OK_KEY = (src: string) => `studio:audio-ok:${src}`;
const TYPE_BY_EXT: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg' };

/** "상업적 이용 권한" 확인 상태. 음원(src)마다 이 브라우저에 기억한다 */
export function useAudioLicense(src?: string): [boolean, (v: boolean) => void] {
  const [ok, setOk] = useState(false);
  useEffect(() => { try { setOk(!!src && localStorage.getItem(OK_KEY(src)) === '1'); } catch { setOk(false); } }, [src]);
  const set = (v: boolean) => { setOk(v); if (src) try { v ? localStorage.setItem(OK_KEY(src), '1') : localStorage.removeItem(OK_KEY(src)); } catch { /* 무시 */ } };
  return [ok, set];
}

type Info = { name: string; bpm?: number; offset?: number; confidence?: number; dur?: number; failed?: boolean; local?: boolean };
const num = (v: string, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/** 스튜디오 "음악" 섹션: 업로드, 음량·페이드·반복, BPM 자동 분석 결과 표시와 수동 수정, 박자 맞추기 */
export const MusicPanel: React.FC<{ audio?: AudioSpec; onChange: (a?: AudioSpec) => void; busy: (s: string) => void; licensed: boolean; setLicensed: (v: boolean) => void }> = ({ audio, onChange, busy, licensed, setLicensed }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const set = (patch: Partial<AudioSpec>) => audio && onChange({ ...audio, ...patch });

  const pick = async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '', type = f.type || TYPE_BY_EXT[ext] || '';
    if (!TYPE_BY_EXT[ext] && !type.startsWith('audio/')) { busy('MP3, WAV, M4A, OGG 파일만 쓸 수 있습니다.'); return; }
    if (f.size > 60e6) { busy('음원은 60MB 이하만 올릴 수 있습니다.'); return; }
    busy('음원 올리는 중…');
    let src: string, local = false;
    try {
      const res = await fetch('/api/upload-audio', { method: 'POST', headers: { 'content-type': TYPE_BY_EXT[ext] ?? type }, body: f });
      const j = await res.json().catch(() => ({})); if (!res.ok) { busy(j.error || '음원을 올리지 못했습니다.'); return; }
      src = j.src;
    } catch { src = URL.createObjectURL(f); local = true; } // 서버가 없으면 미리보기 전용
    busy('박자 분석 중…');
    let r = null; try { r = await analyzeBpm(f); } catch { /* 디코딩 실패 */ }
    const keep = audio ? { volume: audio.volume, fadeInSec: audio.fadeInSec, fadeOutSec: audio.fadeOutSec, loop: audio.loop } : {};
    onChange({ ...DEFAULT_AUDIO(src), ...keep, ...(r ? { bpm: Math.round(r.bpm * 10) / 10, beatOffsetSec: r.offsetSec } : {}) });
    setInfo({ name: f.name, bpm: r?.bpm, offset: r?.offsetSec, confidence: r?.confidence, dur: r?.durationSec, failed: !r, local });
    busy(local ? '서버가 없어 미리보기에서만 들을 수 있습니다(MP4에는 들어가지 않음).' : '');
  };

  return (
    <details className="sec" open={!!audio}>
      <summary>음악 {audio && <small className="hint">· {info?.name ?? audio.src.split('/').pop()}</small>}</summary>
      <div className="body music">
        <div className="btns">
          <button type="button" onClick={() => ref.current?.click()}>{audio ? '음원 바꾸기' : '음원 올리기'} <small className="hint">MP3 · WAV · M4A · OGG, 60MB 이하</small></button>
          {audio && <button type="button" className="danger" onClick={() => { onChange(undefined); setInfo(null); }}>음악 빼기</button>}
          <input ref={ref} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.m4a,.ogg" hidden data-testid="audio-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
        </div>
        {!audio && <p className="hint">음악을 넣으면 미리보기에서 소리가 나고 MP4에도 들어갑니다. 음원은 직접 권리를 가진 것만 쓰세요. 이 도구는 음원을 제공하지 않습니다.</p>}
        {audio && <>
          <label>음량 <b data-testid="vol-text">{Math.round(audio.volume * 100)}%</b><input type="range" min={0} max={1} step={0.01} value={audio.volume} onChange={(e) => set({ volume: num(e.target.value) })} /></label>
          <div className="row3 music3">
            <label>페이드 인(초)<input type="number" min={0} max={10} step={0.5} value={audio.fadeInSec} onChange={(e) => set({ fadeInSec: Math.max(0, num(e.target.value)) })} /></label>
            <label>페이드 아웃(초)<input type="number" min={0} max={10} step={0.5} value={audio.fadeOutSec} onChange={(e) => set({ fadeOutSec: Math.max(0, num(e.target.value)) })} /></label>
            <label>시작 위치(초)<input type="number" min={0} step={0.5} value={audio.startFromSec} onChange={(e) => set({ startFromSec: Math.max(0, num(e.target.value)) })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={audio.loop} onChange={(e) => set({ loop: e.target.checked })} />영상이 음원보다 길면 반복</label>
          <div className="group">
            <div className="glabel">박자 <small>{info?.failed ? '자동 분석 실패 · 직접 입력하세요' : info?.bpm ? `자동 분석 ${info.bpm.toFixed(1)} BPM · 첫 박 ${info.offset?.toFixed(2)}초 · 신뢰도 ${info.confidence?.toFixed(1)}` : '직접 입력하거나 음원을 다시 올리면 자동 분석합니다'}</small></div>
            <div className="row3 music2">
              <label>BPM<input type="number" min={40} max={240} step={0.1} value={audio.bpm ?? ''} placeholder="예: 120" data-testid="bpm" onChange={(e) => set({ bpm: e.target.value === '' ? undefined : num(e.target.value) })} /></label>
              <label>첫 박 위치(초)<input type="number" min={0} step={0.01} value={audio.beatOffsetSec ?? 0} data-testid="offset" onChange={(e) => set({ beatOffsetSec: Math.max(0, num(e.target.value)) })} /></label>
              {info?.bpm && <button type="button" className="ghost" onClick={() => set({ bpm: Math.round(info.bpm! * 10) / 10, beatOffsetSec: info.offset })}>자동 값으로</button>}
            </div>
            <label className="check"><input type="checkbox" data-testid="sync" checked={!!audio.syncCuts} disabled={!audio.bpm} onChange={(e) => set({ syncCuts: e.target.checked })} />사진 컷을 박자에 맞추기</label>
            <p className="hint">컷 길이가 박 단위로 바뀌고, 영상이 조금 길어질 수 있습니다.</p>
          </div>
          <label className="check lic"><input type="checkbox" data-testid="license" checked={licensed} onChange={(e) => setLicensed(e.target.checked)} />상업적 이용 권한이 있는 음원입니다</label>
          {!licensed && <p className="hint">체크하기 전에는 미리보기만 되고, 음악이 든 MP4는 만들 수 없습니다.</p>}
        </>}
      </div>
    </details>
  );
};
