// Board component: chessground + move badges (X, ??, ★ …) + promotion picker.
import { Chessground } from './vendor/chessground/chessground.js';
import { pieceUrl } from './themes.js';
import { P } from './progress.js';

export const ANIM_MS = { off: 0, fast: 140, normal: 240, slow: 380 };

export const BADGES = {
  wrong: { text: '✕', cls: 'b-wrong', title: 'Not the opening move' },
  blunder: { text: '??', cls: 'b-blunder', title: 'Blunder' },
  mistake: { text: '?', cls: 'b-mistake', title: 'Mistake' },
  miss: { text: '✕', cls: 'b-mistake', title: 'Missed win' },
  inaccuracy: { text: '?!', cls: 'b-inacc', title: 'Inaccuracy' },
  best: { text: '★', cls: 'b-best', title: 'Best move' },
  excellent: { text: '!', cls: 'b-great', title: 'Excellent' },
  good: { text: '✓', cls: 'b-good', title: 'Good' },
  book: { text: '≡', cls: 'b-book', title: 'Book move' },
  correct: { text: '✓', cls: 'b-best', title: 'Correct' },
};

export function destsOf(game) {
  const d = new Map();
  for (const m of game.moves({ verbose: true })) {
    if (!d.has(m.from)) d.set(m.from, []);
    d.get(m.from).push(m.to);
  }
  return d;
}

export class Board {
  constructor(host, { orientation = 'white', onMove = () => {}, premove = false } = {}) {
    // A square box of its own, so padding on the parent can't stretch the board.
    this.host = document.createElement('div');
    this.host.className = 'board-host';
    host.appendChild(this.host);
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.layer = document.createElement('div');
    this.layer.className = 'badge-layer';
    this.host.append(this.el, this.layer);
    this.onMove = onMove;
    this.orientation = orientation;
    this.cg = Chessground(this.el, {
      orientation,
      coordinates: true,
      ranksPosition: 'left',
      animation: { enabled: (ANIM_MS[P.settings.animation] ?? 240) > 0, duration: ANIM_MS[P.settings.animation] ?? 240 },
      highlight: { lastMove: true, check: true },
      movable: { free: false, color: undefined, showDests: true, events: { after: (o, d) => this.onMove(o, d) } },
      premovable: { enabled: premove, showDests: true, castle: true },
      draggable: { enabled: true, showGhost: true },
      drawable: {
        enabled: true, visible: true, eraseOnClick: true,
        brushes: {
          hint: { key: 'hi', color: '#4f8f4c', opacity: 0.85, lineWidth: 12 },
          best: { key: 'be', color: '#4f8f4c', opacity: 0.85, lineWidth: 11 },
          bad: { key: 'ba', color: '#b0453f', opacity: 0.75, lineWidth: 10 },
          alt: { key: 'al', color: '#4f7aa8', opacity: 0.7, lineWidth: 10 },
          // your own arrows and circles (hold and drag, or right-click on a computer)
          green: { key: 'g', color: '#f0a020', opacity: 0.85, lineWidth: 10 },
          red: { key: 'r', color: '#d8433a', opacity: 0.85, lineWidth: 10 },
          blue: { key: 'b', color: '#3a7fd8', opacity: 0.85, lineWidth: 10 },
          yellow: { key: 'y', color: '#e6c229', opacity: 0.85, lineWidth: 10 },
        },
      },
    });
    this.ro = new ResizeObserver(() => this.cg.redrawAll());
    this.ro.observe(this.el);
    this._bindHoldArrows();
  }

  /**
   * Hold a square for a moment, then drag: draws an arrow to where you let go (or a circle
   * if you let go on the same square). Same square + same arrow again removes it.
   * A normal tap on the board clears your arrows, like on chess.com.
   */
  _bindHoldArrows() {
    const HOLD = { short: 450, medium: 900, long: 1800 };
    let timer = null, start = null, saved = [], active = null;
    const sqAt = (x, y) => {
      const r = this.el.getBoundingClientRect();
      const f = Math.floor(((x - r.left) / r.width) * 8), rk = Math.floor(((y - r.top) / r.height) * 8);
      if (f < 0 || f > 7 || rk < 0 || rk > 7) return null;
      const file = this.orientation === 'white' ? f : 7 - f, rank = this.orientation === 'white' ? 7 - rk : rk;
      return String.fromCharCode(97 + file) + (rank + 1);
    };
    const pt = (e) => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    const preview = (dest) => {
      const cur = dest && dest !== active ? { orig: active, dest, brush: 'green' } : { orig: active, brush: 'green' };
      this.cg.setShapes(saved.concat([cur]));
    };
    const reset = () => { clearTimeout(timer); timer = null; start = null; };
    const onStart = (e) => {
      if (e.touches && e.touches.length > 1) return reset();
      const p = pt(e);
      const sq = sqAt(p.clientX, p.clientY);
      if (!sq) return;
      saved = this.cg.state.drawable.shapes.slice(); // chessground erases these on tap
      start = { x: p.clientX, y: p.clientY, sq };
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        active = start.sq;
        this.cg.cancelMove();
        if (navigator.vibrate && P.settings.vibrate) { try { navigator.vibrate(15); } catch { /* ignore */ } }
        preview(null);
      }, HOLD[P.settings.arrowHold] || HOLD.medium);
    };
    const onMove = (e) => {
      if (active) {
        e.preventDefault(); e.stopImmediatePropagation();
        const p = pt(e);
        preview(sqAt(p.clientX, p.clientY));
        return;
      }
      if (timer && start) {
        const p = pt(e);
        if (Math.hypot(p.clientX - start.x, p.clientY - start.y) > 10) reset(); // a normal drag
      }
    };
    const onEnd = (e) => {
      if (!active) { reset(); return; }
      e.preventDefault(); e.stopImmediatePropagation();
      const p = pt(e);
      const dest = sqAt(p.clientX, p.clientY);
      const shape = dest && dest !== active ? { orig: active, dest, brush: 'green' } : { orig: active, brush: 'green' };
      const same = (s) => s.orig === shape.orig && (s.dest || null) === (shape.dest || null);
      const next = saved.some(same) ? saved.filter((s) => !same(s)) : saved.concat([shape]);
      this.cg.setShapes(next);
      active = null; reset();
    };
    this.el.addEventListener('touchstart', onStart, { capture: true, passive: true });
    this.el.addEventListener('mousedown', (e) => { if (e.button === 0) onStart(e); }, { capture: true });
    for (const ev of ['touchmove', 'mousemove']) window.addEventListener(ev, onMove, { capture: true, passive: false });
    for (const ev of ['touchend', 'touchcancel', 'mouseup']) window.addEventListener(ev, onEnd, { capture: true, passive: false });
    this._unbindHold = () => {
      reset();
      for (const ev of ['touchmove', 'mousemove']) window.removeEventListener(ev, onMove, { capture: true });
      for (const ev of ['touchend', 'touchcancel', 'mouseup']) window.removeEventListener(ev, onEnd, { capture: true });
    };
  }

  clearUserShapes() { this.cg.setShapes([]); }

  set(game, { lastMove, movable = false, userColor = 'w', premove = false } = {}) {
    const turn = game.turn() === 'w' ? 'white' : 'black';
    const canMove = movable && game.turn() === userColor && !game.isGameOver();
    // Premove: while the opponent is to move, your own pieces can be queued up for the next move.
    if (premove && !canMove && game.turn() !== userColor && !game.isGameOver()) {
      const mine = userColor === 'w' ? 'white' : 'black';
      this.cg.set({ fen: game.fen(), orientation: this.orientation, turnColor: turn, lastMove, check: game.inCheck() ? turn : false, movable: { color: mine, dests: new Map() } });
      return;
    }
    if (!premove) this.cg.cancelPremove();
    this.cg.set({
      fen: game.fen(),
      orientation: this.orientation,
      turnColor: turn,
      lastMove,
      check: game.inCheck() ? turn : false,
      movable: { color: canMove ? turn : undefined, dests: canMove ? destsOf(game) : new Map() },
    });
  }

  /** Play a queued premove if it is legal now. Returns true if one was played. */
  playPremove() { return this.cg.playPremove(); }
  cancelPremove() { this.cg.cancelPremove(); }

  setOrientation(o) { this.orientation = o; this.cg.set({ orientation: o }); this.redrawBadges(); }
  flip() { this.setOrientation(this.orientation === 'white' ? 'black' : 'white'); }

  arrows(list) {
    this.cg.setAutoShapes((list || []).filter(Boolean).map((a) => ({ orig: a.from, dest: a.to, brush: a.brush || 'hint' })));
  }

  _pos(square) {
    const f = square.charCodeAt(0) - 97, r = square.charCodeAt(1) - 49;
    const col = this.orientation === 'white' ? f : 7 - f;
    const row = this.orientation === 'white' ? 7 - r : r;
    return { col, row };
  }

  badge(square, kind) {
    this.clearBadges();
    const b = BADGES[kind];
    if (!b || !square) return;
    this._badge = { square, kind };
    const { col, row } = this._pos(square);
    const d = document.createElement('div');
    d.className = `move-badge ${b.cls}`;
    d.textContent = b.text;
    d.title = b.title;
    d.style.left = `calc(${((col + 1) / 8) * 100}% - 4.2%)`;
    d.style.top = `calc(${(row / 8) * 100}% - 2.2%)`;
    this.layer.appendChild(d);
  }

  redrawBadges() { if (this._badge) this.badge(this._badge.square, this._badge.kind); }
  clearBadges() { this.layer.innerHTML = ''; this._badge = null; }

  shake() {
    this.host.classList.remove('shake');
    void this.host.offsetWidth;
    this.host.classList.add('shake');
  }

  /** Ask which piece to promote to. Resolves 'q' | 'r' | 'b' | 'n'. */
  promote(color) {
    return new Promise((resolve) => {
      const w = document.createElement('div');
      w.className = 'promo';
      for (const p of ['q', 'r', 'b', 'n']) {
        const b = document.createElement('button');
        b.style.backgroundImage = `url(${pieceUrl(color, p)})`;
        b.onclick = () => { w.remove(); resolve(p); };
        w.appendChild(b);
      }
      this.host.appendChild(w);
    });
  }

  destroy() { if (this._unbindHold) this._unbindHold(); this.ro.disconnect(); this.cg.destroy(); this.host.remove(); }
}
