// Pure sound synthesis (no DOM): short, dry wooden clicks in the style of online chess sites —
// a sharp broadband contact click plus a very short low "thock", no ringing tones.
// Used by sfx.js in the app and by tools/render-sounds.mjs to compare with reference recordings.

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; }

const THOCK = [ // [frequency Hz, decay s, amplitude]
  [210, 0.016, 0.55], [420, 0.010, 0.6], [690, 0.0065, 0.5], [1080, 0.0045, 0.38], [1700, 0.003, 0.24], [2600, 0.002, 0.14],
];

/** One knock of a piece on the board, added into `out` at time t0 (seconds). */
function knock(out, sr, t0, { pitch = 1, decay = 1, click = 1, clickDecay = 0.0012, hp = 0.55, body = 0.22, gain = 1, seed = 1, modes = THOCK, tail = 0 } = {}) {
  const start = Math.floor(t0 * sr);
  const n = Math.min(out.length - start, Math.floor(0.2 * sr));
  const rnd = rng(seed);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const atk = 1 - Math.exp(-t / 0.0002);
    let v = 0;
    for (const [f, d, a] of modes) v += a * Math.exp(-t / (d * decay)) * Math.sin(2 * Math.PI * f * pitch * t + a);
    v += body * Math.exp(-t / (0.02 * decay)) * Math.sin(2 * Math.PI * 105 * pitch * t);
    const r = rnd();
    const nz = r * (click * Math.exp(-t / clickDecay) + tail * Math.exp(-t / 0.035));
    v += nz - prev * hp; // high-passed noise: the "tick" of contact
    prev = nz;
    out[start + i] += v * atk * gain;
  }
}

/** A piece sliding across the board (quiet filtered noise swelling and fading). */
function slide(out, sr, t0, dur, { gain = 0.12, seed = 41 } = {}) {
  const start = Math.floor(t0 * sr);
  const n = Math.min(out.length - start, Math.floor(dur * sr));
  const rnd = rng(seed);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const env = Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 1.5;
    lp += (rnd() - lp) * 0.35; // soften the hiss
    out[start + i] += lp * env * gain;
  }
}

export const RECIPES = {
  move: (o, sr) => knock(o, sr, 0, { seed: 3 }),
  capture: (o, sr) => {
    knock(o, sr, 0, { pitch: 1.45, click: 1.2, clickDecay: 0.0035, hp: 0.35, decay: 1.1, gain: 1, seed: 5 });
    knock(o, sr, 0.011, { pitch: 1.2, click: 0.7, decay: 0.8, body: 0.15, gain: 0.6, seed: 9 });
  },
  castle: (o, sr) => { slide(o, sr, 0, 0.085); knock(o, sr, 0.097, { pitch: 1.1, seed: 7 }); },
  check: (o, sr) => knock(o, sr, 0, { pitch: 1.75, click: 1.3, clickDecay: 0.0009, hp: 0.8, decay: 0.8, body: 0.12, tail: 0.03, seed: 11 }),
  promote: (o, sr) => { knock(o, sr, 0, { seed: 3 }); knock(o, sr, 0.07, { pitch: 1.6, gain: 0.55, body: 0, seed: 17 }); },
  start: (o, sr) => { knock(o, sr, 0, { pitch: 0.95, seed: 31 }); knock(o, sr, 0.13, { pitch: 1.05, seed: 33 }); },
  gameover: (o, sr) => { knock(o, sr, 0, { pitch: 1.0, seed: 35 }); knock(o, sr, 0.13, { pitch: 0.9, seed: 37 }); },
  mate: (o, sr) => {
    knock(o, sr, 0, { pitch: 1.2, click: 1.2, seed: 19 });
    knock(o, sr, 0.04, { pitch: 1.0, seed: 21 });
    knock(o, sr, 0.17, { pitch: 0.88, seed: 23 });
  },
  // a dull, low knock for a move that isn't the opening move
  wrong: (o, sr) => knock(o, sr, 0, { pitch: 0.6, decay: 1.6, click: 0.35, body: 0.6, gain: 0.9, seed: 25 }),
  tap: (o, sr) => knock(o, sr, 0, { pitch: 2.2, decay: 0.4, click: 0.4, body: 0, gain: 0.25, seed: 29 }),
};

/** Render a recipe to a normalised Float32Array (peak 0.9), trimmed of silence. */
export function render(name, sr) {
  const out = new Float32Array(Math.floor(sr * 0.6));
  RECIPES[name](out, sr);
  let peak = 0, last = 0;
  for (let i = 0; i < out.length; i++) { const v = Math.abs(out[i]); if (v > peak) peak = v; if (v > 2e-4) last = i; }
  const len = Math.max(1, last + 1);
  const k = peak > 0 ? 0.9 / peak : 1;
  const res = new Float32Array(len);
  for (let i = 0; i < len; i++) res[i] = out[i] * k;
  return res;
}
