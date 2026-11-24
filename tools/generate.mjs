// Generates web/data/openings.json: for every opening, 10 levels where the bot
// answers with a different, sound variation, plus your correct follow-up moves.
// Level 1's bot picks a weaker (but plausible) reply; level 10 plays the main line.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { CATALOG } from './catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SF = path.join(here, '..', 'web', 'vendor', 'stockfish-17.1-lite-single.js');
const OUT = path.join(here, '..', 'web', 'data', 'openings.json');
const LEVEL_ELO = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200];
const EXTRA_USER_MOVES = 3;     // your moves after the opening's core, per level line
const DEPTH = +process.env.DEPTH || 13;

class Uci {
  constructor() {
    this.p = spawn(process.execPath, [SF], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.buf = '';
    this.waiters = [];
    this.lines = [];
    this.p.stdout.on('data', (d) => {
      this.buf += d;
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const l = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        this.lines.push(l);
        for (const w of this.waiters.slice()) if (l.startsWith(w.prefix)) { this.waiters.splice(this.waiters.indexOf(w), 1); w.res(l); }
      }
    });
  }
  send(s) { this.p.stdin.write(s + '\n'); }
  wait(prefix) { return new Promise((res) => this.waiters.push({ prefix, res })); }
  async init() { this.send('uci'); await this.wait('uciok'); this.send('setoption name Hash value 128'); this.send('isready'); await this.wait('readyok'); }
  async analyse(fen, multipv = 1, depth = DEPTH) {
    this.lines = [];
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
    await this.wait('bestmove');
    const best = new Map();
    for (const l of this.lines) {
      if (!l.startsWith('info ') || !l.includes(' pv ') || l.includes('bound')) continue;
      const t = l.split(' ');
      const d = +t[t.indexOf('depth') + 1];
      const k = t.includes('multipv') ? +t[t.indexOf('multipv') + 1] : 1;
      const si = t.indexOf('score');
      let cp = t[si + 1] === 'cp' ? +t[si + 2] : (+t[si + 2] > 0 ? 100000 - +t[si + 2] : -100000 - +t[si + 2]);
      const uci = t[t.indexOf('pv') + 1];
      const prev = best.get(k);
      if (!prev || d >= prev.d) best.set(k, { d, cp, uci });
    }
    return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }
  quit() { this.send('quit'); this.p.kill(); }
}

const cache = new Map();
async function bestMove(eng, fen) {
  if (cache.has(fen)) return cache.get(fen);
  const [r] = await eng.analyse(fen, 1);
  cache.set(fen, r);
  return r;
}

const toSan = (g, uci) => g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;

async function buildOpening(eng, op) {
  const g = new Chess();
  const core = op.core.split(' ');
  for (const san of core) g.move(san);
  const lastColor = g.history({ verbose: true }).at(-1).color;
  if (lastColor !== op.side) throw new Error(`${op.id}: core must end with a ${op.side} move`);
  const devFen = g.fen();
  const cands = await eng.analyse(devFen, 12, DEPTH - 1);
  const bestCp = cands[0].cp;
  let pool = cands.filter((c) => c.cp >= bestCp - 220).map((c) => ({ first: [c.uci], score: c.cp }));

  // Not enough different first replies: add a second deviation one bot move later.
  if (pool.length < 10) {
    const extra = [];
    for (const p of pool.slice(0, 4)) {
      const h = new Chess(devFen);
      toSan(h, p.first[0]);
      const reply = await bestMove(eng, h.fen());
      toSan(h, reply.uci);
      if (h.isGameOver()) continue;
      const alts = await eng.analyse(h.fen(), 6, DEPTH - 1);
      const top = alts[0].cp;
      for (const a of alts.slice(1)) {
        if (a.cp < top - 200) continue;
        extra.push({ first: [p.first[0], reply.uci, a.uci], score: Math.min(p.score, a.cp) - 1 });
      }
    }
    extra.sort((a, b) => b.score - a.score);
    pool = pool.concat(extra);
  }
  pool = pool.slice(0, 10).sort((a, b) => b.score - a.score);
  while (pool.length < 10) pool.push(pool[pool.length % Math.max(1, pool.length)]); // tiny trees only

  const levels = [];
  for (let L = 10; L >= 1; L--) {
    const path = pool[10 - L];
    const h = new Chess(devFen);
    const moves = core.slice();
    for (const u of path.first) moves.push(toSan(h, u));
    let userMoves = 0;
    // count user moves already in the deviation path
    for (let i = 1; i < path.first.length; i += 2) userMoves++;
    while (userMoves < EXTRA_USER_MOVES && !h.isGameOver()) {
      const r = await bestMove(eng, h.fen());
      const mover = h.turn();
      moves.push(toSan(h, r.uci));
      if (mover === op.side) userMoves++;
      if (userMoves >= EXTRA_USER_MOVES) break;
    }
    const ev = await bestMove(eng, h.fen());
    const whiteCp = h.turn() === 'w' ? ev.cp : -ev.cp;
    const devIdx = core.length;
    const n = Math.floor(devIdx / 2) + 1;
    const label = `${n}${devIdx % 2 === 0 ? '.' : '…'} ${moves[devIdx]}` + (path.first.length > 1 ? ` · ${Math.floor((devIdx + 2) / 2) + 1}${(devIdx + 2) % 2 === 0 ? '.' : '…'} ${moves[devIdx + 2]}` : '');
    levels.push({ level: L, elo: LEVEL_ELO[L - 1], moves, label, evalCp: Math.max(-2000, Math.min(2000, whiteCp)) });
  }
  levels.sort((a, b) => a.level - b.level);
  return { ...op, coreLen: core.length, levels };
}

const eng = new Uci();
await eng.init();
const out = [];
const only = process.argv[2];
const t0 = Date.now();
for (const op of CATALOG) {
  if (only && op.id !== only) continue;
  const o = await buildOpening(eng, op);
  out.push(o);
  console.log(`${op.id.padEnd(16)} ${o.levels.map((l) => l.label.split(' ').slice(1).join(' ')).join(' | ')}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
eng.quit();
if (!only) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ version: 1, levelElo: LEVEL_ELO, openings: out }));
  console.log('wrote', OUT, out.length, 'openings');
}
