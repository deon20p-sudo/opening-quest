// Board sounds: short wooden clicks from web/sounds (made from CC0 recordings), with synthesized
// fallbacks from sfxsynth.js. Also haptics.
import { P } from './progress.js';
import { RECIPES, render } from './sfxsynth.js';

let ctx = null;
let master = null;
const cache = new Map();

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.9;
    // gentle low cut so phone speakers don't distort the thump
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 70;
    master.connect(hp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Recorded board sounds (web/sounds/*.wav). Until they have loaded, the synthesized versions play.
const FILES = ['move', 'capture', 'castle', 'check', 'promote', 'start', 'gameover', 'mate', 'wrong', 'tap'];
const recorded = new Map();
let loading = null;
function loadFiles() {
  if (loading || !ac()) return loading;
  loading = Promise.all(FILES.map(async (n) => {
    try {
      const r = await fetch(`sounds/${n}.wav`);
      if (!r.ok) return;
      const data = await r.arrayBuffer();
      const buf = await new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));
      recorded.set(n, buf);
    } catch { /* keep the synthesized sound */ }
  }));
  return loading;
}

function buffer(name) {
  if (recorded.has(name)) return recorded.get(name);
  if (cache.has(name)) return cache.get(name);
  const a = ac();
  const d = render(name, a.sampleRate);
  const buf = a.createBuffer(1, d.length, a.sampleRate);
  buf.getChannelData(0).set(d);
  cache.set(name, buf);
  return buf;
}

const LEVEL = { move: 0.85, capture: 0.9, castle: 0.85, check: 0.9, promote: 0.85, mate: 1, start: 0.8, gameover: 0.85, wrong: 0.75, tap: 0.35 };
let lastEndAt = 0;

function play(name, vary = true) {
  if (!P.settings.sound) return;
  const a = ac();
  if (!a) return;
  loadFiles();
  try {
    const s = a.createBufferSource();
    s.buffer = buffer(name);
    // tiny pitch/volume variation so repeated moves don't sound mechanical
    if (vary) s.playbackRate.value = 0.985 + Math.random() * 0.03;
    const g = a.createGain();
    g.gain.value = LEVEL[name] * (vary ? 0.9 + Math.random() * 0.1 : 1);
    s.connect(g).connect(master);
    s.start();
  } catch { /* audio not available */ }
}

export const sfx = {
  /** The right sound for a chess.js move: mate, check, castle, promotion, capture or a plain move. */
  play(m) {
    if (!m) return;
    if (m.san.includes('#')) { lastEndAt = performance.now(); play('mate', false); }
    else if (m.san.includes('+')) play('check');
    else if (m.san.startsWith('O-O')) play('castle');
    else if (m.promotion) play('promote');
    else if (m.captured) play('capture');
    else play('move');
  },
  move: () => play('move'),
  capture: () => play('capture'),
  castle: () => play('castle'),
  check: () => play('check'),
  mate: () => play('mate', false),
  start: () => play('start', false),
  /** Game over (resign, draw, out of lives) — skipped right after a checkmate, which has its own sound. */
  gameover: () => { if (performance.now() - lastEndAt > 1500) { lastEndAt = performance.now(); play('gameover', false); } },
  wrong: () => play('wrong'),
  tap: () => play('tap'),
  // No jingles: winning, losing, finishing a level and achievements are silent on purpose.
  right() {}, win() { sfx.gameover(); }, lose() { sfx.gameover(); }, unlock() {},
};

export function buzz(ms = 40) {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // phones only allow it after a tap
  if (P.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* ignore */ } }
}

// Build the sound buffers after the first tap, a few at a time, so the first move doesn't stutter.
addEventListener('pointerdown', function warm() {
  removeEventListener('pointerdown', warm, true);
  if (!ac()) return;
  loadFiles();
  const names = Object.keys(RECIPES);
  const step = () => { const n = names.shift(); if (!n) return; try { buffer(n); } catch { /* ignore */ } setTimeout(step, 30); };
  setTimeout(step, 50);
}, true);
