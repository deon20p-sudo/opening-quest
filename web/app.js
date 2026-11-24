// Opening Quest — app shell, screens and navigation.
import { UciClient } from './uci.js';
import { openGame } from './play.js';
import { openReview } from './review.js';
import { BOTS, LEVEL_BOTS, botById } from './bots.js';
import { MIN_ELO, MAX_ELO } from './bot.js';
import { fetchRecentGames, parsePgn } from './chesscom.js';
import { P, save, resetAll, rankFor, openingProgress, mastery, isLevelUnlocked, MILESTONES, ACHIEVEMENTS, checkAchievements, touchStreak } from './progress.js';
import { sfx } from './sfx.js';
import { applyTheme, themePicker, setAppearance } from './themes.js';
import { icon } from './icons.js';

const glyph = (x) => (/^[a-z]+$/.test(x || '') ? icon(x) : esc(x || ''));
const portrait = (b, cls = '') => `<img class="portrait ${cls}" src="${b.img}" alt="" loading="lazy">`;

const app = document.getElementById('app');
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let OPENINGS = [];
let LEVEL_ELO = [];
let current = null;          // active game/review controller
const stack = [];            // screen history for the back button

// ---------- engines (created on first use) ----------
let _eng = null;
function engines() {
  if (!_eng) {
    const url = 'vendor/stockfish-17.1-lite-single.js';
    _eng = { bot: new UciClient(url), eval: new UciClient(url) };
    _eng.bot.ready.catch((e) => toast({ icon: 'alert', name: 'Engine problem', desc: e.message }));
  }
  return _eng;
}

const achCtx = () => ({
  total: OPENINGS.length,
  botCount: BOTS.length,
  sideBest: (side) => Math.max(0, ...OPENINGS.filter((o) => o.side === side).map((o) => (P.openings[o.id] ? P.openings[o.id].best : 0))),
});

// ---------- navigation ----------
function show(name, params = {}, { push = true } = {}) {
  if (current && current.destroy) { current.destroy(); current = null; }
  if (push) stack.push({ name, params });
  app.className = 'screen-' + name;
  app.innerHTML = '';
  window.scrollTo(0, 0);
  SCREENS[name](params);
}
function goBack() {
  if (!document.getElementById('modal').hidden) { closeModal(); return true; }
  if (stack.length <= 1) return false;
  stack.pop();
  const prev = stack[stack.length - 1];
  show(prev.name, prev.params, { push: false });
  return true;
}
window.appBack = goBack; // called by the Android back button

function tabbar(active) {
  const t = h('nav', 'tabbar');
  const tabs = [['home', 'home', 'Home'], ['openings', 'book', 'Openings'], ['play', 'knight', 'Play'], ['analyze', 'search', 'Analyze'], ['trophies', 'trophy', 'Achievements']];
  for (const [id, ic, label] of tabs) {
    const b = h('button', id === active ? 'on' : '', `${icon(ic)}<small>${label}</small>`);
    b.onclick = () => { sfx.tap(); stack.length = 0; show(id); };
    t.appendChild(b);
  }
  return t;
}

// ---------- shared UI: toast, modal, confetti ----------
function toast(a) {
  const box = document.getElementById('toasts');
  const t = h('div', 'toast', `<span class="t-icon">${glyph(a.icon)}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc || '')}</small></div>`);
  box.appendChild(t);
  if (a.id) sfx.unlock();
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

function modal({ icon: ic, img, tone = '', title, body, buttons = [], achievements = [], celebrate = false }) {
  const m = document.getElementById('modal');
  m.innerHTML = '';
  const card = h('div', 'modal-card' + (celebrate ? ' celebrate' : ''));
  card.innerHTML = `<div class="m-medal ${tone}">${img ? `<img src="${img}" alt="">` : glyph(ic)}</div><h2>${esc(title)}</h2><div class="m-body">${body || ''}</div>`;
  if (achievements.length) {
    const a = h('div', 'm-ach', '<h4>Achievements unlocked</h4>');
    achievements.forEach((x) => a.appendChild(h('div', 'm-ach-item', `<span>${glyph(x.icon)}</span><div><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></div>`)));
    card.appendChild(a);
    sfx.unlock();
  }
  const row = h('div', 'm-buttons');
  for (const b of buttons) {
    const el = h('button', 'btn ' + (b.primary ? 'primary' : 'ghost'), esc(b.label));
    el.onclick = () => { closeModal(); b.run && b.run(); };
    row.appendChild(el);
  }
  card.appendChild(row);
  m.appendChild(card);
  m.hidden = false;
}
function closeModal() { const m = document.getElementById('modal'); m.hidden = true; m.innerHTML = ''; }

function confetti() {
  const c = document.getElementById('confetti');
  const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  // a restrained shower of brass and ivory flecks
  const colors = ['#e0731f', '#f08a3a', '#f3f0ea', '#b8560f'];
  const parts = Array.from({ length: 70 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight / 3,
    vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 9 - 3, r: Math.random() * 4 + 2,
    c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
  }));
  let frames = 0;
  c.style.display = 'block';
  (function step() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.a += p.va; p.vx *= 0.99;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore();
    }
    if (++frames < 150) requestAnimationFrame(step);
    else { ctx.clearRect(0, 0, c.width, c.height); c.style.display = 'none'; }
  })();
}

function header() {
  const r = rankFor();
  const el = h('header', 'hud');
  el.innerHTML = `
    <button class="monogram" id="hudAvatar" aria-label="Profile">${esc((P.name || 'P').trim().charAt(0).toUpperCase())}</button>
    <div class="hud-main">
      <div class="hud-name">${esc(P.name)} <span class="rank">${r.icon} ${r.title}</span></div>
      <div class="xpbar"><div style="width:${(r.pct * 100).toFixed(1)}%"></div></div>
      <small>${P.xp} XP${r.next ? ` · ${r.next.xp - P.xp} to ${r.next.title}` : ''}</small>
    </div>
    <div class="hud-stats"><span title="Daily streak">${icon('flame')}${P.streak.days} day${P.streak.days === 1 ? '' : 's'}</span><span title="Rating">${icon('chart')}${P.rating}</span></div>`;
  el.querySelector('#hudAvatar').onclick = () => show('settings');
  return el;
}

const sideIcon = (s) => (s === 'w' ? '<span class="side w"><i></i>White</span>' : '<span class="side b"><i></i>Black</span>');

function masteryBadge(id) {
  const m = mastery(id);
  return m.title ? `<span class="mastery">${icon(m.title.icon)}${m.title.title}</span>` : '';
}

// ---------- screens ----------
const SCREENS = {
  home() {
    app.appendChild(header());
    const main = h('main', 'home');
    // continue card: most recently progressed opening
    const recent = OPENINGS.map((o) => ({ o, p: P.openings[o.id] })).filter((x) => x.p && (x.p.lesson || x.p.best)).sort((a, b) => (b.p.best || 0) - (a.p.best || 0))[0];
    const hero = h('section', 'hero');
    if (recent) {
      const nextLevel = Math.min(10, recent.p.best + 1);
      hero.innerHTML = `<img src="img/hero.jpg" alt=""><div class="hero-body"><div class="eyebrow">Continue</div><h2>${esc(recent.o.name)}</h2><p>${recent.p.best >= 10 ? 'All ten levels complete' : `Level ${nextLevel} of 10`} &nbsp;${masteryBadge(recent.o.id)}</p>
        <div class="levelbar">${Array.from({ length: 10 }, (_, i) => `<i class="${i < recent.p.best ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn primary big">${recent.p.best >= 10 ? 'Review the opening' : `Play level ${nextLevel}`}</button></div>`;
      hero.querySelector('button').onclick = () => (recent.p.best >= 10 ? show('opening', { id: recent.o.id }) : startLevel(recent.o, nextLevel));
    } else {
      hero.innerHTML = `<img src="img/hero.jpg" alt=""><div class="hero-body"><div class="eyebrow">Opening Quest</div><h2>Master the openings</h2><p>${OPENINGS.length} openings, ten levels each. Learn the moves, then prove them against stronger opponents.</p><button class="btn primary big">Begin with the Italian Game</button></div>`;
      hero.querySelector('button').onclick = () => show('opening', { id: 'italian' });
    }
    main.appendChild(hero);
    const grid = h('section', 'tiles');
    const tiles = [
      ['book', 'Openings', `${OPENINGS.length} to master`, 'openings', 'c1'],
      ['knight', 'Play', `${BOTS.length} opponents`, 'play', 'c2'],
      ['search', 'Analyze', 'Review your Chess.com games', 'analyze', 'c3'],
      ['trophy', 'Achievements', `${Object.keys(P.achievements).length} of ${ACHIEVEMENTS.length}`, 'trophies', 'c4'],
    ];
    for (const [ic, t, sub, to, c] of tiles) {
      const b = h('button', 'tile ' + c, `<span class="ti">${icon(ic)}</span><b>${t}</b><small>${sub}</small>`);
      b.onclick = () => { sfx.tap(); show(to); };
      grid.appendChild(b);
    }
    main.appendChild(grid);
    // mastery shelf
    const mastered = OPENINGS.filter((o) => mastery(o.id).title);
    const shelf = h('section', 'card');
    shelf.innerHTML = `<h3>Your openings</h3>` + (mastered.length
      ? mastered.map((o) => `<div class="row-line"><span>${esc(o.name)}</span>${masteryBadge(o.id)}</div>`).join('')
      : '<p class="muted">Reach level 3 in any opening to earn the title Strong Beginner.</p>');
    main.appendChild(shelf);
    app.append(main, tabbar('home'));
  },

  openings({ filter = 'all', q = '' } = {}) {
    app.appendChild(header());
    const main = h('main', 'openings');
    main.innerHTML = `<h1>Openings</h1>
      <input class="search" placeholder="Search openings…" value="${esc(q)}">
      <div class="chips">${[['all', 'All'], ['w', 'As White'], ['b', 'As Black'], ['Gambits', 'Gambits'], ['progress', 'In progress']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="olist"></div>`;
    const list = main.querySelector('.olist');
    const render = () => {
      const query = main.querySelector('.search').value.toLowerCase();
      list.innerHTML = '';
      const items = OPENINGS.filter((o) => {
        if (query && !o.name.toLowerCase().includes(query) && !o.eco.toLowerCase().includes(query)) return false;
        if (filter === 'w' || filter === 'b') return o.side === filter;
        if (filter === 'Gambits') return o.family === 'Gambits';
        if (filter === 'progress') return P.openings[o.id] && (P.openings[o.id].lesson || P.openings[o.id].best);
        return true;
      });
      if (!items.length) list.innerHTML = '<p class="muted center">Nothing here yet.</p>';
      for (const o of items) {
        const p = P.openings[o.id];
        const best = p ? p.best : 0;
        const card = h('button', 'ocard');
        card.innerHTML = `<div class="ocard-top"><b>${esc(o.name)}</b><span class="eco">${o.eco}</span></div>
          <div class="ocard-mid">${sideIcon(o.side)}<span class="fam">${esc(o.family)}</span>${p && p.lesson ? `<span class="learned">${icon('check')}Learned</span>` : ''}</div>
          <div class="levelbar sm">${Array.from({ length: 10 }, (_, i) => `<i class="${i < best ? 'on' : ''}"></i>`).join('')}</div>
          <div class="ocard-bot"><small>Level ${best}/10</small>${masteryBadge(o.id)}</div>`;
        card.onclick = () => { sfx.tap(); show('opening', { id: o.id }); };
        list.appendChild(card);
      }
    };
    main.querySelector('.search').oninput = render;
    main.querySelectorAll('.chips button').forEach((b) => { b.onclick = () => { filter = b.dataset.f; main.querySelectorAll('.chips button').forEach((x) => x.classList.toggle('on', x === b)); render(); }; });
    render();
    app.append(main, tabbar('openings'));
  },

  opening({ id }) {
    const o = OPENINGS.find((x) => x.id === id);
    if (!o) return show('openings');
    const p = openingProgress(id);
    const top = h('header', 'subhead', `<button class="icon-btn" aria-label="Back">${icon('back')}</button><b>${esc(o.name)}</b><span></span>`);
    top.querySelector('button').onclick = goBack;
    const main = h('main', 'opening');
    main.innerHTML = `
      <section class="ohero ${o.side}">
        <div class="ohero-top">${sideIcon(o.side)}<span class="eco">${o.eco}</span>${masteryBadge(id)}</div>
        <p>${esc(o.blurb)}</p>
        <div class="core">${coreHtml(o)}</div>
        <ul class="ideas">${o.ideas.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="row2">
          <button class="btn primary" id="learn">${icon('book')}${p.lesson ? 'Review' : 'Learn'}</button>
          <button class="btn ghost" id="drill">${icon('layers')}Drill</button>
        </div>
      </section>
      <h3 class="path-title">Level path</h3>
      <p class="muted path-sub">Each level's bot answers with a different variation and plays stronger. Play the ${esc(o.name)} and win!</p>
      <div class="path"></div>`;
    main.querySelector('#learn').onclick = () => startLesson(o, 'lesson');
    main.querySelector('#drill').onclick = () => startLesson(o, 'drill');
    const path = main.querySelector('.path');
    for (let L = 1; L <= 10; L++) {
      const lv = o.levels[L - 1];
      const unlocked = isLevelUnlocked(id, L);
      const done = p.best >= L;
      const stars = (p.levels[L] && p.levels[L].stars) || 0;
      const mile = MILESTONES.find((m) => m.level === L);
      const botP = botById(LEVEL_BOTS[L - 1]);
      const node = h('div', `pnode ${L % 2 ? 'l' : 'r'} ${done ? 'done' : unlocked ? 'open' : 'locked'} ${!done && unlocked ? 'current' : ''} ${mile ? 'has-mile' : ''}`);
      node.innerHTML = `
        <button class="pcircle" aria-label="Level ${L}">${done ? icon('check') : unlocked ? L : icon('lock')}</button>
        <div class="pinfo"><b>Level ${L}</b><small class="pbot"><img src="${botP.img}" alt="">${esc(botP.name)} · ${lv.elo}</small>
          <div class="pstars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}">${icon('star')}</span>`).join('')}</div>
          ${done ? `<small class="var">${esc(lv.label)}</small>` : ''}</div>
        ${mile ? `<div class="pmile ${done ? 'got' : ''}">${icon(mile.icon)}${mile.title}</div>` : ''}`;
      node.querySelector('.pcircle').onclick = () => { if (unlocked) levelSheet(o, L); else { sfx.wrong(); toast({ icon: 'lock', name: `Level ${L} is locked`, desc: `Beat level ${L - 1} first.` }); } };
      path.appendChild(node);
    }
    app.append(top, main);
  },

  play() {
    app.appendChild(header());
    const main = h('main', 'playsetup');
    let sel = BOTS.find((b) => b.id === (P.settings.lastBot || 'lila')) || BOTS[0];
    let elo = P.settings.lastElo || sel.elo;
    let color = P.settings.lastColor || 'w';
    main.innerHTML = `<h1>Play a bot</h1><div class="bots"></div>
      <section class="card setup">
        <div class="sel-bot"></div>
        <label class="slider"><span>Difficulty <b id="eloVal"></b></span><input type="range" id="elo" min="${MIN_ELO}" max="${MAX_ELO}" step="25"></label>
        <div class="elo-scale"><span>Beginner</span><span>Club</span><span>Expert</span><span>Master</span></div>
        <div class="seg" id="color">${[['w', 'White'], ['r', 'Random'], ['b', 'Black']].map(([k, l]) => `<button data-c="${k}">${k === 'r' ? icon('dice') : `<span class="side ${k}"><i></i></span>`}${l}</button>`).join('')}</div>
        ${assistControls()}
        <button class="btn primary big" id="go">Play!</button>
      </section>`;
    const botsEl = main.querySelector('.bots');
    const selEl = main.querySelector('.sel-bot');
    const eloIn = main.querySelector('#elo');
    const eloVal = main.querySelector('#eloVal');
    const drawSel = () => {
      const rec = P.bots[sel.id];
      selEl.innerHTML = `${portrait(sel, 'lg')}
        <div><b>${esc(sel.name)}</b><br><span class="tag">${esc(sel.style)} · ${sel.elo}</span><p>${esc(sel.bio)}</p>${rec ? `<small>Record vs you: ${rec.wins}W ${rec.draws}D ${rec.losses}L</small>` : ''}</div>`;
      botsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === sel.id));
    };
    for (const b of BOTS) {
      const btn = h('button', 'botchip', `${portrait(b)}<small>${esc(b.name.split(' ').slice(-1)[0] === 'Pawn' ? 'Pip' : b.name.split(' ')[0])}</small><i>${b.elo}</i>`);
      btn.dataset.id = b.id;
      btn.onclick = () => { sfx.tap(); sel = b; elo = b.elo; eloIn.value = elo; eloVal.textContent = elo; drawSel(); };
      botsEl.appendChild(btn);
    }
    eloIn.value = elo; eloVal.textContent = elo;
    eloIn.oninput = () => { elo = +eloIn.value; eloVal.textContent = elo; };
    const segs = main.querySelectorAll('#color button');
    const drawColor = () => segs.forEach((b) => b.classList.toggle('on', b.dataset.c === color));
    segs.forEach((b) => { b.onclick = () => { color = b.dataset.c; drawColor(); }; });
    drawColor();
    drawSel();
    wireAssists(main);
    main.querySelector('#go').onclick = () => {
      P.settings.lastBot = sel.id; P.settings.lastElo = elo; P.settings.lastColor = color; save();
      const userColor = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
      startFree(sel, elo, userColor);
    };
    app.append(main, tabbar('play'));
  },

  analyze() {
    app.appendChild(header());
    const main = h('main', 'analyze');
    main.innerHTML = `<h1>Analyze games</h1>
      <section class="card">
        <h3>Import from Chess.com</h3>
        <div class="row2"><input id="user" class="search" placeholder="Chess.com username" value="${esc(P.settings.chesscom || '')}" autocapitalize="off" autocomplete="off"><button class="btn primary" id="fetch">Import</button></div>
        <div id="ccList" class="gamelist"></div>
      </section>
      <section class="card">
        <h3>Paste a PGN</h3>
        <textarea id="pgn" placeholder="[Event &quot;...&quot;]&#10;1. e4 e5 2. Nf3 ..."></textarea>
        <div class="row2"><select id="pgnColor" class="select"><option value="w">I played White</option><option value="b">I played Black</option></select><button class="btn" id="pgnGo">Analyze</button></div>
      </section>
      <section class="card">
        <h3>Your Opening Quest games</h3>
        <div id="myList" class="gamelist"></div>
      </section>`;
    const ccList = main.querySelector('#ccList');
    const fetchBtn = main.querySelector('#fetch');
    fetchBtn.onclick = async () => {
      const user = main.querySelector('#user').value.trim();
      if (!user) return;
      P.settings.chesscom = user; save();
      fetchBtn.disabled = true;
      ccList.innerHTML = '<p class="muted">Loading games…</p>';
      try {
        const games = await fetchRecentGames(user);
        P.stats.imported++;
        save();
        checkAchievements(achCtx()).forEach(toast);
        ccList.innerHTML = games.length ? '' : '<p class="muted">No recent games found.</p>';
        for (const g of games.slice(0, 40)) {
          const b = h('button', 'gitem', `<span class="res ${g.result}">${g.result === 'win' ? 'W' : g.result === 'draw' ? '½' : 'L'}</span>
            <div><b>vs ${esc(g.opponent)} ${g.opponentRating ? `(${g.opponentRating})` : ''}</b><small>${esc(g.opening || '')} · ${g.myColor === 'w' ? 'White' : 'Black'} · ${esc(g.timeClass || '')} · ${g.end ? g.end.toLocaleDateString() : ''}</small></div><span class="go">›</span>`);
          b.onclick = () => {
            try {
              const pg = parsePgn(g.pgn);
              show('review', { game: { moves: pg.moves, startFen: pg.startFen, userColor: g.myColor, title: `vs ${g.opponent}` } });
            } catch (e) { toast({ icon: 'alert', name: 'Could not read game', desc: e.message }); }
          };
          ccList.appendChild(b);
        }
      } catch (e) {
        ccList.innerHTML = `<p class="error">${esc(e.message || 'Could not reach Chess.com. Check your internet connection.')}</p>`;
      } finally { fetchBtn.disabled = false; }
    };
    main.querySelector('#pgnGo').onclick = () => {
      try {
        const pg = parsePgn(main.querySelector('#pgn').value);
        show('review', { game: { moves: pg.moves, startFen: pg.startFen, userColor: main.querySelector('#pgnColor').value, title: `${pg.headers.White || 'White'} vs ${pg.headers.Black || 'Black'}` } });
      } catch (e) { toast({ icon: 'alert', name: 'PGN problem', desc: e.message }); }
    };
    const my = main.querySelector('#myList');
    if (!P.games.length) my.innerHTML = '<p class="muted">Games you play here appear in this list.</p>';
    for (const g of P.games.slice(0, 20)) {
      const b = h('button', 'gitem', `<span class="res ${g.result}">${g.result === 'win' ? 'W' : g.result === 'draw' ? '½' : 'L'}</span>
        <div><b>${esc(g.title)}</b><small>vs ${esc(g.bot)} (${g.elo}) · ${Math.ceil(g.moves.length / 2)} moves · ${new Date(g.date).toLocaleDateString()}</small></div><span class="go">›</span>`);
      b.onclick = () => show('review', { game: g });
      my.appendChild(b);
    }
    app.append(main, tabbar('analyze'));
  },

  review({ game }) {
    current = openReview(app, game, { engines: engines(), exit: goBack, ctx: achCtx, toast });
  },

  trophies() {
    app.appendChild(header());
    const main = h('main', 'trophies');
    const got = ACHIEVEMENTS.filter((a) => P.achievements[a.id]).length;
    main.innerHTML = `<h1>Achievements</h1>
      <section class="card stats">
        <div><b>${got}/${ACHIEVEMENTS.length}</b><small>Achievements</small></div>
        <div><b>${OPENINGS.filter((o) => (P.openings[o.id] || {}).best >= 10).length}</b><small>Mastered</small></div>
        <div><b>${P.stats.levelWins}</b><small>Levels won</small></div>
        <div><b>${P.rating}</b><small>Rating</small></div>
      </section>
      <div class="achgrid">${ACHIEVEMENTS.map((a) => `<div class="ach ${P.achievements[a.id] ? 'got' : ''}"><div class="medal">${icon(P.achievements[a.id] ? a.icon : 'lock')}</div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`).join('')}</div>
      <h3>Opening titles</h3>
      <section class="card">${OPENINGS.filter((o) => mastery(o.id).best > 0).map((o) => `<div class="row-line"><span>${esc(o.name)}</span><span>Lv ${mastery(o.id).best} ${masteryBadge(o.id)}</span></div>`).join('') || '<p class="muted">Win levels to earn titles: Strong Beginner (level 3), Intermediate (5), Advanced (8) and Master (10).</p>'}</section>`;
    app.append(main, tabbar('trophies'));
  },

  settings() {
    const top = h('header', 'subhead', `<button class="icon-btn" aria-label="Back">${icon('back')}</button><b>Profile & settings</b><span></span>`);
    top.querySelector('button').onclick = goBack;
    const main = h('main', 'settings');
    main.innerHTML = `
      <section class="card"><h3>Your name</h3><input id="name" class="search" maxlength="18" value="${esc(P.name)}"></section>
      <section class="card"><h3>Appearance</h3><div class="seg" id="appPick"><button data-m="dark">Dark</button><button data-m="light">Light</button><button data-m="system">Phone</button></div><p class="muted small">Phone follows your phone's light or dark setting.</p></section>
      <section class="card"><h3>Board & pieces</h3><div id="themeSlot"></div></section>
      <section class="card"><h3>Game</h3>
        <label class="switch"><input type="checkbox" id="snd" ${P.settings.sound ? 'checked' : ''}><span>Sound <small>Move, capture, check and game sounds</small></span></label>
        <label class="switch"><input type="checkbox" data-s="liveAnalysis" ${P.settings.liveAnalysis !== false ? 'checked' : ''}><span>Analysis during the game <small>Move grades, advantage bar and better-move arrows after the opening. Off: only at the end, in the review.</small></span></label>
        <label class="switch"><input type="checkbox" data-s="hints" ${P.settings.hints !== false ? 'checked' : ''}><span>Hint button <small>Show the Hint button in games</small></span></label>
        <label class="switch"><input type="checkbox" data-s="confirmMove" ${P.settings.confirmMove ? 'checked' : ''}><span>Confirm moves <small>Tap Play to send each move, or Cancel to take it back</small></span></label>
        <label class="switch"><input type="checkbox" data-s="premove" ${P.settings.premove ? 'checked' : ''}><span>Premoves <small>Queue your next move while the bot is thinking</small></span></label>
        <div class="set-row"><span>Piece animation<small>How pieces glide between squares</small></span><div class="seg" id="animPick">${['off', 'fast', 'normal', 'slow'].map((a) => `<button data-a="${a}">${a[0].toUpperCase() + a.slice(1)}</button>`).join('')}</div></div>
        <div class="set-row"><span>Hold to draw arrows<small>Hold a square, then drag to draw an arrow (let go on the same square for a circle). Tap the board to clear.</small></span><div class="seg" id="holdPick">${[['short', '0.5 s'], ['medium', '1 s'], ['long', '2 s']].map(([v, l]) => `<button data-h="${v}">${l}</button>`).join('')}</div></div>
        <label class="switch"><input type="checkbox" id="vib" ${P.settings.vibrate ? 'checked' : ''}><span>Vibration</span></label>
      </section>
      <section class="card"><h3>Default help in games</h3>${assistControls()}</section>
      <section class="card danger"><h3>Reset</h3><p class="muted">Delete all progress, XP and achievements on this phone.</p><button class="btn ghost" id="reset">Reset progress</button></section>
      <p class="muted center small">Opening Quest is free software (GPL-3.0) · <a href="https://github.com/deon20p-sudo/opening-quest" target="_blank" rel="noopener">Source code</a> · <a href="https://deon20p-sudo.github.io/opening-quest/privacy-policy.html" target="_blank" rel="noopener">Privacy</a><br>Stockfish 17.1 (GPLv3) · chessground (GPLv3) · chess.js (BSD) · piece sets from Lichess · sounds from Kenney (CC0)<br>Chess.com import uses their public API. Not affiliated with Chess.com.</p>`;
    main.querySelector('#name').onchange = (e) => { P.name = e.target.value.trim() || 'Player'; save(); };
    main.querySelector('#themeSlot').appendChild(themePicker());
    const mp = main.querySelectorAll('#appPick button');
    const drawApp = () => mp.forEach((b) => b.classList.toggle('on', b.dataset.m === (P.settings.appearance || 'dark')));
    mp.forEach((b) => { b.onclick = () => { setAppearance(b.dataset.m); drawApp(); sfx.tap(); }; });
    drawApp();
    main.querySelector('#snd').onchange = (e) => { P.settings.sound = e.target.checked; save(); sfx.tap(); };
    main.querySelector('#vib').onchange = (e) => { P.settings.vibrate = e.target.checked; save(); };
    main.querySelectorAll('[data-s]').forEach((x) => { x.onchange = () => { P.settings[x.dataset.s] = x.checked; save(); sfx.tap(); }; });
    const ap = main.querySelectorAll('#animPick button');
    const drawAnim = () => ap.forEach((b) => b.classList.toggle('on', b.dataset.a === (P.settings.animation || 'normal')));
    ap.forEach((b) => { b.onclick = () => { P.settings.animation = b.dataset.a; save(); drawAnim(); sfx.tap(); }; });
    drawAnim();
    const hp = main.querySelectorAll('#holdPick button');
    const drawHold = () => hp.forEach((b) => b.classList.toggle('on', b.dataset.h === (P.settings.arrowHold || 'medium')));
    hp.forEach((b) => { b.onclick = () => { P.settings.arrowHold = b.dataset.h; save(); drawHold(); sfx.tap(); }; });
    drawHold();
    wireAssists(main);
    main.querySelector('#reset').onclick = () => { if (confirm('Really delete all progress?')) { resetAll(); stack.length = 0; show('home'); } };
    app.append(top, main);
  },
};

// ---------- assists (help) controls ----------
function assistControls() {
  const s = P.settings;
  const off = !s.assistArrows && !s.assistEval && !s.assistCoach;
  return `<div class="assists">
    <label class="switch master"><input type="checkbox" data-a="none" ${off ? 'checked' : ''}><span><b>No help</b><small>No arrows, eval bar or coach tips until the game ends. Then you can review.</small></span></label>
    <label class="switch"><input type="checkbox" data-a="assistArrows" ${s.assistArrows ? 'checked' : ''}><span>Arrow aid <small>Opening arrows, better-move arrows, hints</small></span></label>
    <label class="switch"><input type="checkbox" data-a="assistEval" ${s.assistEval ? 'checked' : ''}><span>Advantage bar <small>Shows who is ahead after every move</small></span></label>
    <label class="switch"><input type="checkbox" data-a="assistCoach" ${s.assistCoach ? 'checked' : ''}><span>Coach tips <small>Move grades and bot advice</small></span></label>
  </div>`;
}
function wireAssists(root) {
  const boxes = root.querySelectorAll('.assists input');
  const sync = () => {
    const off = !P.settings.assistArrows && !P.settings.assistEval && !P.settings.assistCoach;
    boxes.forEach((b) => { b.checked = b.dataset.a === 'none' ? off : !!P.settings[b.dataset.a]; });
  };
  boxes.forEach((b) => {
    b.onchange = () => {
      if (b.dataset.a === 'none') {
        const on = !b.checked;
        P.settings.assistArrows = P.settings.assistEval = P.settings.assistCoach = on;
      } else P.settings[b.dataset.a] = b.checked;
      save();
      sync();
    };
  });
}
const currentAssists = () => ({ arrows: P.settings.assistArrows, eval: P.settings.assistEval, coach: P.settings.assistCoach });

// ---------- starting games ----------
function coreHtml(o) {
  const mv = o.levels[9].moves.slice(0, o.coreLen);
  return mv.map((m, i) => `${i % 2 === 0 ? `<i>${i / 2 + 1}.</i>` : ''}<span class="${(i % 2 === 0 ? 'w' : 'b') === o.side ? 'you' : ''}">${esc(m)}</span>`).join(' ');
}

function gameEnv(cfgFactory) {
  return {
    engines: engines(),
    exit: goBack,
    toast, modal, confetti, ctx: achCtx,
    review: (game) => { show('review', { game: { ...game, startFen: undefined } }); },
    retry: () => { const top = stack[stack.length - 1]; show(top.name, top.params, { push: false }); },
    next: cfgFactory,
  };
}

function startLesson(o, mode) {
  show('game', { kind: 'lesson', id: o.id, mode });
}

function startLevel(o, level) {
  show('game', { kind: 'level', id: o.id, level, assists: currentAssists() });
}

function levelSheet(o, L) {
  const lv = o.levels[L - 1];
  const botP = botById(LEVEL_BOTS[L - 1]);
  const prog = openingProgress(o.id).levels[L];
  const mile = MILESTONES.find((m) => m.level === L);
  modal({
    img: botP.img,
    title: `Level ${L} · ${botP.name}`,
    body: `<p>Rated <b>${lv.elo}</b>. Play the <b>${esc(o.name)}</b> as ${o.side === 'w' ? 'White' : 'Black'} — this bot answers with a new variation, then tries to beat you.</p>
      <p class="muted">You have three lives for moves that leave the opening.</p>
      ${mile ? `<p class="mile-note">Win to earn the title <b>${mile.title}</b> in this opening.</p>` : ''}
      ${prog ? `<p>Best result: ${prog.stars} of 3 stars</p>` : ''}
      <div class="sheet-assists">${assistControls()}</div>`,
    buttons: [
      { label: 'Start level', primary: true, run: () => startLevel(o, L) },
      { label: 'Cancel' },
    ],
  });
  wireAssists(document.getElementById('modal'));
}

function startFree(bot, elo, userColor) {
  show('game', { kind: 'free', botId: bot.id, elo, userColor, assists: currentAssists() });
}

SCREENS.game = (params) => {
  let cfg;
  if (params.kind === 'lesson') {
    const o = OPENINGS.find((x) => x.id === params.id);
    // lessons teach the standard main line (curated where the engine's top line is a sideline)
    const mainLine = o.main || o.levels[9].moves;
    cfg = {
      mode: params.mode, opening: o, line: mainLine, userColor: o.side,
      bot: { name: 'Coach Lila', img: botById('lila').img, color: '#5ad1a4', style: params.mode === 'drill' ? 'Drill' : 'Lesson', lines: botById('lila').lines },
      elo: 1200, assists: { arrows: params.mode === 'lesson', eval: true, coach: true },
      title: o.name, subtitle: params.mode === 'drill' ? 'Drill · from memory' : 'Lesson · main line',
    };
  } else if (params.kind === 'level') {
    const o = OPENINGS.find((x) => x.id === params.id);
    const lv = o.levels[params.level - 1];
    cfg = {
      mode: 'level', opening: o, level: params.level, line: lv.moves, userColor: o.side,
      bot: botById(LEVEL_BOTS[params.level - 1]), elo: lv.elo, assists: params.assists,
      title: o.name, subtitle: `Level ${params.level} of 10`,
    };
  } else {
    const bot = botById(params.botId);
    cfg = { mode: 'free', line: [], userColor: params.userColor, bot, elo: params.elo, assists: params.assists, title: `vs ${bot.name}`, subtitle: `${params.elo} rating` };
  }
  const env = gameEnv((next) => {
    if (next.mode === 'level') {
      const o = cfg.opening;
      const L = Math.min(10, next.level);
      if (!isLevelUnlocked(o.id, L)) return show('opening', { id: o.id });
      // replace the current game screen in history
      stack.pop();
      show('game', { kind: 'level', id: o.id, level: L, assists: currentAssists() });
    } else if (next.mode === 'drill') {
      stack.pop();
      show('game', { kind: 'lesson', id: cfg.opening.id, mode: 'drill' });
    }
  });
  env.review = (game) => { stack.pop(); show('review', { game }); };
  current = openGame(app, cfg, env);
};

function applyBoardTheme() { applyTheme(); }

// ---------- boot ----------
async function boot() {
  try {
    const r = await fetch('data/openings.json');
    const data = await r.json();
    OPENINGS = data.openings;
    LEVEL_ELO = data.levelElo;
  } catch (e) {
    app.innerHTML = `<p class="error center">Could not load openings: ${esc(e.message)}</p>`;
    return;
  }
  touchStreak();
  save();
  applyBoardTheme();
  checkAchievements(achCtx());
  show('home');
  // warm up the engines in the background so the first game starts instantly
  setTimeout(() => engines(), 400);
}
boot();

window.__oq = { P, OPENINGS: () => OPENINGS, show, engines, stack, get current() { return current; } };
void LEVEL_ELO;
