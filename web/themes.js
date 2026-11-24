// Board colours and piece sets the player can pick in Settings (or from the game screen).
import { P, save } from './progress.js';

export const BOARDS = [
  { id: 'green', name: 'Green', light: '#ebecd0', dark: '#739552' },
  { id: 'brown', name: 'Brown', light: '#f0d9b5', dark: '#b58863' },
  { id: 'wood', name: 'Walnut', light: '#e6cfa6', dark: '#8a5f3c', img: 'img/board-wood.jpg' },
  { id: 'blue', name: 'Blue', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'purple', name: 'Purple', light: '#efedf5', dark: '#8877b7' },
  { id: 'sand', name: 'Sand', light: '#f2e6cf', dark: '#c9a874' },
  { id: 'slate', name: 'Slate', light: '#dfdbd2', dark: '#7d8a86' },
  { id: 'rose', name: 'Rose', light: '#f3e2e0', dark: '#bf8a8c' },
  { id: 'night', name: 'Night', light: '#a3acb5', dark: '#5a636d' },
];

// Free piece sets (licences in vendor/piecesets/LICENSES.txt).
export const PIECES = [
  { id: 'cburnett', name: 'Classic' },
  { id: 'merida', name: 'Merida' },
  { id: 'chessnut', name: 'Chessnut' },
  { id: 'mpchess', name: 'Modern' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'celtic', name: 'Celtic' },
  { id: 'spatial', name: 'Spatial' },
];

const ROLES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export const boardTheme = () => BOARDS.find((b) => b.id === P.settings.board) || BOARDS[0];
export const pieceSet = () => PIECES.find((p) => p.id === P.settings.pieces) || PIECES[0];

/** URL of one piece image, e.g. pieceUrl('w', 'n'). */
export function pieceUrl(color, role, set = pieceSet().id) {
  return set === 'cburnett' ? `vendor/pieces/${color}${role}.svg` : `vendor/piecesets/${set}/${color}${role.toUpperCase()}.svg`;
}

/** An 8×8 checkerboard as an SVG data URL (a8 light, a1 dark). */
export function boardSvg(b, n = 8) {
  let rects = '';
  for (let r = 0; r < n; r++) for (let f = 0; f < n; f++) if ((r + f) % 2) rects += `<rect x='${f}' y='${r}' width='1' height='1'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${n} ${n}' shape-rendering='crispEdges'><rect width='${n}' height='${n}' fill='${b.light}'/><g fill='${b.dark}'>${rects}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function applyTheme() {
  applyAppearance();
  const b = boardTheme();
  const s = document.body.style;
  s.setProperty('--sq-light', b.light);
  s.setProperty('--sq-dark', b.dark);
  s.setProperty('--board-img', b.img ? `url(${b.img})` : boardSvg(b));
  let st = document.getElementById('piece-theme');
  if (!st) { st = document.createElement('style'); st.id = 'piece-theme'; document.head.appendChild(st); }
  const set = pieceSet().id;
  st.textContent = set === 'cburnett' ? '' : Object.entries(ROLES).flatMap(([r, name]) =>
    ['w', 'b'].map((c) => `.cg-wrap piece.${name}.${c === 'w' ? 'white' : 'black'}{background-image:url(${pieceUrl(c, r, set)})}`)).join('\n');
}

// ---------- appearance: dark / light / follow the phone ----------
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
export function resolvedAppearance() {
  const a = P.settings.appearance || 'dark';
  return a === 'system' ? (mq && mq.matches ? 'light' : 'dark') : a;
}
export function applyAppearance() {
  const mode = resolvedAppearance();
  document.documentElement.dataset.theme = mode;
  const bg = mode === 'light' ? '#f3f0ea' : '#21201d';
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = bg;
  // Tell the Android / iPhone wrapper so the status bar matches (dark icons on light).
  try { if (window.AndroidApp && window.AndroidApp.setTheme) window.AndroidApp.setTheme(mode === 'light', bg); } catch { /* not in the app */ }
  try { window.webkit?.messageHandlers?.theme?.postMessage({ light: mode === 'light', bg }); } catch { /* not on iPhone */ }
}
if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (P.settings.appearance === 'system') applyAppearance(); });
export function setAppearance(a) { P.settings.appearance = a; save(); applyAppearance(); }

export function setBoard(id) { P.settings.board = id; save(); applyTheme(); }
export function setPieces(id) { P.settings.pieces = id; save(); applyTheme(); }

/** Small HTML picker (board swatches + piece sets) with a live preview. */
export function themePicker() {
  const el = document.createElement('div');
  el.className = 'theme-picker';
  const draw = () => {
    const cur = boardTheme(), ps = pieceSet();
    el.innerHTML = `
      <div class="tp-preview${cur.img ? ' img' : ''}" style="--sq-light:${cur.light};--sq-dark:${cur.dark};--board-img:${cur.img ? `url(${cur.img})` : 'none'}">
        ${['r', 'n', 'b', 'q'].map((r, i) => `<span class="${i % 2 ? 'd' : 'l'}"><img src="${pieceUrl('b', r)}" alt=""></span>`).join('')}
        ${['p', 'p', 'p', 'p'].map((r, i) => `<span class="${i % 2 ? 'l' : 'd'}"><img src="${pieceUrl('b', r)}" alt=""></span>`).join('')}
        ${['p', 'p', 'p', 'p'].map((r, i) => `<span class="${i % 2 ? 'd' : 'l'}"><img src="${pieceUrl('w', r)}" alt=""></span>`).join('')}
        ${['r', 'n', 'b', 'k'].map((r, i) => `<span class="${i % 2 ? 'l' : 'd'}"><img src="${pieceUrl('w', r)}" alt=""></span>`).join('')}
      </div>
      <label class="tp-label">Board · ${cur.name}</label>
      <div class="tp-row">${BOARDS.map((b) => `<button class="tp-board ${b.id === cur.id ? 'on' : ''}" data-b="${b.id}" aria-label="${b.name}" style="--l:${b.light};--d:${b.dark};${b.img ? `background-image:url(${b.img})` : ''}"><i></i><i></i><i></i><i></i></button>`).join('')}</div>
      <label class="tp-label">Pieces · ${ps.name}</label>
      <div class="tp-row">${PIECES.map((p) => `<button class="tp-piece ${p.id === ps.id ? 'on' : ''}" data-p="${p.id}" aria-label="${p.name}"><img src="${pieceUrl('w', 'n', p.id)}" alt=""></button>`).join('')}</div>`;
    el.querySelectorAll('[data-b]').forEach((x) => { x.onclick = () => { setBoard(x.dataset.b); draw(); }; });
    el.querySelectorAll('[data-p]').forEach((x) => { x.onclick = () => { setPieces(x.dataset.p); draw(); }; });
  };
  draw();
  return el;
}
