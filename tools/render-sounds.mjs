// Render the app's synthesized sounds to WAV files: node tools/render-sounds.mjs <outdir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { RECIPES, render } from '../web/sfxsynth.js';
const dir = process.argv[2] || 'build/sounds';
mkdirSync(dir, { recursive: true });
const sr = 44100;
for (const name of Object.keys(RECIPES)) {
  const d = render(name, sr);
  const pcm = Buffer.alloc(44 + d.length * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + d.length * 2, 4); pcm.write('WAVEfmt ', 8);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(sr, 24);
  pcm.writeUInt32LE(sr * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(d.length * 2, 40);
  for (let i = 0; i < d.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, d[i])) * 32767), 44 + i * 2);
  writeFileSync(`${dir}/${name}.wav`, pcm);
  console.log(name, (d.length / sr * 1000).toFixed(0) + 'ms');
}
