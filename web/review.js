// Game review: analyse every move, then step through it with explanations.
import { Chess } from './vendor/chess.mjs';
import { Board } from './board.js';
import { analyseGame, GRADES, winPct, pvSan } from './analysis.js';
import { P, save, addXp, checkAchievements } from './progress.js';
import { sfx } from './sfx.js';
import { icon } from './icons.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** game: { moves (SAN), startFen?, userColor, title, subtitle, bookPlies } */
export function openReview(root, game, env) {
  root.innerHTML = '';
  const wrap = h('div', 'review');
  const top = h('header', 'g-top');
  const back = h('button', 'icon-btn', icon('back'));
  top.append(back, h('div', 'g-title', `<b>Game review</b><small>${esc(game.title || '')}</small>`), h('div'));
  const body = h('div', 'r-body');
  wrap.append(top, body);
  root.appendChild(wrap);
  let destroyed = false;
  let board = null;
  const navBack = () => { destroyed = true; env.engines.eval.cancel(); if (board) board.destroy(); env.exit(); };
  back.onclick = navBack;

  // progress view
  body.innerHTML = `<div class="r-loading"><div class="spinner"></div><b>Analysing ${Math.ceil(game.moves.length / 2)} moves…</b><div class="bar"><div class="bar-fill" id="rprog"></div></div><small>Stockfish is checking every move</small></div>`;
  const prog = body.querySelector('#rprog');

  analyseGame(env.engines.eval, game.moves, {
    startFen: game.startFen,
    depth: game.moves.length > 90 ? 10 : 12,
    bookPlies: game.bookPlies || 0,
    onProgress: (p) => { prog.style.width = `${Math.round(p * 100)}%`; },
  }).then((res) => {
    if (destroyed || !res) return;
    P.stats.analyzed++;
    addXp(30);
    save();
    const ach = checkAchievements(env.ctx());
    ach.forEach((a) => env.toast(a));
    render(res);
  }).catch((err) => {
    if (destroyed) return;
    body.innerHTML = `<div class="r-loading"><b>Analysis failed</b><small>${esc(err.message)}</small></div>`;
  });

  function render(res) {
    const you = game.userColor || 'w';
    const acc = res.accuracy;
    const counts = res.counts[you] || {};
    const keys = ['best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder', 'miss'];
    body.innerHTML = '';
    const summary = h('div', 'r-summary');
    summary.innerHTML = `
      <div class="acc"><div class="acc-ring" style="--p:${acc[you].toFixed(0)}"><span>${acc[you].toFixed(0)}</span></div><small>Your accuracy</small></div>
      <div class="acc"><div class="acc-ring opp" style="--p:${acc[you === 'w' ? 'b' : 'w'].toFixed(0)}"><span>${acc[you === 'w' ? 'b' : 'w'].toFixed(0)}</span></div><small>Opponent</small></div>
      <div class="r-counts">${keys.filter((k) => counts[k]).map((k) => `<span style="color:${GRADES[k].color}">${GRADES[k].icon} ${counts[k]} ${GRADES[k].label}</span>`).join('') || '<span>No moves</span>'}</div>`;
    const graph = h('canvas', 'r-graph');
    const bw = h('div', 'r-board');
    const explainBox = h('div', 'r-explain');
    const nav = h('div', 'r-nav');
    const list = h('div', 'r-list');
    const keyMoments = h('div', 'r-key');
    // Board and its arrows stay together at the top while the explanation and moves scroll underneath.
    const stage = h('div', 'r-stage');
    stage.append(bw, nav);
    body.append(summary, graph, stage, explainBox, list, keyMoments);

    board = new Board(bw, { orientation: you === 'w' ? 'white' : 'black' });
    const g = new Chess(game.startFen);
    let idx = res.moves.length; // positions index (0 = start)
    let prevIdx = -1;

    const btn = (t, f) => { const b = h('button', 'ctl', icon(t)); b.onclick = () => { f(); }; nav.appendChild(b); return b; };
    btn('first', () => go(0));
    btn('prev', () => go(idx - 1));
    const bestBtn = btn('star', () => { showBest = !showBest; bestBtn.classList.toggle('off', !showBest); go(idx); });
    btn('next', () => go(idx + 1));
    btn('last', () => go(res.moves.length));
    let showBest = true;
    bestBtn.title = 'Show best move';

    // move list
    res.moves.forEach((m, i) => {
      if (i % 2 === 0) list.appendChild(h('span', 'mv-no', `${Math.floor(i / 2) + 1}.`));
      const sp = h('button', 'mv', `${esc(m.san)}<i style="color:${GRADES[m.grade.key].color}">${['best', 'excellent', 'good'].includes(m.grade.key) ? '' : GRADES[m.grade.key].icon}</i>`);
      sp.onclick = () => go(i + 1);
      sp.dataset.i = i + 1;
      list.appendChild(sp);
    });

    // key moments: your mistakes and blunders
    const bad = res.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.color === you && ['blunder', 'mistake', 'miss'].includes(m.grade.key));
    keyMoments.innerHTML = bad.length
      ? `<h4>Key moments to learn from</h4>${bad.slice(0, 6).map(({ m, i }) => `<button data-i="${i + 1}"><b style="color:${GRADES[m.grade.key].color}">${GRADES[m.grade.key].icon} ${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'} ${esc(m.san)}</b><span>Best was ${esc(m.bestSan || '?')}</span></button>`).join('')}`
      : `<h4>Key moments</h4><p class="muted">No mistakes or blunders by you — great game!</p>`;
    keyMoments.querySelectorAll('button').forEach((b) => { b.onclick = () => go(+b.dataset.i); });

    function drawGraph() {
      const dpr = devicePixelRatio || 1;
      const W = graph.clientWidth || 340, H = 70;
      graph.width = W * dpr; graph.height = H * dpr;
      const c = graph.getContext('2d');
      c.scale(dpr, dpr);
      c.fillStyle = '#3a3834'; c.fillRect(0, 0, W, H);
      const pts = res.positions.map((p, i) => {
        const stm = p.fen.split(' ')[1];
        const whiteScore = stm === 'w' ? p.score : -p.score;
        return [i / Math.max(1, res.positions.length - 1) * W, H - (winPct(whiteScore) / 100) * H];
      });
      c.beginPath(); c.moveTo(0, H);
      pts.forEach(([x, y]) => c.lineTo(x, y));
      c.lineTo(W, H); c.closePath();
      c.fillStyle = '#e9e3d7'; c.fill();
      c.strokeStyle = 'rgba(128,122,112,0.5)'; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
      res.moves.forEach((m, i) => {
        if (!['blunder', 'mistake', 'miss'].includes(m.grade.key)) return;
        const [x, y] = pts[i + 1];
        c.fillStyle = GRADES[m.grade.key].color;
        c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill();
      });
      const x = idx / Math.max(1, res.positions.length - 1) * W;
      c.strokeStyle = '#e0731f'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    graph.onclick = (e) => { const r = graph.getBoundingClientRect(); go(Math.round((e.clientX - r.left) / r.width * res.moves.length)); };

    function go(i) {
      idx = Math.max(0, Math.min(res.moves.length, i));
      const pos = new Chess(res.fens[idx]);
      const m = res.moves[idx - 1];
      if (m && prevIdx !== -1 && idx !== prevIdx) sfx.play(new Chess(res.fens[idx - 1]).move(m.san));
      prevIdx = idx;
      board.set(pos, { lastMove: m ? [m.from, m.to] : undefined });
      board.clearBadges();
      const arrows = [];
      if (m) {
        if (!['best', 'excellent', 'good', 'book'].includes(m.grade.key)) board.badge(m.to, m.grade.key);
        else if (m.grade.key === 'best') board.badge(m.to, 'best');
        if (showBest && m.best && m.best !== m.uci && !['best', 'book'].includes(m.grade.key)) {
          arrows.push({ from: m.from, to: m.to, brush: 'bad' });
          arrows.push({ from: m.best.slice(0, 2), to: m.best.slice(2, 4), brush: 'best' });
        }
      }
      board.arrows(arrows);
      list.querySelectorAll('.mv').forEach((b) => b.classList.toggle('cur', +b.dataset.i === idx));
      // Scroll only inside the move list, never the whole screen.
      const cur = list.querySelector('.mv.cur');
      if (cur) {
        const top = cur.offsetTop - list.offsetTop;
        if (top < list.scrollTop + 4 || top + cur.offsetHeight > list.scrollTop + list.clientHeight - 4) list.scrollTop = top - list.clientHeight / 2 + cur.offsetHeight / 2;
      } else list.scrollTop = 0;
      if (!m) {
        explainBox.innerHTML = '<b>Start position</b><p>Step through the game with the arrows below, or tap any move. A red arrow marks the move played, a green arrow the better move.</p>';
      } else {
        const gr = GRADES[m.grade.key];
        const mover = m.color === you ? 'You' : 'Opponent';
        const pv = res.positions[idx - 1].pv ? pvSan(res.fens[idx - 1], res.positions[idx - 1].pv, 6) : [];
        explainBox.innerHTML = `<div class="r-ex-head"><span class="r-ex-icon" style="background:${gr.color}">${gr.icon}</span><b>${mover}: ${esc(m.san)} is ${/^[aeiou]/i.test(gr.label) ? 'an' : 'a'} ${gr.label.toLowerCase()}</b></div>
          <p>${esc(m.text)}</p>${pv.length && !['best', 'book'].includes(m.grade.key) ? `<p class="pv">Best line: <b>${esc(pv.join(' '))}</b></p>` : ''}`;
      }
      drawGraph();
    }
    addEventListener('resize', drawGraph);
    go(bad.length ? bad[0].i + 1 : 0);
    void g;
  }
  return { destroy: () => { destroyed = true; if (board) board.destroy(); } };
}
