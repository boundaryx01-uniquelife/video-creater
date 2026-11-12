/** 창 어디에든 파일을 끌어다 놓는 동작. 놓은 파일이 브라우저에서 열리지 않게 막고, 끌고 있는 동안 true를 돌려준다 */
import { useEffect, useRef, useState } from 'react';

const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');

export function useFileDrop(onFiles: (files: File[]) => void): boolean {
  const [on, setOn] = useState(false), cb = useRef(onFiles); cb.current = onFiles;
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setOn(true); };
    const over = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setOn(false); };
    const drop = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; setOn(false); if (e.defaultPrevented && e.dataTransfer?.files.length) cb.current(Array.from(e.dataTransfer.files)); };
    window.addEventListener('dragenter', enter); window.addEventListener('dragover', over); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragenter', enter); window.removeEventListener('dragover', over); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  }, []);
  return on;
}
