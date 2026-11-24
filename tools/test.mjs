// Node tests: opening data, bots, dialogue, analysis and bot strength (with real Stockfish).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Chess } from '../web/vendor/chess.mjs';
import { UciClient } from '../web/uci.js';
import { chooseMove, botSettings } from '../web/bot.js';
import { BOTS, LEVEL_BOTS, say, botById } from '../web/bots.js';
import { gradeMove, explain, describeMove, analyseGame, winPct, moveAccuracy } from '../web/analysis.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, '..', 'web', 'data', 'openings.json'), 'utf8'));
let failures = 0;
const check = (name, fn) => { try { fn(); console.log('  ok  ', name); } catch (e) { failures++; console.log('  FAIL', name, '—', e.message); } };

console.log('Opening data');
check(`${data.openings.length} openings, 10 levels each`, () => {
  assert.ok(data.openings.length >= 40);
  for (const o of data.openings) assert.equal(o.levels.length, 10, o.id);
});
check('every level line is legal and starts with the core', () => {
  for (const o of data.openings) {
    const core = o.core.split(' ');
    for (const lv of o.levels) {
      const g = new Chess();
      for (const san of lv.moves) assert.ok(g.move(san), `${o.id} L${lv.level}: illegal ${san}`);
      assert.deepEqual(lv.moves.slice(0, core.length), core, `${o.id} L${lv.level} core`);
      assert.ok(lv.moves.length > core.length + 2, `${o.id} L${lv.level} too short`);
    }
  }
});
check('each line ends on the user\'s move (so the bot game starts with the bot to move)', () => {
  for (const o of data.openings) for (const lv of o.levels) {
    const g = new Chess();
    lv.moves.forEach((m) => g.move(m));
    const last = g.history({ verbose: true }).at(-1);
    assert.equal(last.color, o.side, `${o.id} L${lv.level}`);
  }
});
check('levels use different bot variations (at least 8 distinct of 10 per opening)', () => {
  for (const o of data.openings) {
    const distinct = new Set(o.levels.map((l) => l.moves.slice(o.coreLen, o.coreLen + 3).join(' ')));
    assert.ok(distinct.size >= 8, `${o.id}: only ${distinct.size} distinct`);
  }
});
check('level ratings rise from 400 to 2200', () => {
  for (const o of data.openings) o.levels.forEach((l, i) => assert.equal(l.elo, data.levelElo[i]));
  assert.equal(data.levelElo[0], 400); assert.equal(data.levelElo[9], 2200);
});
check('the user is never left clearly losing at the end of a book line', () => {
  for (const o of data.openings) for (const lv of o.levels) {
    const userCp = o.side === 'w' ? lv.evalCp : -lv.evalCp;
    assert.ok(userCp > (o.family === 'Gambits' ? -250 : -150), `${o.id} L${lv.level}: ${userCp}`);
  }
});

console.log('Bots & dialogue');
const EVENTS = ['intro', 'userBest', 'userGood', 'userInaccuracy', 'userMistake', 'userBlunder', 'userCapture', 'botCapture', 'userCheck', 'botCheck', 'botWinning', 'botLosing', 'userWin', 'userLose', 'draw', 'takeback'];
check(`${BOTS.length} bots each have lines for every event`, () => {
  for (const b of BOTS) for (const e of EVENTS) assert.ok((b.lines[e] || []).length, `${b.id} missing ${e}`);
});
check('level bots exist', () => { assert.equal(LEVEL_BOTS.length, 10); LEVEL_BOTS.forEach((id) => assert.equal(botById(id).id, id)); });
check('help lines are hidden when help is off', () => {
  for (const b of BOTS) for (let i = 0; i < 20; i++) {
    const t = say(b, 'userMistake', { move: 'Nf3', best: 'e4', reason: 'It hangs.' }, { help: false });
    if (t) assert.ok(!t.includes('e4') || t.includes('Nf3'), `${b.id}: "${t}"`);
  }
});
check('no unfilled {placeholders} in spoken lines', () => {
  for (const b of BOTS) for (const e of EVENTS) for (let i = 0; i < 10; i++) {
    const t = say(b, e, { move: 'Nf3', best: 'e4', reason: 'Because.', name: 'Sam', botmove: 'Qh5' });
    if (t) assert.ok(!/\{\w+\}/.test(t), `${b.id}/${e}: ${t}`);
  }
});

console.log('Analysis helpers');
check('win% and accuracy behave', () => {
  assert.equal(winPct(0), 50); assert.ok(winPct(300) > 70); assert.equal(winPct(100000 - 3), 100);
  assert.ok(moveAccuracy(0) > 99); assert.ok(moveAccuracy(40) < 25);
});
check('grades', () => {
  assert.equal(gradeMove(50, 40, false).key, 'excellent');
  assert.equal(gradeMove(50, -400, false).key, 'blunder');
  assert.equal(gradeMove(100000 - 2, 300, false).key, 'miss');
  assert.equal(gradeMove(50, -400, true).key, 'best');
});
check('describeMove', () => {
  const s = describeMove(new Chess().fen(), 'e4');
  assert.match(s, /centre/);
  assert.match(describeMove('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'Bc4'), /develops the bishop/);
});
check('explain: hanging bishop is detected', () => {
  const fen = 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  const t = explain({ fen, uci: 'f1a6', bestUci: 'b1c3', bestPv: ['b1c3'], before: 30, after: -300, replyPv: ['b8a6', 'd2d4'], grade: { key: 'blunder' } });
  assert.match(t, /bishop on a6/);
  assert.match(t, /Better was Nc3/);
});

// ---------- engine-backed tests ----------
function nodeTransport() {
  const p = spawn(process.execPath, [path.join(here, '..', 'web', 'vendor', 'stockfish-17.1-lite-single.js')], { stdio: ['pipe', 'pipe', 'inherit'] });
  let cb = () => {}, buf = '';
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) cb(l); } });
  return { send: (s) => p.stdin.write(s + '\n'), onLine: (f) => { cb = f; }, close: () => p.kill() };
}
const eng = new UciClient(null, nodeTransport());
await eng.ready;
console.log('Engine-backed');

const mateFen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
{
  const r = await eng.analyse(mateFen, { depth: 10 });
  check('engine finds Qxf7#', () => assert.equal(r.bestmove, 'h5f7'));
}
{
  // cancel drops queued jobs and resolves them with null
  const a = eng.analyse(new Chess().fen(), { depth: 22 });
  const b = eng.analyse(mateFen, { depth: 10 });
  eng.cancel();
  const [ra, rb] = await Promise.all([a, b]);
  check('cancel() resolves pending jobs with null', () => { assert.equal(ra, null); assert.equal(rb, null); });
  const rc = await eng.analyse(mateFen, { depth: 8 });
  check('engine still works after cancel', () => assert.equal(rc.bestmove, 'h5f7'));
}
{
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const start = new Chess().fen();
  const legal = new Chess().moves({ verbose: true }).map((m) => m.from + m.to);
  const weak = new Set(), strong = new Set();
  for (let i = 0; i < 12; i++) weak.add(await chooseMove(eng, start, 400, legal, rnd));
  for (let i = 0; i < 4; i++) strong.add(await chooseMove(eng, mateFen, 2200, legal, rnd));
  check('400-rated bot varies its moves', () => assert.ok(weak.size >= 4, [...weak].join(',')));
  check('even a 400 bot plays mate in one', async () => {});
  const m1 = await chooseMove(eng, mateFen, 400, null, () => 0.99);
  check('400 bot takes mate in one', () => assert.equal(m1, 'h5f7'));
  check('2200 bot plays the mate', () => assert.ok(strong.has('h5f7')));
  check('rating settings', () => { assert.equal(botSettings(1500).mode, 'limit'); assert.equal(botSettings(800).mode, 'soft'); });
}
{
  check('curated main lines are legal and end on the user move', () => {
    for (const o of data.openings.filter((x) => x.main)) {
      const g = new Chess(); o.main.forEach((m) => assert.ok(g.move(m), o.id + ' ' + m));
      assert.equal(g.history({ verbose: true }).at(-1).color, o.side, o.id);
    }
  });
  // a short game with a clear blunder: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#
  const res = await analyseGame(eng, ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'], { depth: 10 });
  const nf6 = res.moves[5];
  check('analyseGame flags ...Nf6 as a blunder that allows mate', () => { assert.equal(nf6.grade.key, 'blunder'); assert.match(nf6.text, /checkmate/i); });
  check('analyseGame: final mate is best', () => assert.equal(res.moves[6].grade.key, 'best'));
  check('accuracy computed for both sides', () => { assert.ok(res.accuracy.w > res.accuracy.b); });
}
eng.quit();
console.log(failures ? `\n${failures} FAILED` : '\nALL TESTS PASSED');
process.exit(failures ? 1 : 0);
