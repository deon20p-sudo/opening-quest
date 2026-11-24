// The game screen: lessons, drills, level challenges and free play against bots.
import { Chess } from './vendor/chess.mjs';
import { Board } from './board.js';
import { chooseMove } from './bot.js';
import { say } from './bots.js';
import { gradeMove, explain, describeMove, winPct, sanOf, GRADES } from './analysis.js';
import { scoreOf } from './uci.js';
import { sfx, buzz } from './sfx.js';
import { themePicker } from './themes.js';
import { icon } from './icons.js';
import { P, save, addXp, openingProgress, checkAchievements, touchStreak, updateRating, MILESTONES } from './progress.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * cfg: { mode: 'lesson'|'drill'|'level'|'free', opening, level, line, userColor, bot, elo, assists:{arrows,eval,coach}, title }
 * env: { engines:{ bot, eval }, exit(), review(game), next(cfg), retry(), toast(a), confetti(), ctx }
 */
export function openGame(root, cfg, env) {
  const userColor = cfg.userColor;
  const botColor = userColor === 'w' ? 'b' : 'w';
  const assists = cfg.assists || { arrows: true, eval: true, coach: true };
  const help = assists.arrows || assists.coach;
  // Settings: live analysis after the opening, the Hint button, confirm-move and premoves.
  const live = P.settings.liveAnalysis !== false;
  const hintsOn = P.settings.hints !== false;
  const confirmOn = !!P.settings.confirmMove;
  const premoveOn = !!P.settings.premove;
  const bot = cfg.bot;
  const line = cfg.line || [];
  const S = {
    game: new Chess(),
    phase: line.length ? 'book' : 'play',
    over: false,
    token: 0,
    mistakes: 0,
    hearts: cfg.mode === 'level' ? 3 : Infinity,
    takebacks: 0,
    hints: 0,
    evals: new Map(),     // fen -> { score, best, pv }
    grades: [],           // per ply
    minEval: 0,
    saidWinning: false,
    saidLosing: false,
    drillMisses: 0,
  };

  // ---------- DOM ----------
  root.innerHTML = '';
  const wrap = h('div', 'game');
  const top = h('header', 'g-top');
  const backBtn = h('button', 'icon-btn', icon('back'));
  backBtn.setAttribute('aria-label', 'Leave');
  const title = h('div', 'g-title', `<b>${esc(cfg.title)}</b><small>${esc(cfg.subtitle || '')}</small>`);
  const hearts = h('div', 'g-hearts');
  const themeBtn = h('button', 'icon-btn', icon('palette'));
  themeBtn.setAttribute('aria-label', 'Board and pieces');
  themeBtn.onclick = () => openThemeSheet();
  top.append(backBtn, title, hearts, themeBtn);

  const botRow = h('div', 'g-bot');
  const avatar = h('img', 'portrait sm');
  avatar.src = bot.img;
  avatar.alt = '';
  const botInfo = h('div', 'g-botinfo', `<b>${esc(bot.name)}</b><span>${cfg.elo} · ${esc(bot.style)}</span>`);
  const bubble = h('div', 'bubble');
  botRow.append(avatar, botInfo, bubble);

  const evalBar = h('div', 'g-eval');
  const evalFill = h('div', 'g-eval-fill');
  const evalL = h('span', 'g-eval-l', 'You');
  const evalR = h('span', 'g-eval-r', 'Bot');
  evalBar.append(evalFill, evalL, evalR);
  if (!assists.eval) evalBar.classList.add('hidden-eval');

  const boardWrap = h('div', 'g-boardwrap');
  const info = h('div', 'g-info');
  const movesStrip = h('div', 'g-moves');
  const nav = h('div', 'g-nav');
  const navBtn = (ic, label, f) => { const b = h('button', 'nav-btn', icon(ic)); b.setAttribute('aria-label', label); b.onclick = () => { f(); }; nav.appendChild(b); return b; };
  const nFirst = navBtn('first', 'First move', () => viewPly(0));
  const nPrev = navBtn('prev', 'Previous move', () => viewPly(viewedPly() - 1));
  const nNext = navBtn('next', 'Next move', () => viewPly(viewedPly() + 1));
  const nLast = navBtn('last', 'Latest move', () => viewPly(Infinity));
  const controls = h('footer', 'g-controls');
  const mk = (ic, label, cls = '') => { const b = h('button', 'ctl ' + cls, `${icon(ic)}<small>${label}</small>`); controls.appendChild(b); return b; };
  const bBack = mk('undo', 'Back');
  const bHint = mk('bulb', 'Hint');
  const bFlip = mk('flip', 'Flip');
  const bResign = mk(cfg.mode === 'lesson' || cfg.mode === 'drill' ? 'restart' : 'flag', cfg.mode === 'lesson' || cfg.mode === 'drill' ? 'Restart' : 'Resign');
  if (!help && cfg.mode !== 'lesson') bHint.disabled = true;
  if (!hintsOn) { bHint.remove(); controls.classList.add('three'); }
  wrap.append(top, botRow, evalBar, boardWrap, info, movesStrip, nav, controls);
  root.appendChild(wrap);

  const board = new Board(boardWrap, { orientation: userColor === 'w' ? 'white' : 'black', onMove: (o, d) => userMove(o, d), premove: premoveOn });
  const analysing = () => S.phase === 'book' || live; // after the opening, only if live analysis is on

  // ---------- helpers ----------
  function lastMove() {
    const m = S.game.history({ verbose: true }).at(-1);
    return m ? [m.from, m.to] : undefined;
  }
  /** Free games against a bot are saved after every move, so you can leave and continue later. */
  function persist() {
    if (cfg.mode !== 'free') return;
    if (S.over) { if (P.savedGame) { P.savedGame = null; save(); } return; }
    const moves = S.game.history();
    if (!moves.length) return;
    P.savedGame = { botId: cfg.botId, elo: cfg.elo, userColor, assists, moves, savedAt: Date.now() };
    save();
  }
  function sync() {
    S.view = null;
    persist();
    board.set(S.game, { lastMove: lastMove(), movable: !S.over && !S.busy && !S.confirming, userColor, premove: premoveOn && S.phase === 'play' && !S.over && !S.confirming });
    renderMoves();
    renderHearts();
  }
  function renderHearts() {
    if (cfg.mode !== 'level') { hearts.innerHTML = ''; return; }
    hearts.innerHTML = S.phase === 'book' ? '<label>Lives</label>' + [0, 1, 2].map((i) => `<span class="${i < S.hearts ? 'on' : ''}"></span>`).join('') : '<span class="phase-tag">Win the game</span>';
  }
  function viewedPly() { return S.view == null ? S.game.history().length : S.view; }
  /** Look at an earlier position without changing the game (like the arrows in a chess.com game). */
  function viewPly(n) {
    const hist = S.game.history({ verbose: true });
    if (!hist.length) return;
    n = Math.max(0, Math.min(hist.length, n));
    if (n === viewedPly()) return;
    if (n === hist.length) { sync(); refreshEval(); sfx.move(); return; }
    S.view = n;
    const m = hist[n - 1];
    board.set(new Chess(m ? m.after : hist[0].before), { lastMove: m ? [m.from, m.to] : undefined, movable: false });
    board.arrows([]);
    board.clearBadges();
    if (m) sfx.play(m); else sfx.move();
    renderMoves();
  }
  function renderMoves() {
    const hist = S.game.history({ verbose: true });
    const curIdx = S.view == null ? hist.length - 1 : S.view - 1;
    movesStrip.innerHTML = '';
    hist.forEach((m, i) => {
      if (i % 2 === 0) movesStrip.appendChild(h('span', 'mv-no', `${i / 2 + 1}.`));
      const g = S.grades[i];
      const sp = h('span', 'mv' + (i === curIdx ? ' cur' : '') + (i < line.length ? ' book' : ''), esc(m.san));
      sp.onclick = () => viewPly(i + 1);
      if (g && (assists.coach || S.over) && ['blunder', 'mistake', 'inaccuracy', 'best', 'miss'].includes(g.key)) {
        const t = h('i', 'g-' + g.key, GRADES[g.key].icon);
        sp.appendChild(t);
      }
      movesStrip.appendChild(sp);
    });
    const cur = movesStrip.querySelector('.mv.cur');
    movesStrip.scrollLeft = cur && S.view != null ? cur.offsetLeft - movesStrip.clientWidth / 2 + cur.offsetWidth / 2 : movesStrip.scrollWidth;
    const at = viewedPly();
    nFirst.disabled = nPrev.disabled = at === 0;
    nNext.disabled = nLast.disabled = at >= hist.length;
    wrap.classList.toggle('viewing', S.view != null);
  }
  function openThemeSheet() {
    const bg = h('div', 'modal');
    const card = h('div', 'modal-card sheet-theme', '<h2>Board & pieces</h2>');
    card.appendChild(themePicker());
    const done = h('button', 'btn primary big', 'Done');
    done.onclick = () => bg.remove();
    bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
    card.appendChild(done);
    bg.appendChild(card);
    document.body.appendChild(bg);
  }
  let bubbleTimer = null;
  let bubblePrio = 0, bubbleAt = 0;
  function speak(text, { who = bot, mood = '', prio = 1 } = {}) {
    if (!text) return;
    // Don't let small talk (captures, checks) cut off a reaction to a blunder.
    if (prio < bubblePrio && performance.now() - bubbleAt < 3000) return;
    bubblePrio = prio; bubbleAt = performance.now();
    clearTimeout(bubbleTimer);
    bubble.className = 'bubble show ' + mood;
    bubble.textContent = '';
    let i = 0;
    const tick = () => {
      bubble.textContent = text.slice(0, i);
      if (i++ < text.length) bubbleTimer = setTimeout(tick, 14);
      else bubbleTimer = setTimeout(() => bubble.classList.remove('show'), Math.max(3500, text.length * 55));
    };
    tick();
    avatar.classList.remove('talk'); void avatar.offsetWidth; avatar.classList.add('talk');
    void who;
  }
  const PRIO = { userBlunder: 3, userMistake: 3, userWin: 4, userLose: 4, draw: 4, userInaccuracy: 2, userBest: 2, botWinning: 2, botLosing: 2 };
  const botSay = (event, vars = {}, chance = 1) => {
    if (Math.random() > chance) return;
    speak(say(bot, event, { name: P.name, ...vars }, { help: assists.coach }), { prio: PRIO[event] || 1 });
  };
  function setInfo(html, cls = '') { info.className = 'g-info ' + cls; info.innerHTML = html; }

  function userPov(scoreStm, fen) {
    const stm = fen.split(' ')[1];
    return stm === userColor ? scoreStm : -scoreStm;
  }
  function showEval(fen) {
    const e = S.evals.get(fen);
    if (!e) return;
    const u = userPov(e.score, fen);
    S.minEval = Math.min(S.minEval, u);
    const pct = winPct(u);
    evalFill.style.width = `${pct}%`;
    const txt = Math.abs(u) >= 90000 ? `M${Math.max(1, 100000 - Math.abs(u))}` : (Math.abs(u) / 100).toFixed(1);
    evalL.textContent = u >= 0 ? `You +${txt}` : 'You';
    evalR.textContent = u < 0 ? `Bot +${txt}` : 'Bot';
    evalBar.classList.toggle('bot-ahead', u < 0);
    if (S.phase === 'play' && !S.over) {
      if (u <= -300 && !S.saidWinning) { S.saidWinning = true; botSay('botWinning', {}, 0.8); }
      if (u >= 300 && !S.saidLosing) { S.saidLosing = true; botSay('botLosing', {}, 0.8); }
    }
  }
  async function getEval(fen, depth = 12) {
    if (S.evals.has(fen)) return S.evals.get(fen);
    const pos = new Chess(fen);
    let e;
    if (pos.isCheckmate()) e = { score: -100000, best: null, pv: [] };
    else if (pos.isGameOver()) e = { score: 0, best: null, pv: [] };
    else {
      const r = await env.engines.eval.analyse(fen, { depth });
      if (!r) return null;
      const l = r.lines[0];
      e = { score: scoreOf(l), best: r.bestmove, pv: l ? l.pv : [] };
    }
    S.evals.set(fen, e);
    return e;
  }
  function refreshEval() {
    const fen = S.game.fen();
    evalBar.classList.toggle('hidden-eval', !assists.eval || !analysing());
    if (!analysing()) return;
    if (assists.eval || S.phase === 'play') getEval(fen).then((e) => { if (e && S.game.fen() === fen) showEval(fen); });
  }

  // ---------- opening (book) phase ----------
  const ply = () => S.game.history().length;
  function expected() { return line[ply()]; }
  function showBookArrow() {
    board.arrows([]);
    if (S.phase !== 'book' || S.over || S.game.turn() !== userColor) return;
    const exp = expected();
    if (!exp) return;
    const showArrow = cfg.mode === 'lesson' || (cfg.mode === 'level' && assists.arrows) || (cfg.mode === 'drill' && S.drillMisses >= 2);
    const g = new Chess(S.game.fen());
    const m = g.move(exp);
    if (showArrow && m) board.arrows([{ from: m.from, to: m.to, brush: 'hint' }]);
    const n = Math.floor(ply() / 2) + 1;
    if (cfg.mode === 'lesson') setInfo(`<div class="step">Move ${n}</div><b>Play ${esc(exp)}</b><p>${esc(cap(describeMove(S.game.fen(), exp)))}.</p>`);
    else if (cfg.mode === 'drill') setInfo(`<div class="step">Move ${n}</div><b>Your move</b><p>What does the ${esc(cfg.opening.name)} play here?</p>`);
    else setInfo(`<div class="step">Opening · move ${n}</div><b>Play the ${esc(cfg.opening.name)}</b><p>${assists.arrows ? 'Follow the arrow, or play it from memory.' : 'Play the opening from memory.'}</p>`);
  }

  async function bookBotMove() {
    const t = ++S.token;
    S.busy = true; sync();
    await sleep(cfg.mode === 'lesson' ? 450 : 600);
    if (t !== S.token || S.over) return;
    const san = expected();
    const m = S.game.move(san);
    S.busy = false;
    afterMove(m, true);
    if (ply() >= line.length) return bookComplete();
    showBookArrow();
  }

  function bookComplete() {
    board.arrows([]);
    if (cfg.mode === 'lesson' || cfg.mode === 'drill') return finishLesson();
    S.phase = 'play';
    renderHearts();
    sfx.unlock();
    env.toast({ icon: 'check', name: 'Opening complete', desc: `Now beat ${bot.name} (${cfg.elo}).` });
    setInfo(`<b>Opening complete!</b><p>You played the ${esc(cfg.opening.name)} correctly. Now win the game.${live ? '' : ' Analysis is off until the game ends — you can review it afterwards.'}</p>`, 'ok');
    botSay('intro', {}, 0.5);
    refreshEval();
    if (S.game.turn() === botColor) botTurn();
    else sync();
  }

  // ---------- moves ----------
  async function userMove(from, to) {
    const viaPremove = S.fromPremove; S.fromPremove = false;
    if (S.over || S.busy) return sync();
    const piece = S.game.get(from);
    let promotion;
    if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) promotion = await board.promote(piece.color);
    const fenBefore = S.game.fen();
    let m = null;
    try { m = S.game.move({ from, to, promotion }); } catch { m = null; }
    if (!m) return sync();
    board.clearBadges();
    if (confirmOn && !viaPremove) {
      const ok = await confirmMove(m);
      if (!ok) { if (S.game.history().at(-1)?.san === m.san) S.game.undo(); return sync(); }
      if (S.over) return;
    }

    if (S.phase === 'book') {
      const exp = line[ply() - 1];
      if (m.san !== exp) return wrongBookMove(m, exp);
      S.grades[ply() - 1] = { key: 'book' };
      afterMove(m, false);
      board.badge(m.to, 'correct');
      if (ply() >= line.length) return bookComplete();
      return bookBotMove();
    }
    board.arrows([]);
    afterMove(m, false);
    gradeUserMove(fenBefore, m);
    if (!checkEnd()) botTurn();
  }

  async function wrongBookMove(m, exp) {
    S.busy = true;
    S.mistakes++;
    sync();
    board.badge(m.to, 'wrong');
    board.shake();
    sfx.wrong();
    buzz(90);
    const n = Math.floor((ply() - 1) / 2) + 1;
    if (cfg.mode === 'level') {
      S.hearts--;
      renderHearts();
      speak(S.hearts > 0 ? `That move leaves the ${cfg.opening.name}. ${S.hearts} ${S.hearts === 1 ? 'life' : 'lives'} left.` : 'No lives left.', { mood: 'bad', prio: 5 });
    } else {
      const tip = cfg.mode === 'lesson' ? `Not quite — the ${cfg.opening.name} plays ${exp} here.` : 'Not the move. Try again!';
      speak(tip, { mood: 'bad', prio: 5 });
    }
    if (cfg.mode === 'drill') S.drillMisses++;
    setInfo(`<div class="step">Move ${n}</div><b class="bad">${esc(m.san)} is not the opening move</b><p>${cfg.mode === 'lesson' || (cfg.mode === 'level' && assists.arrows) ? `The book move is <b>${esc(exp)}</b>.` : 'Think about the ideas of the opening and try again.'}</p>`, 'bad');
    await sleep(1100);
    if (S.over) return;
    S.game.undo();
    board.clearBadges();
    S.busy = false;
    if (cfg.mode === 'level' && S.hearts <= 0) return end({ result: 'loss', reason: 'No lives left — the opening was missed three times.' });
    sync();
    showBookArrow();
  }

  function afterMove(m, byBot) {
    if (!m) return;
    sfx.play(m);
    sync();
    refreshEval();
    if (S.phase === 'play' && !S.over) {
      if (m.captured && byBot) botSay('botCapture', { botmove: m.san }, 0.35);
      else if (m.captured && !byBot) botSay('userCapture', { move: m.san }, 0.35);
      if (m.san.includes('+') && !m.san.includes('#')) botSay(byBot ? 'botCheck' : 'userCheck', {}, 0.5);
    }
  }

  async function gradeUserMove(fenBefore, m) {
    if (!live) return; // analysis after the opening is switched off in Settings
    const idx = ply() - 1;
    const fenAfter = S.game.fen();
    const b = await getEval(fenBefore);
    const a = await getEval(fenAfter);
    if (!b || !a) return;
    const uci = m.from + m.to + (m.promotion || '');
    const before = b.score, after = -a.score;
    const grade = gradeMove(before, after, b.best === uci);
    S.grades[idx] = grade;
    const best = b.best ? sanOf(fenBefore, b.best) : null;
    const reason = explain({ fen: fenBefore, uci, bestUci: b.best, bestPv: b.pv, before, after, replyPv: a.pv, grade });
    S.grades[idx].text = reason;
    if (S.game.history().length - 1 < idx) return; // taken back meanwhile
    renderMoves();
    const vars = { move: m.san, best, reason: grade.key === 'best' ? '' : reason.replace(/Better was.*$/, '').trim() };
    const coach = assists.coach;
    if (coach && ['blunder', 'mistake', 'inaccuracy', 'best', 'miss'].includes(grade.key) && S.game.history()[idx] === m.san) {
      board.badge(m.to, grade.key);
    }
    if (grade.key === 'blunder' || grade.key === 'miss') { botSay('userBlunder', vars); if (coach) buzz(60); }
    else if (grade.key === 'mistake') botSay('userMistake', vars);
    else if (grade.key === 'inaccuracy') botSay('userInaccuracy', vars, 0.6);
    else if (grade.key === 'best') botSay('userBest', vars, 0.35);
    else botSay('userGood', vars, 0.12);
    if (assists.arrows && ['blunder', 'mistake', 'miss'].includes(grade.key) && b.best && S.game.history()[idx] === m.san) {
      board.arrows([{ from: m.from, to: m.to, brush: 'bad' }, { from: b.best.slice(0, 2), to: b.best.slice(2, 4), brush: 'best' }]);
      setInfo(`<b class="g-${grade.key}">${GRADES[grade.key].icon} ${esc(m.san)} — ${GRADES[grade.key].label}</b><p>${esc(reason)}</p>`, 'bad');
    } else if (coach) {
      setInfo(`<b class="g-${grade.key}">${GRADES[grade.key].icon} ${esc(m.san)} — ${GRADES[grade.key].label}</b>${grade.key === 'best' || grade.key === 'excellent' ? '' : `<p>${esc(reason)}</p>`}`, ['blunder', 'mistake', 'miss'].includes(grade.key) ? 'bad' : '');
    }
  }

  async function botTurn() {
    if (S.over) return;
    const t = ++S.token;
    S.busy = true;
    sync();
    const fen = S.game.fen();
    const legal = S.game.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ''));
    const started = performance.now();
    let uci = null;
    try { uci = await chooseMove(env.engines.bot, fen, cfg.elo, legal); } catch { uci = null; }
    if (t !== S.token || S.over) return;
    if (!uci) uci = legal[0];
    const wait = 550 - (performance.now() - started);
    if (wait > 0) await sleep(wait);
    if (t !== S.token || S.over) return;
    let m = null;
    try { m = S.game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' }); } catch { m = null; }
    S.busy = false;
    if (!m) { sync(); return; }
    afterMove(m, true);
    if (!checkEnd() && premoveOn) { S.fromPremove = true; if (!board.playPremove()) S.fromPremove = false; }
  }

  /** Ask the player to confirm a move (Settings → Confirm moves). Resolves true/false. */
  function confirmMove(m) {
    return new Promise((resolve) => {
      S.confirming = true;
      sync();
      board.set(S.game, { lastMove: [m.from, m.to], movable: false });
      const bar = h('div', 'confirm-bar');
      const no = h('button', 'btn ghost', `${icon('x')} Cancel`);
      const yes = h('button', 'btn primary', `${icon('check')} Play ${esc(m.san)}`);
      bar.append(no, yes);
      nav.after(bar);
      nav.hidden = true;
      const done = (v) => { bar.remove(); nav.hidden = false; S.confirming = false; S.confirmCancel = null; resolve(v); };
      S.confirmCancel = () => done(false);
      no.onclick = () => done(false);
      yes.onclick = () => done(true);
    });
  }

  function checkEnd() {
    const g = S.game;
    if (!g.isGameOver()) return false;
    if (g.isCheckmate()) end({ result: g.turn() === userColor ? 'loss' : 'win', reason: 'Checkmate' });
    else if (g.isStalemate()) end({ result: 'draw', reason: 'Stalemate' });
    else if (g.isThreefoldRepetition()) end({ result: 'draw', reason: 'Threefold repetition' });
    else if (g.isInsufficientMaterial()) end({ result: 'draw', reason: 'Insufficient material' });
    else end({ result: 'draw', reason: 'Fifty-move rule' });
    return true;
  }

  // ---------- controls ----------
  bBack.onclick = () => {
    if (S.confirmCancel) { S.confirmCancel(); return; }
    board.cancelPremove();
    if (S.busy && S.phase === 'book') return;
    S.token++;
    S.busy = false;
    board.clearBadges();
    board.arrows([]);
    if (S.over && cfg.mode !== 'lesson' && cfg.mode !== 'drill') S.over = false;
    let undone = 0;
    // go back to the previous position where it is your turn, undoing at least one of your moves
    while (S.game.history().length) {
      const m = S.game.undo();
      undone++;
      if (m.color === userColor) break;
    }
    if (!undone) return sync();
    if (S.game.history().length && S.game.turn() !== userColor) { S.game.undo(); }
    S.grades.length = S.game.history().length;
    S.takebacks++;
    if (ply() < line.length) S.phase = 'book';
    sync();
    refreshEval();
    if (S.phase === 'play') botSay('takeback', {}, 0.6);
    if (S.phase === 'book') {
      if (S.game.turn() === botColor) bookBotMove(); else showBookArrow();
    } else if (S.game.turn() === botColor) botTurn();
    else setInfo('<b>Taken back.</b><p>Try a different move.</p>');
    renderHearts();
  };

  bHint.onclick = async () => {
    if (S.over || S.game.turn() !== userColor) return;
    if (S.phase === 'book') {
      const g = new Chess(S.game.fen());
      const m = g.move(expected());
      if (m) board.arrows([{ from: m.from, to: m.to, brush: 'hint' }]);
      S.hints++;
      return;
    }
    if (!help) return;
    const fen = S.game.fen();
    const e = await getEval(fen, 14);
    if (!e || !e.best || S.game.fen() !== fen) return;
    S.hints++;
    board.arrows([{ from: e.best.slice(0, 2), to: e.best.slice(2, 4), brush: 'hint' }]);
    setInfo(`<div class="step">Suggestion</div><b>${esc(sanOf(fen, e.best))}</b><p>${esc(cap(describeMove(fen, e.best)))}.</p>`);
  };

  bFlip.onclick = () => board.flip();

  bResign.onclick = () => {
    if (cfg.mode === 'lesson' || cfg.mode === 'drill') { env.retry(); return; }
    if (S.over) return;
    if (confirmBox('Resign this game?')) end({ result: 'loss', reason: 'Resigned' });
  };

  // Leaving: bot games are saved (continue them from the Play tab); a level game asks first.
  function leave() {
    const saved = cfg.mode === 'free' && !S.over && S.game.history().length > 0;
    destroy();
    env.exit();
    if (saved) env.toast({ icon: 'check', name: 'Game saved', desc: 'Continue it any time from the Play tab.' });
  }
  backBtn.onclick = () => {
    if (cfg.mode === 'level' && !S.over && S.game.history().length > 2) {
      env.modal({
        icon: 'flag', title: 'Leave this level?', body: '<p>This game will count as unfinished.</p>',
        buttons: [{ label: 'Leave', primary: true, run: leave }, { label: 'Keep playing' }],
      });
      return;
    }
    leave();
  };

  // ---------- endings ----------
  function finishLesson() {
    S.over = true;
    sync();
    const o = openingProgress(cfg.opening.id);
    const first = !o.lesson;
    const perfect = S.mistakes === 0;
    if (cfg.mode === 'lesson') {
      o.lesson = true;
      if (perfect) o.perfectLesson = true;
      if (first) P.stats.lessons++;
    }
    const xp = cfg.mode === 'drill' ? (perfect ? 40 : 15) : (first ? 50 : 15) + (perfect ? 20 : 0);
    touchStreak();
    addXp(xp);
    save();
    const ach = checkAchievements(env.ctx());
    sfx.win();
    if (perfect) env.confetti();
    env.modal({
      icon: perfect ? 'trophy' : 'book',
      title: cfg.mode === 'drill' ? (perfect ? 'Perfect recall!' : 'Drill complete') : 'Lesson complete!',
      body: `${perfect ? 'No mistakes — flawless!' : `${S.mistakes} wrong ${S.mistakes === 1 ? 'move' : 'moves'}. Practice makes perfect.`}<div class="xp-gain">+${xp} XP</div>`,
      achievements: ach,
      buttons: [
        { label: 'Play Level 1', primary: true, run: () => env.next({ mode: 'level', level: Math.max(1, (o.best || 0) + 1) }) },
        { label: cfg.mode === 'drill' ? 'Drill again' : 'Drill without arrows', run: () => env.next({ mode: 'drill' }) },
        { label: 'Back to opening', run: () => { destroy(); env.exit(); } },
      ],
    });
  }

  function end({ result, reason }) {
    if (S.over) return;
    S.over = true;
    S.token++;
    S.busy = false;
    sync();
    board.arrows([]);
    const won = result === 'win';
    const fullMoves = Math.ceil(S.game.history().length / 2);
    const noHelp = !assists.arrows && !assists.coach && !assists.eval && S.hints === 0 && S.takebacks === 0;
    let xp = 0, stars = 0, milestone = null, title;
    P.stats.games++;
    touchStreak();
    const rec = P.bots[bot.id] || (P.bots[bot.id] = { wins: 0, losses: 0, draws: 0 });
    if (won) rec.wins++; else if (result === 'draw') rec.draws++; else rec.losses++;
    if (won) {
      rec.bestWinElo = Math.max(rec.bestWinElo || 0, cfg.elo);
      if (cfg.elo >= bot.elo) rec.winsAtRating = (rec.winsAtRating || 0) + 1;
      if (noHelp) P.stats.noHelpWins++;
      if (fullMoves <= 20) P.stats.quickWins++;
      if (S.minEval <= -300) P.stats.comebacks++;
    }
    if (cfg.mode === 'level') {
      if (won) {
        stars = 1 + (S.mistakes === 0 ? 1 : 0) + (S.takebacks === 0 && S.hints === 0 ? 1 : 0);
        const o = openingProgress(cfg.opening.id);
        const prev = o.levels[cfg.level] || { stars: 0, wins: 0 };
        o.levels[cfg.level] = { stars: Math.max(prev.stars, stars), wins: prev.wins + 1 };
        const before = o.best;
        o.best = Math.max(o.best, cfg.level);
        P.stats.levelWins++;
        xp = 60 + cfg.level * 25 + stars * 20;
        if (o.best > before) milestone = MILESTONES.find((m) => m.level === cfg.level) || null;
      } else xp = 10;
      title = won ? 'Level complete!' : result === 'draw' ? 'Draw — not quite!' : 'Level failed';
    } else {
      xp = won ? 30 + Math.round(cfg.elo / 25) : result === 'draw' ? 15 : 8;
      title = won ? 'Victory!' : result === 'draw' ? 'Draw' : 'Defeat';
      updateRating(cfg.elo, won ? 1 : result === 'draw' ? 0.5 : 0);
      if (won) P.stats.botWins++;
    }
    const record = {
      id: Date.now().toString(36), date: Date.now(), title: cfg.title, moves: S.game.history(), userColor, result, reason,
      bot: bot.name, botId: bot.id, elo: cfg.elo, mode: cfg.mode, opening: cfg.opening ? cfg.opening.id : null, bookPlies: line.length,
    };
    P.games.unshift(record);
    P.games = P.games.slice(0, 40);
    addXp(xp);
    save();
    const ach = checkAchievements(env.ctx());
    if (won) { setTimeout(sfx.win, 650); env.confetti(); botSay('userWin'); }
    else if (result === 'draw') { botSay('draw'); }
    else { setTimeout(sfx.lose, 650); botSay('userLose'); }
    const starsHtml = cfg.mode === 'level' && won ? `<div class="stars-row">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.15}s">${icon('star')}</span>`).join('')}</div>
      <div class="star-key"><span>Win</span><span>·</span><span>No opening mistakes</span><span>·</span><span>No take-backs or hints</span></div>` : '';
    const mileHtml = milestone ? `<div class="milestone"><div class="m-icon">${icon(milestone.icon)}</div><div><b>${milestone.title}</b><span>You reached level ${milestone.level} in the ${esc(cfg.opening.name)}!</span></div></div>` : '';
    const buttons = [];
    const reviewLabel = noHelp ? 'Yes, review my game' : 'Review game';
    buttons.push({ label: reviewLabel, primary: !won || noHelp, run: () => { destroy(); env.review(record); } });
    if (cfg.mode === 'level' && won && cfg.level < 10) buttons.push({ label: `Next: Level ${cfg.level + 1}`, primary: !noHelp, run: () => env.next({ mode: 'level', level: cfg.level + 1 }) });
    buttons.push({ label: cfg.mode === 'level' ? 'Try again' : 'Rematch', run: () => env.retry() });
    buttons.push({ label: 'Back', run: () => { destroy(); env.exit(); } });
    setTimeout(() => env.modal({
      icon: won ? 'trophy' : result === 'draw' ? 'handshake' : 'x',
      tone: won ? '' : result === 'draw' ? 'neutral' : 'bad',
      title,
      body: `${esc(reason)}${/[.!?]$/.test(reason) ? '' : '.'}${noHelp ? '<p class="ask">Would you like to review the game so the coach can show you what to improve?</p>' : ''}${starsHtml}${mileHtml}<div class="xp-gain">+${xp} XP</div>`,
      achievements: ach,
      buttons,
      celebrate: !!milestone,
    }), won ? 900 : 600);
  }

  // ---------- start ----------
  function start() {
    if (cfg.resume && cfg.resume.length) {
      for (const san of cfg.resume) { try { S.game.move(san); } catch { break; } }
      S.phase = 'play';
    }
    sync();
    if (cfg.mode === 'lesson') {
      speak(`Let's learn the ${cfg.opening.name}! Follow the green arrow.`);
    } else if (cfg.mode === 'drill') {
      speak('No arrows this time. Play the moves from memory!');
    } else {
      botSay('intro');
    }
    refreshEval();
    sfx.start();
    if (S.phase === 'book') {
      if (S.game.turn() === botColor) bookBotMove();
      else showBookArrow();
    } else {
      if (cfg.resume && cfg.resume.length) setInfo(`<b>Game continued</b><p>Move ${Math.floor(S.game.history().length / 2) + 1} · you play ${userColor === 'w' ? 'White' : 'Black'}.</p>`);
      else setInfo(`<b>You play ${userColor === 'w' ? 'White' : 'Black'}</b><p>${!help || !live ? 'No analysis during this game. You can review it when it ends.' : hintsOn ? 'Hint suggests a move; Back takes your last move back.' : 'Back takes your last move back.'}</p>`);
      if (S.game.turn() === botColor) botTurn();
    }
  }

  function destroy() {
    if (S.confirmCancel) S.confirmCancel();
    S.over = true;
    S.token++;
    clearTimeout(bubbleTimer);
    env.engines.eval.cancel();
    env.engines.bot.cancel();
    board.destroy();
  }

  start();
  return { destroy, state: S, board };
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
