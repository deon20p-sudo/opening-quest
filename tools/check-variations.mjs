// Stockfish sanity check of web/data/variations.json: flags moves by the learner's
// side that lose a lot (likely typos) and lines that end badly for the learner.
import { Chess } from '../web/vendor/chess.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const SF = new URL('../web/vendor/stockfish-17.1-lite-single.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const vars = JSON.parse(fs.readFileSync(new URL('../web/data/variations.json', import.meta.url)));
const ops = JSON.parse(fs.readFileSync(new URL('../web/data/openings.json', import.meta.url))).openings;
const p = spawn(process.execPath, [SF], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '', waiters = [], last = null;
p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
  if (l.startsWith('info') && l.includes(' score ') && !l.includes('bound')) last = l;
  for (const w of waiters.slice()) if (l.startsWith(w.p)) { waiters.splice(waiters.indexOf(w), 1); w.r(l); } } });
const send = (s) => p.stdin.write(s + '\n'); const wait = (pr) => new Promise((r) => waiters.push({ p: pr, r }));
async function evalFen(fen) { // score for the side to move, centipawns
  const g = new Chess(fen); if (g.isCheckmate()) return -10000; if (g.isGameOver()) return 0;
  last = null; send(`position fen ${fen}`); send('go depth 12'); await wait('bestmove');
  const t = last.split(' '); const si = t.indexOf('score');
  return t[si + 1] === 'cp' ? +t[si + 2] : (+t[si + 2] > 0 ? 10000 : -10000);
}
send('uci'); await wait('uciok'); send('isready'); await wait('readyok');
const only = process.argv[2];
for (const o of ops) {
  if (only && o.id !== only) continue;
  for (const v of vars[o.id]) {
    const g = new Chess(); let prev = await evalFen(g.fen()); const issues = [];
    for (let i = 0; i < v.moves.length; i++) {
      const mover = g.turn(); g.move(v.moves[i]); const sc = await evalFen(g.fen());
      const drop = prev + sc; // mover's eval before minus mover's eval after (= -sc)
      if (mover === o.side && drop > 120) issues.push(`${Math.floor(i / 2) + 1}${i % 2 ? '...' : '.'}${v.moves[i]} loses ${drop}`);
      prev = sc;
    }
    const final = g.turn() === o.side ? prev : -prev;
    if (final < -150) issues.push(`ends at ${final} for the learner`);
    console.log(`${issues.length ? 'WARN' : 'ok  '} ${o.id} / ${v.name}${issues.length ? ' :: ' + issues.join('; ') : ''}`);
  }
}
send('quit'); p.kill();
