// Promise-based Stockfish client. Jobs run one at a time; cancel() drops queued
// jobs and stops the running one, so stale results never reach the UI.

export class UciClient {
  constructor(url, transport = null) {
    if (transport) this.t = transport;
    else this.t = blobWorkerTransport(url);
    this.queue = [];
    this.job = null;
    this.dead = false;
    this.t.onLine((l) => this._line(l));
    this.ready = new Promise((res, rej) => { this._ok = res; this._fail = rej; });
    this._boot = setTimeout(() => this._die('engine did not start'), 25000);
    this.t.send('uci');
  }

  _die(msg) {
    this.dead = true;
    clearTimeout(this._boot);
    this._fail(new Error(msg));
    for (const j of this.queue) j.resolve(null);
    this.queue = [];
    if (this.job) { this.job.resolve(null); this.job = null; }
  }

  _line(l) {
    if (l.startsWith('error ')) return this._die(l.slice(6));
    if (l === 'uciok') { this.t.send('setoption name Hash value 32'); this.t.send('isready'); return; }
    if (l === 'readyok' && !this.started) { this.started = true; clearTimeout(this._boot); this._ok(); this._next(); return; }
    const j = this.job;
    if (!j) return;
    if (l.startsWith('info ') && l.includes(' pv ') && !l.includes('bound')) {
      const t = l.split(' ');
      const k = t.includes('multipv') ? +t[t.indexOf('multipv') + 1] : 1;
      const depth = +t[t.indexOf('depth') + 1];
      const si = t.indexOf('score');
      const cp = t[si + 1] === 'cp' ? +t[si + 2] : null;
      const mate = t[si + 1] === 'mate' ? +t[si + 2] : null;
      const pv = t.slice(t.indexOf('pv') + 1);
      j.lines[k - 1] = { multipv: k, depth, cp, mate, pv };
      if (j.onInfo && k === 1) j.onInfo(j.lines[0]);
      return;
    }
    if (l.startsWith('bestmove')) {
      const best = l.split(' ')[1];
      this.job = null;
      j.resolve(j.cancelled ? null : { bestmove: best === '(none)' ? null : best, lines: j.lines.filter(Boolean), fen: j.fen });
      this._next();
    }
  }

  _next() {
    if (this.job || !this.started || this.dead) return;
    const j = this.queue.shift();
    if (!j) return;
    this.job = j;
    for (const [k, v] of Object.entries(j.options || {})) this.t.send(`setoption name ${k} value ${v}`);
    this.t.send(`setoption name MultiPV value ${j.multipv}`);
    this.t.send(`position fen ${j.fen}`);
    const lim = [];
    if (j.depth) lim.push(`depth ${j.depth}`);
    if (j.movetime) lim.push(`movetime ${j.movetime}`);
    if (j.nodes) lim.push(`nodes ${j.nodes}`);
    this.t.send('go ' + (lim.join(' ') || 'depth 12'));
  }

  /** Analyse a position. Resolves { bestmove, lines:[{cp, mate, pv, depth}] } (scores from side to move) or null if cancelled. */
  analyse(fen, { depth, movetime, nodes, multipv = 1, options, onInfo } = {}) {
    if (this.dead) return Promise.resolve(null);
    return new Promise((resolve) => {
      this.queue.push({ fen, depth, movetime, nodes, multipv, options, onInfo, resolve, lines: [] });
      this._next();
    });
  }

  cancel() {
    for (const j of this.queue) j.resolve(null);
    this.queue = [];
    if (this.job && !this.job.cancelled) { this.job.cancelled = true; this.t.send('stop'); }
  }

  quit() { this.cancel(); try { this.t.send('quit'); } catch { /* ignore */ } this.t.close && this.t.close(); this.dead = true; }
}

/**
 * Load the engine script and its .wasm in the page, then start the worker from
 * in-memory copies. Works the same in browsers and in Android's WebView, where
 * requests made from inside a worker are not always routed to the app's files.
 */
const blobCache = new Map();
function engineBlobs(jsUrl) {
  if (!blobCache.has(jsUrl)) {
    const wasmUrl = jsUrl.replace(/\.js$/, '.wasm');
    blobCache.set(jsUrl, Promise.all([
      fetch(jsUrl).then((r) => { if (!r.ok) throw new Error('engine script missing'); return r.blob(); }),
      fetch(wasmUrl).then((r) => { if (!r.ok) throw new Error('engine wasm missing'); return r.arrayBuffer(); }),
    ]).then(([js, wasm]) => ({
      js: URL.createObjectURL(new Blob([js], { type: 'text/javascript' })),
      wasm: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
    })));
  }
  return blobCache.get(jsUrl);
}

function blobWorkerTransport(jsUrl) {
  let cb = () => {};
  let worker = null;
  const pending = [];
  let closed = false;
  engineBlobs(jsUrl).then(({ js, wasm }) => {
    if (closed) return;
    // stockfish.js reads the wasm location from the part of its URL after '#'
    worker = new Worker(`${js}#${encodeURIComponent(wasm)}`);
    worker.onmessage = (e) => cb(String(e.data));
    worker.onerror = (e) => cb('error ' + (e.message || 'engine failed to start'));
    for (const m of pending.splice(0)) worker.postMessage(m);
  }).catch((e) => cb('error ' + e.message));
  return {
    send: (s) => { if (worker) worker.postMessage(s); else pending.push(s); },
    onLine: (f) => { cb = f; },
    close: () => { closed = true; if (worker) worker.terminate(); },
  };
}

/** Score from the side to move as a single number (mate = ±(100000 - plies)). */
export function scoreOf(line) {
  if (!line) return 0;
  if (line.mate != null) return line.mate > 0 ? 100000 - line.mate : -100000 - line.mate;
  return line.cp ?? 0;
}
