// Chooses bot moves at a target rating.
// 1000+ uses Stockfish's own rating limiter (boosted, see below). Below that, Stockfish
// searches a few moves deep and the bot picks among its top moves with a "temperature",
// so it makes human-like slips that get rarer as the rating rises.
import { scoreOf } from './uci.js';

export const MIN_ELO = 400;
export const MAX_ELO = 3200;      // the top of the slider = Stockfish at full strength
export const FULL_STRENGTH = 3200;

// Stockfish's UCI_Elo is calibrated for long games; with the short thinking time a phone
// gives it, it plays far below the number. So the engine is set ~600 points above the
// rating shown and thinks longer. At the top of the slider it plays at full strength.
export const ELO_BOOST = 600;

export function botSettings(elo) {
  elo = Math.max(MIN_ELO, Math.min(MAX_ELO, elo));
  if (elo >= FULL_STRENGTH) {
    return { mode: 'limit', options: { UCI_LimitStrength: 'false' }, movetime: 2500 };
  }
  if (elo >= 1000) {
    const engineElo = Math.min(3190, Math.max(1320, Math.round(elo + ELO_BOOST)));
    return { mode: 'limit', options: { UCI_LimitStrength: 'true', UCI_Elo: engineElo }, movetime: Math.round(600 + (elo - 1000) * 0.8) };
  }
  const depth = elo < 600 ? 3 : elo < 800 ? 5 : 7;
  const temperature = 12 + (1000 - elo) * 0.17;   // centipawns: 400 → ~114, 600 → ~80, 800 → ~46
  const blunder = Math.max(0, (700 - elo) / 5000); // 400 → 6%, 600 → 2%, 700+ → none
  return { mode: 'soft', options: { UCI_LimitStrength: 'false' }, depth, multipv: 6, temperature, blunder };
}

/** Pick a move (uci) for `fen` at `elo`. rnd() can be injected for tests. */
export async function chooseMove(client, fen, elo, legalUcis, rnd = Math.random) {
  const s = botSettings(elo);
  if (s.mode === 'limit') {
    const r = await client.analyse(fen, { movetime: s.movetime, multipv: 1, options: s.options });
    return r && r.bestmove;
  }
  if (legalUcis && legalUcis.length && rnd() < s.blunder) {
    return legalUcis[Math.floor(rnd() * legalUcis.length)];
  }
  const r = await client.analyse(fen, { depth: s.depth, multipv: s.multipv, options: s.options });
  if (!r) return null;
  const lines = r.lines.filter((l) => l.pv && l.pv[0]);
  if (!lines.length) return r.bestmove;
  // Never miss a short forced mate (mate in 1–3).
  if (lines[0].mate != null && lines[0].mate > 0 && lines[0].mate <= 3) return lines[0].pv[0];
  const best = scoreOf(lines[0]);
  const weights = lines.map((l) => Math.exp(-(best - Math.max(scoreOf(l), best - 3000)) / s.temperature));
  const sum = weights.reduce((a, b) => a + b, 0);
  let x = rnd() * sum;
  for (let i = 0; i < lines.length; i++) { x -= weights[i]; if (x <= 0) return lines[i].pv[0]; }
  return lines[0].pv[0];
}
