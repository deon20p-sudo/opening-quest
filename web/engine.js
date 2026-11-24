// KnightLens Stockfish wrapper (UCI over a Web Worker, or any line transport).
// Handles the stop/bestmove race: a new position never mixes with the old search's output.

export function workerTransport(url) {
  const w = new Worker(url);
  let handler = () => {};
  w.onmessage = (e) => handler(String(e.data));
  w.onerror = (e) => handler('error ' + (e.message || 'worker failed'));
  return { send: (s) => w.postMessage(s), onLine: (cb) => { handler = cb; }, close: () => w.terminate() };
}

/** Parse one UCI "info" line. Returns null for lines without a principal variation. */
export function parseInfo(line) {
  if (!line.startsWith('info ') || !line.includes(' pv ')) return null;
  const t = line.split(/\s+/);
  const out = { depth: 0, multipv: 1, cp: null, mate: null, bound: null, nodes: 0, nps: 0, pv: [] };
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth': out.depth = +t[++i]; break;
      case 'multipv': out.multipv = +t[++i]; break;
      case 'nodes': out.nodes = +t[++i]; break;
      case 'nps': out.nps = +t[++i]; break;
      case 'score':
        if (t[i + 1] === 'cp') out.cp = +t[i + 2];
        else if (t[i + 1] === 'mate') out.mate = +t[i + 2];
        i += 2;
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') out.bound = t[++i];
        break;
      case 'pv': out.pv = t.slice(i + 1); i = t.length; break;
      default: break;
    }
  }
  return out;
}

/** Chance (0-100) that the side with this evaluation wins, as used by Lichess. */
export function winPercent(cp, mate) {
  if (mate != null) return mate > 0 ? 100 : mate < 0 ? 0 : 50;
  const c = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

/**
 * Grade a move from the mover's point of view.
 * before: eval of the best move before (mover POV), after: eval after the move (mover POV).
 */
export function gradeMove(before, after, playedBest) {
  if (playedBest) return { key: 'best', label: 'Best' };
  const loss = winPercent(before.cp, before.mate) - winPercent(after.cp, after.mate);
  if (loss >= 30) return { key: 'blunder', label: 'Blunder', loss };
  if (loss >= 20) return { key: 'mistake', label: 'Mistake', loss };
  if (loss >= 10) return { key: 'inaccuracy', label: 'Inaccuracy', loss };
  if (loss <= 2) return { key: 'excellent', label: 'Excellent', loss };
  return { key: 'good', label: 'Good', loss };
}

/** Human text for an eval from White's point of view. */
export function formatEval(cp, mate) {
  if (mate != null) return mate === 0 ? '#' : (mate > 0 ? '+M' : '-M') + Math.abs(mate);
  if (cp == null || Math.abs(cp) < 5) return '0.0';
  const v = cp / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(Math.abs(v) >= 10 ? 0 : 1);
}

export class Engine {
  constructor(transport) {
    this.t = transport;
    this.state = 'booting';   // booting | idle | searching | stopping | dead
    this.pending = null;
    this.current = null;
    this.listeners = new Set();
    this.name = 'Stockfish';
    this.multiPV = 0;
    this.t.onLine((l) => this._line(l));
    this.ready = new Promise((res, rej) => {
      this._resolveReady = res;
      this._rejectReady = rej;
    });
    this._bootTimer = setTimeout(() => this._fail('Engine did not start'), 20000);
    this.t.send('uci');
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(ev) { for (const fn of this.listeners) fn(ev); }

  _fail(msg) {
    clearTimeout(this._bootTimer);
    this.state = 'dead';
    this._rejectReady(new Error(msg));
    this._emit({ type: 'error', message: msg });
  }

  _line(line) {
    if (line.startsWith('error ')) return this._fail(line.slice(6));
    if (line.startsWith('id name ')) { this.name = line.slice(8); return; }
    if (line === 'uciok') {
      this.t.send('setoption name Hash value 64');
      this.t.send('isready');
      return;
    }
    if (line === 'readyok') {
      if (this.state === 'booting') {
        clearTimeout(this._bootTimer);
        this.state = 'idle';
        this._resolveReady(this.name);
        if (this.pending) { const p = this.pending; this.pending = null; this._start(p); }
      }
      return;
    }
    if (line.startsWith('bestmove')) {
      const cur = this.current;
      if (this.state === 'searching' && cur) {
        cur.bestmove = line.split(/\s+/)[1];
        cur.done = true;
        this._emit({ type: 'done', search: cur });
      }
      this.current = null;
      this.state = 'idle';
      if (this.pending) { const p = this.pending; this.pending = null; this._start(p); }
      return;
    }
    if (this.state !== 'searching' || !this.current) return; // stale output from a stopped search
    const info = parseInfo(line);
    if (!info || info.bound) return;
    const cur = this.current;
    const white = cur.fen.split(' ')[1] !== 'b';
    info.whiteCp = info.cp == null ? null : white ? info.cp : -info.cp;
    info.whiteMate = info.mate == null ? null : white ? info.mate : -info.mate;
    cur.lines[info.multipv - 1] = info;
    if (info.multipv === 1) cur.depth = info.depth;
    this._emit({ type: 'info', search: cur, info });
  }

  /**
   * Analyse a position. Replaces any running search.
   * opts: { multipv = 3, movetime (ms) or infinite: true }
   */
  analyze(fen, opts = {}) {
    const req = { id: Math.random().toString(36).slice(2), fen, multipv: opts.multipv ?? 3, movetime: opts.movetime ?? 3000, infinite: !!opts.infinite };
    if (this.state === 'dead') return null;
    if (this.state === 'booting' || this.state === 'stopping') { this.pending = req; return req.id; }
    if (this.state === 'searching') {
      this.pending = req;
      this.state = 'stopping';
      this.t.send('stop');
      return req.id;
    }
    this._start(req);
    return req.id;
  }

  stop() {
    this.pending = null;
    if (this.state === 'searching') { this.state = 'stopping'; this.t.send('stop'); }
  }

  _start(req) {
    if (req.multipv !== this.multiPV) {
      this.t.send(`setoption name MultiPV value ${req.multipv}`);
      this.multiPV = req.multipv;
    }
    this.current = { ...req, lines: [], depth: 0, done: false, bestmove: null };
    this.t.send(`position fen ${req.fen}`);
    this.t.send(req.infinite ? 'go infinite' : `go movetime ${Math.max(100, req.movetime | 0)}`);
    this.state = 'searching';
    this._emit({ type: 'start', search: this.current });
  }

  quit() {
    try { this.t.send('quit'); } catch { /* ignore */ }
    this.t.close?.();
    this.state = 'dead';
  }
}
