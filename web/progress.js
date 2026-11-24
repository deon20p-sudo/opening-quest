// Player progress, XP, ranks, opening mastery and achievements (saved on the phone).

const KEY = 'oq.progress.v1';

export const MILESTONES = [
  { level: 3, title: 'Strong Beginner', stars: 1, icon: 'star' },
  { level: 5, title: 'Intermediate', stars: 2, icon: 'star' },
  { level: 8, title: 'Advanced', stars: 3, icon: 'star' },
  { level: 10, title: 'Master', stars: 4, icon: 'crown' },
];

export const RANKS = [
  { xp: 0, title: 'Pawn', icon: '♟' },
  { xp: 300, title: 'Knight', icon: '♞' },
  { xp: 900, title: 'Bishop', icon: '♝' },
  { xp: 2000, title: 'Rook', icon: '♜' },
  { xp: 4000, title: 'Queen', icon: '♛' },
  { xp: 8000, title: 'King', icon: '♚' },
  { xp: 15000, title: 'Grandmaster', icon: '♚' },
];

function fresh() {
  return {
    name: 'Player', avatar: '', xp: 0, rating: 800,
    openings: {},            // id -> { lesson: bool, perfectLesson: bool, levels: { [n]: { stars, wins } }, best: n }
    bots: {},                // id -> { wins, losses, draws }
    games: [],               // recent games played in the app (pgn-ish) for review
    achievements: {},        // id -> timestamp
    stats: { lessons: 0, levelWins: 0, botWins: 0, games: 0, analyzed: 0, imported: 0, noHelpWins: 0, quickWins: 0, comebacks: 0 },
    streak: { days: 0, last: null },
    settings: { sound: true, vibrate: true, board: 'green', assistArrows: true, assistEval: true, assistCoach: true, liveAnalysis: true, hints: true, confirmMove: false, premove: false, animation: 'normal', appearance: 'dark', arrowHold: 'medium' },
  };
}

export const P = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') {
      const base = fresh();
      return { ...base, ...s, stats: { ...base.stats, ...s.stats }, settings: { ...base.settings, ...s.settings }, streak: { ...base.streak, ...s.streak } };
    }
  } catch { /* fall through */ }
  return fresh();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* storage full or blocked */ }
}

export function resetAll() {
  const f = fresh();
  for (const k of Object.keys(P)) delete P[k];
  Object.assign(P, f);
  save();
}

export function rankFor(xp = P.xp) {
  let r = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xp) { r = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  const pct = next ? (xp - r.xp) / (next.xp - r.xp) : 1;
  return { ...r, next, pct };
}

export function openingProgress(id) {
  if (!P.openings[id]) P.openings[id] = { lesson: false, perfectLesson: false, levels: {}, best: 0 };
  return P.openings[id];
}

/** Highest level beaten (0..10) and the mastery title reached. */
export function mastery(id) {
  const o = P.openings[id];
  const best = o ? o.best : 0;
  let title = null;
  for (const m of MILESTONES) if (best >= m.level) title = m;
  return { best, title };
}

export function isLevelUnlocked(id, level) {
  const o = openingProgress(id);
  if (level === 1) return true;
  return o.best >= level - 1;
}

/** Daily streak: call once per meaningful activity. */
export function touchStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (P.streak.last === today) return;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  P.streak.days = P.streak.last === y ? P.streak.days + 1 : 1;
  P.streak.last = today;
}

/** Simple Elo update of the player's rating after a bot game. score: 1 win, 0.5 draw, 0 loss. */
export function updateRating(botElo, score) {
  const exp = 1 / (1 + 10 ** ((botElo - P.rating) / 400));
  const k = P.stats.games < 10 ? 40 : 24;
  P.rating = Math.max(100, Math.round(P.rating + k * (score - exp)));
}

// ---------------- achievements ----------------
export const ACHIEVEMENTS = [
  { id: 'first_lesson', icon: 'book', name: 'First Steps', desc: 'Finish your first opening lesson.', test: () => P.stats.lessons >= 1 },
  { id: 'lessons_10', icon: 'layers', name: 'Bookworm', desc: 'Finish 10 opening lessons.', test: () => P.stats.lessons >= 10 },
  { id: 'lessons_all', icon: 'book', name: 'Encyclopedia', desc: 'Finish the lesson of every opening.', test: (ctx) => ctx.total && Object.values(P.openings).filter((o) => o.lesson).length >= ctx.total },
  { id: 'perfect_lesson', icon: 'target', name: 'Flawless', desc: 'Finish a lesson without a single wrong move.', test: () => Object.values(P.openings).some((o) => o.perfectLesson) },
  { id: 'first_level', icon: 'medal', name: 'Level Up', desc: 'Beat level 1 of any opening.', test: () => P.stats.levelWins >= 1 },
  { id: 'strong_beginner', icon: 'star', name: 'Strong Beginner', desc: 'Reach level 3 in an opening.', test: () => bestAny() >= 3 },
  { id: 'intermediate', icon: 'star', name: 'Intermediate', desc: 'Reach level 5 in an opening.', test: () => bestAny() >= 5 },
  { id: 'advanced', icon: 'star', name: 'Advanced', desc: 'Reach level 8 in an opening.', test: () => bestAny() >= 8 },
  { id: 'master', icon: 'crown', name: 'Opening Master', desc: 'Beat all 10 levels of an opening.', test: () => bestAny() >= 10 },
  { id: 'master_3', icon: 'trophy', name: 'Grand Repertoire', desc: 'Master 3 different openings.', test: () => Object.values(P.openings).filter((o) => o.best >= 10).length >= 3 },
  { id: 'both_sides', icon: 'scales', name: 'Both Sides', desc: 'Reach level 3 with a White and a Black opening.', test: (ctx) => ctx.sideBest && ctx.sideBest('w') >= 3 && ctx.sideBest('b') >= 3 },
  { id: 'explorer', icon: 'compass', name: 'Explorer', desc: 'Try 10 different openings.', test: () => Object.values(P.openings).filter((o) => o.lesson || o.best > 0).length >= 10 },
  { id: 'three_stars', icon: 'star', name: 'Perfectionist', desc: 'Get 3 stars on a level.', test: () => Object.values(P.openings).some((o) => Object.values(o.levels).some((l) => l.stars >= 3)) },
  { id: 'first_win', icon: 'trophy', name: 'First Victory', desc: 'Beat any bot.', test: () => P.stats.botWins + P.stats.levelWins >= 1 },
  { id: 'bot_hunter', icon: 'target', name: 'Bot Hunter', desc: 'Beat 5 different bots.', test: () => Object.values(P.bots).filter((b) => b.wins > 0).length >= 5 },
  { id: 'beat_all', icon: 'shield', name: 'Unstoppable', desc: 'Beat every bot at its own rating.', test: (ctx) => ctx.botCount && Object.values(P.bots).filter((b) => b.winsAtRating > 0).length >= ctx.botCount },
  { id: 'giant_slayer', icon: 'sword', name: 'Giant Slayer', desc: 'Beat a bot rated 1800 or more.', test: () => Object.values(P.bots).some((b) => (b.bestWinElo || 0) >= 1800) },
  { id: 'no_help', icon: 'eyeoff', name: 'No Training Wheels', desc: 'Win a game with all help turned off.', test: () => P.stats.noHelpWins >= 1 },
  { id: 'quick_win', icon: 'bolt', name: 'Lightning Strike', desc: 'Win in 20 moves or fewer.', test: () => P.stats.quickWins >= 1 },
  { id: 'comeback', icon: 'flame', name: 'Comeback Kid', desc: 'Win after being down 3 or more points.', test: () => P.stats.comebacks >= 1 },
  { id: 'analyst', icon: 'search', name: 'Analyst', desc: 'Analyse your first game.', test: () => P.stats.analyzed >= 1 },
  { id: 'analyst_10', icon: 'layers', name: 'Deep Thinker', desc: 'Analyse 10 games.', test: () => P.stats.analyzed >= 10 },
  { id: 'importer', icon: 'download', name: 'Connected', desc: 'Import a game from Chess.com.', test: () => P.stats.imported >= 1 },
  { id: 'streak_3', icon: 'calendar', name: 'On a Roll', desc: 'Play 3 days in a row.', test: () => P.streak.days >= 3 },
  { id: 'streak_7', icon: 'calendar', name: 'Week Warrior', desc: 'Play 7 days in a row.', test: () => P.streak.days >= 7 },
  { id: 'rank_rook', icon: 'shield', name: 'Rook Rank', desc: 'Reach the Rook rank (2,000 XP).', test: () => P.xp >= 2000 },
  { id: 'rating_1200', icon: 'chart', name: 'Climbing', desc: 'Reach a 1200 rating.', test: () => P.rating >= 1200 },
];

function bestAny() { return Math.max(0, ...Object.values(P.openings).map((o) => o.best || 0)); }

/** Returns newly unlocked achievements (and records them). */
export function checkAchievements(ctx = {}) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (P.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.test(ctx); } catch { ok = false; }
    if (ok) { P.achievements[a.id] = Date.now(); unlocked.push(a); }
  }
  if (unlocked.length) save();
  return unlocked;
}

export function addXp(n) { P.xp += Math.round(n); save(); }
