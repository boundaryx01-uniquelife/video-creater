// 사용: node --experimental-strip-types --no-warnings scripts/analyze.ts <metadata.json | photo-bundle.zip> [out.json]
import fs from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { analyze } from '../src/analysis/analyze.ts';

const [src, out = 'story.json'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let text: string;
if (src.endsWith('.zip')) { const z = unzipSync(new Uint8Array(fs.readFileSync(src)), { filter: (f) => f.name === 'metadata.json' }); text = strFromU8(z['metadata.json']); }
else text = fs.readFileSync(src, 'utf8');
const { photos: raw } = JSON.parse(text);
const { story } = analyze(raw, { requireThumb: process.argv.includes('--thumbs') });
fs.writeFileSync(out, JSON.stringify(story, null, 1));
console.log(JSON.stringify(story.summary));
for (const e of story.episodes) console.log(`#${String(e.id).padStart(2)} ${e.suggested ? '★' : ' '} ${e.kind.padEnd(6)} ${e.label.padEnd(12)} ${e.season.padEnd(6)} ${String(e.photos).padStart(3)}장/${String(e.groups).padStart(3)}그룹 picks=${String(e.picks.length).padStart(2)} ${e.rhythm.style.padEnd(6)} imp=${String(e.importance).padStart(5)} ${e.palette.mode}:${e.palette.accent} 세로=${e.portraitShare} tod=${JSON.stringify(e.timeOfDay)}`);
