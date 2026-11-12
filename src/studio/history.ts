/** 실행 취소/다시 실행: 모드별 props 이력. 같은 항목을 연속으로 고치면(타이핑) 한 단계로 합친다. */
import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_STEPS = 100;           // 모드당 최대 되돌리기 단계
export const MAX_CHARS = 24_000_000;    // 모드당 이력 전체의 대략적인 크기 상한(JSON 문자 수)
export const MERGE_MS = 900;            // 같은 키로 이 시간 안에 다시 바꾸면 합친다

export type Stack<T> = { past: T[]; present: T; future: T[]; sizes: number[]; lastKey: string; lastAt: number };
type Updater<T> = T | ((cur: T) => T);

const sizeOf = (v: unknown) => { try { return JSON.stringify(v).length; } catch { return 0; } };

/** 순수 함수: 새 값을 이력에 반영한다. 훅과 분리해 두었다 */
export function commit<T>(st: Stack<T>, next: T, key: string, now: number): Stack<T> {
  if (next === st.present) return st;
  const merge = !!key && key === st.lastKey && now - st.lastAt < MERGE_MS && st.past.length > 0;
  if (merge) return { ...st, present: next, future: [], lastAt: now };
  let past = [...st.past, st.present], sizes = [...st.sizes, sizeOf(st.present)];
  let total = sizes.reduce((a, b) => a + b, 0);
  while (past.length > MAX_STEPS || (total > MAX_CHARS && past.length > 1)) { total -= sizes[0]; past = past.slice(1); sizes = sizes.slice(1); }
  return { past, sizes, present: next, future: [], lastKey: key, lastAt: now };
}
export const undoStack = <T,>(st: Stack<T>): Stack<T> => st.past.length ? { past: st.past.slice(0, -1), sizes: st.sizes.slice(0, -1), present: st.past[st.past.length - 1], future: [st.present, ...st.future], lastKey: '', lastAt: 0 } : st;
export const redoStack = <T,>(st: Stack<T>): Stack<T> => st.future.length ? { past: [...st.past, st.present], sizes: [...st.sizes, sizeOf(st.present)], present: st.future[0], future: st.future.slice(1), lastKey: '', lastAt: 0 } : st;
export const newStack = <T,>(v: T): Stack<T> => ({ past: [], sizes: [], present: v, future: [], lastKey: '', lastAt: 0 });

/** 모드 id별 이력을 보관한다. 모드를 바꿔도 이전 모드의 이력은 유지된다. */
export function useHistory<T>(id: string, init: (id: string) => T) {
  const store = useRef(new Map<string, Stack<T>>()), [, bump] = useState(0);
  const initRef = useRef(init); initRef.current = init;
  const idRef = useRef(id); idRef.current = id;
  const get = useCallback((k: string) => { let s = store.current.get(k); if (!s) { s = newStack(initRef.current(k)); store.current.set(k, s); } return s; }, []);
  const cur = get(id);
  /** key가 있으면 같은 key의 연속 변경을 한 단계로 합친다 */
  const set = useCallback((u: Updater<T>, key = '') => {
    const k = idRef.current, st = get(k), next = typeof u === 'function' ? (u as (c: T) => T)(st.present) : u;
    const n = commit(st, next, key, Date.now()); if (n !== st) { store.current.set(k, n); bump((x) => x + 1); }
  }, [get]);
  const step = useCallback((f: (s: Stack<T>) => Stack<T>) => { const k = idRef.current, st = get(k), n = f(st); if (n !== st) { store.current.set(k, n); bump((x) => x + 1); } }, [get]);
  const undo = useCallback(() => step(undoStack), [step]), redo = useCallback(() => step(redoStack), [step]);
  return { value: cur.present, set, undo, redo, canUndo: cur.past.length > 0, canRedo: cur.future.length > 0, steps: cur.past.length };
}

/** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y. 입력창 안에서도 앱 이력을 쓴다(브라우저 기본 되돌리기는 제어 입력과 섞여 엉킨다) */
export function useUndoKeys(undo: () => void, redo: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return; const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); (e.shiftKey ? redo : undo)(); } else if (k === 'y' && !e.metaKey) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [undo, redo]);
}
