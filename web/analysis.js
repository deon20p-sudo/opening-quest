// Move grading, plain-English explanations, accuracy and full-game analysis.
import { Chess } from './vendor/chess.mjs';
import { scoreOf } from './uci.js';

export const PIECE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Lichess win% from a score (side's own view). Mate scores saturate. */
export function winPct(score) {
  if (score >= 90000) return 100;
  if (score <= -90000) return 0;
  const c = Math.max(-1000, Math.min(1000, score));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

export const GRADES = {
  brilliant: { label: 'Brilliant', icon: '!!', color: '#6fb7b0' },
  best: { label: 'Best', icon: '★', color: '#8fbf8a' },
  excellent: { label: 'Excellent', icon: '!', color: '#8fbf8a' },
  good: { label: 'Good', icon: '✓', color: '#a7b98a' },
  book: { label: 'Book', icon: '≡', color: '#b89a6a' },
  inaccuracy: { label: 'Inaccuracy', icon: '?!', color: '#d6b25e' },
  mistake: { label: 'Mistake', icon: '?', color: '#d48a4e' },
  blunder: { label: 'Blunder', icon: '??', color: '#cf5c55' },
  miss: { label: 'Missed win', icon: '✗', color: '#cf6f55' },
};

/**
 * Grade a move. before/after are scores from the MOVER's point of view
 * (before = best achievable, after = what the played move leads to).
 */
export function gradeMove(before, after, playedBest) {
  const loss = winPct(before) - winPct(after);
  if (playedBest || loss <= 0.5) return { key: 'best', loss: Math.max(0, loss) };
  if (before >= 90000 && after < 90000 && after < 500) return { key: 'miss', loss };
  if (loss >= 25) return { key: 'blunder', loss };
  if (loss >= 12) return { key: 'mistake', loss };
  if (loss >= 6) return { key: 'inaccuracy', loss };
  if (loss <= 2) return { key: 'excellent', loss };
  return { key: 'good', loss };
}

/** Accuracy of a single move from the win% it threw away (Lichess-style). */
export function moveAccuracy(loss) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, loss)) - 3.1669));
}

function material(g, color) {
  let s = 0;
  for (const row of g.board()) for (const p of row) if (p) s += (p.color === color ? 1 : -1) * VALUE[p.type];
  return s;
}

function playUci(g, uci) {
  try { return g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
}

export function sanOf(fen, uci) {
  const g = new Chess(fen);
  const m = playUci(g, uci);
  return m ? m.san : uci;
}

export function pvSan(fen, pv, max = 8) {
  const g = new Chess(fen);
  const out = [];
  for (const u of (pv || []).slice(0, max)) { const m = playUci(g, u); if (!m) break; out.push(m.san); }
  return out;
}

/** Why common quiet pawn moves are played (from either side's point of view). */
function pawnPurpose(m) {
  const w = m.color === 'w';
  const rel = w ? m.to : m.to[0] + (9 - +m.to[1]);   // mirror Black's moves onto White's ranks
  const fwd = (f, r) => f + (w ? r : 9 - r);
  switch (rel) {
    case 'e3': return `opens a path for the king's bishop and prepares ${fwd('d', 4)}`;
    case 'd3': return `supports ${fwd('e', 4)} and opens a diagonal for the queen's bishop`;
    case 'c3': return `prepares ${fwd('d', 4)} to build a full pawn centre`;
    case 'f3': return `supports ${fwd('e', 4)}, though it takes the knight's best square`;
    case 'a3': return `keeps enemy pieces off ${fwd('b', 4)}`;
    case 'h3': return `stops a piece from settling on ${fwd('g', 4)}`;
    case 'a4': return 'grabs space on the queenside and stops a queenside pawn advance';
    case 'h4': return 'starts a kingside pawn advance';
    case 'b4': return 'expands on the queenside';
    case 'g4': return 'lunges forward on the kingside to gain space';
    default: return null;
  }
}

/** Short description of what a move does (used in lessons and tips). */
export function describeMove(fen, mv) {
  const g = new Chess(fen);
  const m = typeof mv === 'string' ? (mv.length >= 4 && /^[a-h][1-8][a-h][1-8]/.test(mv) ? playUci(g, mv) : g.move(mv)) : g.move(mv);
  if (!m) return '';
  const name = PIECE[m.piece];
  const center = ['d4', 'e4', 'd5', 'e5'];
  const bits = [];
  if (m.san.startsWith('O-O')) bits.push(m.san === 'O-O' ? 'castles kingside to tuck the king away and bring the rook into play' : 'castles queenside, putting the rook on the central d-file');
  else if (m.captured) bits.push(`captures the ${PIECE[m.captured]} on ${m.to}`);
  else if (m.piece === 'p' && center.includes(m.to)) bits.push(`grabs space in the centre with a pawn on ${m.to}`);
  else if (m.piece === 'p' && ['c4', 'c5', 'f4', 'f5'].includes(m.to)) bits.push(`challenges the centre from the side`);
  else if (m.piece === 'p' && ['g3', 'g6', 'b3', 'b6'].includes(m.to)) bits.push('prepares a fianchetto for the bishop');
  else if (m.piece === 'p' && pawnPurpose(m)) bits.push(pawnPurpose(m));
  else if ((m.piece === 'n' || m.piece === 'b') && (m.from[1] === '1' || m.from[1] === '8')) bits.push(`develops the ${name} to ${m.to}`);
  else if (m.piece === 'q' && g.history().length < 12) bits.push('brings the queen out');
  else bits.push(`moves the ${name} to ${m.to}`);
  if (m.san.includes('#')) bits.push('and it is checkmate!');
  else if (m.san.includes('+')) bits.push('with check');
  // What does the piece now hit?
  const targets = [];
  for (const sq of center) {
    const p = g.get(sq);
    if (g.attackers(sq, m.color).some((s) => s === m.to) && !p) targets.push(sq);
  }
  if (targets.length && !m.captured && m.piece !== 'p' && !m.san.startsWith('O-O')) bits.push(`and controls ${targets.join(' and ')}`);
  return bits.join(' ');
}

/**
 * Explain a played move in plain English.
 * ctx: { fen (before), uci (played), bestUci, bestPv, before, after, replyPv (best line after the move), grade }
 */
export function explain(ctx) {
  const g0 = new Chess(ctx.fen);
  const mover = g0.turn();
  const played = playUci(new Chess(ctx.fen), ctx.uci);
  const bestSan = ctx.bestUci ? sanOf(ctx.fen, ctx.bestUci) : null;
  const playedSan = played ? played.san : ctx.uci;
  const key = ctx.grade.key;
  if (key === 'best' || key === 'excellent') {
    return key === 'best' ? `${playedSan} is the best move here.` : `${playedSan} is an excellent move — almost as good as the engine's top choice.`;
  }
  const out = [];
  // Mates
  if (ctx.after <= -90000) {
    const n = Math.max(1, Math.round((100000 + ctx.after)));
    out.push(`This allows checkmate${n > 1 ? ` in ${Math.ceil(n / 1)}` : ''}.`);
  } else if (ctx.before >= 90000 && ctx.after < 90000) {
    out.push(`There was a forced checkmate with ${bestSan}.`);
  }
  // Material lost along the opponent's best reply line.
  if (ctx.replyPv && ctx.replyPv.length && !out.length) {
    const g = new Chess(ctx.fen);
    playUci(g, ctx.uci);
    const start = material(g, mover);
    let firstCapture = null;
    for (const u of ctx.replyPv.slice(0, 5)) {
      const m = playUci(g, u);
      if (!m) break;
      if (!firstCapture && m.captured && m.color !== mover) firstCapture = m;
    }
    const lost = start - material(g, mover);
    if (lost >= 2 && firstCapture) out.push(`After ${firstCapture.san}, the ${PIECE[firstCapture.captured]} on ${firstCapture.to} is lost.`);
    else if (lost >= 2) out.push('This loses material by force.');
  }
  // Hanging piece left on its new square.
  if (played && !out.length) {
    const g = new Chess(ctx.fen);
    playUci(g, ctx.uci);
    const opp = mover === 'w' ? 'b' : 'w';
    if (played.piece !== 'k' && g.isAttacked(played.to, opp) && !g.isAttacked(played.to, mover) && VALUE[played.piece] >= 3) {
      out.push(`The ${PIECE[played.piece]} on ${played.to} is left undefended.`);
    }
  }
  // Missed gain with the best move.
  if (ctx.bestPv && ctx.bestPv.length && bestSan && bestSan !== playedSan) {
    const g = new Chess(ctx.fen);
    const start = material(g, mover);
    for (const u of ctx.bestPv.slice(0, 5)) if (!playUci(g, u)) break;
    const gain = material(g, mover) - start;
    if (gain >= 2) out.push(`${bestSan} would have won material.`);
  }
  // Opening principles in the first moves.
  const moveNo = Math.floor(g0.history().length / 2);
  if (played && !out.length && g0.moveNumber() <= 10) {
    if (played.piece === 'q') out.push('Bringing the queen out early lets your opponent gain time by attacking it.');
    else if (played.piece === 'k' && !played.san.startsWith('O-O')) out.push('Moving the king gives up castling — keep it safe instead.');
    else if (['a', 'h'].includes(played.to[0]) && played.piece === 'n') out.push('A knight on the rim is dim: it controls fewer squares there.');
    else if (played.piece === 'p' && ['f3', 'f6', 'g4', 'g5', 'h4', 'h5', 'a4', 'a5'].includes(played.to)) out.push('Pawn moves on the wing don\'t help your development.');
  }
  void moveNo;
  if (bestSan && bestSan !== playedSan) {
    const why = describeMove(ctx.fen, ctx.bestUci);
    out.push(`Better was ${bestSan}${why ? ', which ' + why : ''}.`);
  }
  return out.join(' ');
}

/**
 * Analyse a whole game. moves: SAN list from `startFen`.
 * Returns { positions:[{fen, score, best, pv}], moves:[{san, uci, color, grade, before, after, acc, text}], accuracy:{w,b}, counts }
 */
export async function analyseGame(client, moves, { startFen, depth = 12, onProgress, bookPlies = 0 } = {}) {
  const g = new Chess(startFen);
  const fens = [g.fen()];
  const verbose = [];
  for (const san of moves) {
    const m = g.move(san);
    if (!m) break;
    verbose.push(m);
    fens.push(g.fen());
  }
  const positions = [];
  for (let i = 0; i < fens.length; i++) {
    const pos = new Chess(fens[i]);
    if (pos.isCheckmate()) positions.push({ fen: fens[i], score: -100000, best: null, pv: [] });
    else if (pos.isGameOver()) positions.push({ fen: fens[i], score: 0, best: null, pv: [] });
    else {
      const r = await client.analyse(fens[i], { depth });
      if (!r) return null; // cancelled
      const l = r.lines[0];
      positions.push({ fen: fens[i], score: scoreOf(l), best: r.bestmove, pv: l ? l.pv : [] });
    }
    if (onProgress) onProgress((i + 1) / fens.length);
  }
  const out = [];
  const acc = { w: [], b: [] };
  const counts = { w: {}, b: {} };
  for (let i = 0; i < verbose.length; i++) {
    const m = verbose[i];
    const uci = m.from + m.to + (m.promotion || '');
    const before = positions[i].score;
    const after = -positions[i + 1].score;
    let grade = gradeMove(before, after, positions[i].best === uci);
    if (i < bookPlies && grade.key !== 'blunder' && grade.key !== 'mistake') grade = { key: 'book', loss: grade.loss };
    const text = explain({ fen: fens[i], uci, bestUci: positions[i].best, bestPv: positions[i].pv, before, after, replyPv: positions[i + 1].pv, grade });
    const a = moveAccuracy(grade.loss);
    acc[m.color].push(a);
    counts[m.color][grade.key] = (counts[m.color][grade.key] || 0) + 1;
    out.push({ san: m.san, uci, color: m.color, from: m.from, to: m.to, grade, before, after, acc: a, text, best: positions[i].best, bestSan: positions[i].best ? sanOf(fens[i], positions[i].best) : null });
  }
  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  return { fens, positions, moves: out, accuracy: { w: avg(acc.w), b: avg(acc.b) }, counts };
}
