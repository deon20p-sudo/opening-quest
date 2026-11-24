// Import games from Chess.com's public API (no login needed) and parse PGNs.
import { Chess } from './vendor/chess.mjs';

const API = 'https://api.chess.com/pub/player/';

/** Most recent games of a Chess.com user (newest first). */
export async function fetchRecentGames(username, { months = 2, signal } = {}) {
  const user = encodeURIComponent(username.trim().toLowerCase());
  if (!user) throw new Error('Enter your Chess.com username.');
  const r = await fetch(`${API}${user}/games/archives`, { signal });
  if (r.status === 404) throw new Error(`No Chess.com player called "${username}".`);
  if (!r.ok) throw new Error(`Chess.com said ${r.status}. Try again in a minute.`);
  const { archives = [] } = await r.json();
  if (!archives.length) return [];
  const games = [];
  for (const url of archives.slice(-months).reverse()) {
    const a = await fetch(url, { signal });
    if (!a.ok) continue;
    const { games: g = [] } = await a.json();
    games.push(...g.reverse());
  }
  return games
    .filter((g) => g.pgn && (!g.rules || g.rules === 'chess'))
    .map((g) => summarise(g, username))
    .filter(Boolean);
}

function summarise(g, username) {
  const me = username.trim().toLowerCase();
  const white = g.white || {}, black = g.black || {};
  const myColor = (white.username || '').toLowerCase() === me ? 'w' : 'b';
  const mine = myColor === 'w' ? white : black;
  const opp = myColor === 'w' ? black : white;
  const res = mine.result === 'win' ? 'win' : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(mine.result) ? 'draw' : 'loss';
  return {
    id: g.url || g.uuid || String(g.end_time),
    url: g.url,
    pgn: g.pgn,
    myColor,
    opponent: opp.username || '?',
    opponentRating: opp.rating,
    myRating: mine.rating,
    result: res,
    timeClass: g.time_class,
    end: g.end_time ? new Date(g.end_time * 1000) : null,
    opening: openingName(g),
  };
}

function openingName(g) {
  const m = /\[ECOUrl "[^"]*\/openings\/([^"]+)"\]/.exec(g.pgn || '');
  if (!m) return '';
  return decodeURIComponent(m[1]).replace(/\.\.\..*$/, '').replace(/-/g, ' ').replace(/\s+\d.*$/, '').trim().slice(0, 48);
}

/** Parse a PGN into { moves (SAN), headers, startFen }. Throws on garbage. */
export function parsePgn(pgn) {
  const g = new Chess();
  try {
    g.loadPgn(pgn.trim());
  } catch (e) {
    throw new Error('That PGN could not be read. Paste the full game text including the moves.');
  }
  const headers = g.getHeaders ? g.getHeaders() : g.header();
  const moves = g.history();
  if (!moves.length) throw new Error('That PGN has no moves.');
  return { moves, headers, startFen: headers.FEN || undefined };
}
