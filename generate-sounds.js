#!/usr/bin/env node
/**
 * Word Puzzle Game – Sound Pack Generator
 * Run: node generate-sounds.js
 * No npm packages required – pure Node.js.
 *
 * Generates 26 WAV files into assets/sounds/:
 *   SFX (overwriting existing + new), 5 background music loops.
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const SR         = 44100;           // sample rate
const OUT_DIR    = path.join(__dirname, 'assets', 'sounds');

// ─── WAV writer ──────────────────────────────────────────────────────────────

function saveWav(filename, samples) {
  const nSamples   = samples.length;
  const dataBytes  = nSamples * 2;
  const buf        = Buffer.alloc(44 + dataBytes);
  let o = 0;
  buf.write('RIFF', o); o += 4;
  buf.writeUInt32LE(36 + dataBytes, o); o += 4;
  buf.write('WAVE', o); o += 4;
  buf.write('fmt ', o); o += 4;
  buf.writeUInt32LE(16, o); o += 4;
  buf.writeUInt16LE(1,  o); o += 2;   // PCM
  buf.writeUInt16LE(1,  o); o += 2;   // mono
  buf.writeUInt32LE(SR, o); o += 4;
  buf.writeUInt32LE(SR * 2, o); o += 4;
  buf.writeUInt16LE(2,  o); o += 2;
  buf.writeUInt16LE(16, o); o += 2;
  buf.write('data', o); o += 4;
  buf.writeUInt32LE(dataBytes, o); o += 4;
  for (let i = 0; i < nSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), o);
    o += 2;
  }
  fs.writeFileSync(path.join(OUT_DIR, filename), buf);
  process.stdout.write(`  ✓  ${filename}\n`);
}

// ─── DSP primitives ──────────────────────────────────────────────────────────

const buf  = d  => new Float64Array(Math.round(SR * d));
const nOf  = d  => Math.round(SR * d);

/** ADSR envelope */
function adsr(dur, a, d, s, r) {
  const n = nOf(dur), na = nOf(a), nd = nOf(d), nr = nOf(r);
  const ns = Math.max(0, n - na - nd - nr);
  const e  = new Float64Array(n);
  for (let i = 0; i < na; i++)               e[i]            = i / na;
  for (let i = 0; i < nd; i++)               e[na + i]       = 1 - (1 - s) * (i / nd);
  for (let i = 0; i < ns; i++)               e[na + nd + i]  = s;
  for (let i = 0; i < nr && na+nd+ns+i < n; i++) e[na+nd+ns+i] = s * (1 - i / nr);
  return e;
}

function applyEnv(sig, env) {
  const out = new Float64Array(sig.length);
  const len = Math.min(sig.length, env.length);
  for (let i = 0; i < len; i++) out[i] = sig[i] * env[i];
  return out;
}

function fade(sig, fs = 200) {
  const out = new Float64Array(sig);
  const f   = Math.min(fs, Math.floor(sig.length / 2));
  for (let i = 0; i < f; i++) { out[i] *= i / f; out[sig.length - 1 - i] *= i / f; }
  return out;
}

function normalize(sig, pk = 0.88) {
  let mx = 0;
  for (const v of sig) if (Math.abs(v) > mx) mx = Math.abs(v);
  if (mx < 1e-10) return sig;
  const out = new Float64Array(sig.length), sc = pk / mx;
  for (let i = 0; i < sig.length; i++) out[i] = sig[i] * sc;
  return out;
}

function sine(f, d) {
  const out = new Float64Array(nOf(d));
  for (let i = 0; i < out.length; i++) out[i] = Math.sin(2 * Math.PI * f * i / SR);
  return out;
}

/** FM bell / chime */
function bell(f, d, brt = 0.42) {
  const out = new Float64Array(nOf(d));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const m = Math.sin(2 * Math.PI * f * 2.756 * t);
    out[i]  = Math.sin(2 * Math.PI * f * t + brt * 5 * m);
  }
  return out;
}

/** Linear frequency sweep */
function sweep(f0, f1, d) {
  const out = new Float64Array(nOf(d));
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const f = f0 + (f1 - f0) * (i / out.length);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph);
  }
  return out;
}

function noise(d) {
  const out = new Float64Array(nOf(d));
  for (let i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;
  return out;
}

/** Add source into target at offset (in seconds), scaled by amp */
function place(tgt, src, tSec, amp = 1) {
  const off = Math.round(SR * tSec);
  const len = Math.min(src.length, tgt.length - off);
  for (let i = 0; i < len; i++) tgt[off + i] += src[i] * amp;
}

/** Mix all layers into a new array */
function mix(...layers) {
  const n = Math.max(...layers.map(l => l.length));
  const o = new Float64Array(n);
  for (const l of layers) for (let i = 0; i < l.length; i++) o[i] += l[i];
  return o;
}

// ─── Extra DSP for a polished, modern "candy" feel ──────────────────────────

/** Bright mallet / marimba tone (sine + soft harmonics) */
function mallet(f, d) {
  const out = new Float64Array(nOf(d));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = Math.sin(2 * Math.PI * f * t)
           + 0.20 * Math.sin(2 * Math.PI * f * 2 * t)
           + 0.09 * Math.sin(2 * Math.PI * f * 3 * t);
  }
  return out;
}

/** Juicy "pop" — exponential pitch glide from f0 to f1 */
function pop(f0, f1, d) {
  const out = new Float64Array(nOf(d));
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const f = f0 * Math.pow(f1 / f0, i / out.length);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph);
  }
  return out;
}

/** Low-passed (soft) noise for airy transients */
function softNoise(d, lp = 0.35) {
  const out = noise(d);
  let prev = 0;
  for (let i = 0; i < out.length; i++) { prev += lp * (out[i] - prev); out[i] = prev; }
  return out;
}

/** Subtle feedback reverb tail — adds space/polish. Buffer needs tail room. */
function reverb(sig, mixAmt = 0.18) {
  const out = new Float64Array(sig);
  const taps = [0.013, 0.023, 0.034, 0.048];
  for (const tap of taps) {
    const dly = Math.round(tap * SR);
    for (let rep = 1; rep <= 5; rep++) {
      const off = dly * rep;
      const a = mixAmt * Math.pow(0.55, rep);
      for (let i = off; i < out.length; i++) out[i] += sig[i - off] * a;
    }
  }
  return out;
}

// ─── SFX generators ──────────────────────────────────────────────────────────

function genTap() {
  // Juicy candy "pop" — quick downward blip + glassy overtone
  const d = 0.18, t = buf(d);
  place(t, applyEnv(pop(880, 500, 0.085), adsr(0.085, 0.002, 0.028, 0, 0.055)), 0, 0.70);
  place(t, applyEnv(softNoise(0.006), adsr(0.006, 0, 0.002, 0, 0.004)), 0, 0.20);
  place(t, applyEnv(bell(1560, 0.10, 0.30), adsr(0.10, 0.002, 0.03, 0.05, 0.06)), 0.002, 0.16);
  return fade(normalize(reverb(t, 0.10), 0.72));
}

function genMenuOpen() {
  // Bright bubbly rise — pop glide + sparkle trio
  const d = 0.36, t = buf(d);
  place(t, applyEnv(pop(420, 980, 0.18), adsr(0.18, 0.006, 0.06, 0.20, 0.10)), 0, 0.42);
  [[1760, 0.06], [2349, 0.10], [3136, 0.15]].forEach(([f, s]) =>
    place(t, applyEnv(bell(f, 0.16, 0.30), adsr(0.16, 0.003, 0.05, 0.06, 0.09)), s, 0.15));
  return fade(normalize(reverb(t, 0.16), 0.74));
}

function genMenuClose() {
  // Soft downward bubble pop
  const d = 0.24, t = buf(d);
  place(t, applyEnv(pop(820, 360, 0.16), adsr(0.16, 0.004, 0.05, 0.18, 0.09)), 0, 0.55);
  place(t, applyEnv(bell(1320, 0.12, 0.25), adsr(0.12, 0.003, 0.04, 0.05, 0.07)), 0, 0.12);
  return fade(normalize(reverb(t, 0.12), 0.66));
}

function genLetterSelect() {
  // Crisp glassy tick — bright mallet + high bell
  const d = 0.12, t = buf(d);
  place(t, applyEnv(mallet(920, 0.10), adsr(0.10, 0.002, 0.03, 0.08, 0.06)), 0, 0.50);
  place(t, applyEnv(bell(1840, 0.08, 0.28), adsr(0.08, 0.002, 0.025, 0.04, 0.05)), 0, 0.16);
  return fade(normalize(reverb(t, 0.08), 0.60));
}

function genWordDrag() {
  const d = 0.40, t = buf(d);
  const sw = applyEnv(sweep(520, 640, d), adsr(d, 0.04, 0.07, 0.60, 0.12));
  const nz = applyEnv(softNoise(d), adsr(d, 0.04, 0.07, 0.60, 0.12));
  for (let i = 0; i < t.length; i++) t[i] = sw[i] * 0.34 + nz[i] * 0.05;
  return fade(normalize(t, 0.44));
}

function genWordFound() {
  // Bright ascending mallet arpeggio C5 E5 G5 C6 + glassy octaves + sparkle
  const d = 0.85, t = buf(d);
  [[523.25, 0.00], [659.25, 0.09], [783.99, 0.18], [1046.50, 0.28]].forEach(([f, s]) => {
    place(t, applyEnv(mallet(f, 0.34), adsr(0.34, 0.004, 0.06, 0.22, 0.22)), s, 0.40);
    place(t, applyEnv(bell(f * 2, 0.26, 0.40), adsr(0.26, 0.004, 0.05, 0.12, 0.16)), s, 0.14);
  });
  [[2093, 0.30], [2637, 0.37]].forEach(([f, s]) =>
    place(t, applyEnv(sine(f, 0.20), adsr(0.20, 0.003, 0.04, 0.06, 0.14)), s, 0.09));
  return fade(normalize(reverb(t, 0.18), 0.82));
}

function genWrong() {
  // Gentle minor-second buzz – Bb3 + B3 (soft, not harsh)
  const d = 0.30, t = buf(d);
  place(t, applyEnv(sine(233.08, d), adsr(d, 0.004, 0.04, 0.32, 0.17)), 0, 0.46);
  place(t, applyEnv(sine(246.94, d), adsr(d, 0.004, 0.04, 0.32, 0.17)), 0, 0.30);
  return fade(normalize(t, 0.58));
}

function genWordCompleted() {
  // 6-note rising sparkle cascade + final glassy ding (very candy)
  const d = 0.60, t = buf(d);
  [[523.25, 0.00], [659.25, 0.06], [783.99, 0.12], [1046.50, 0.18], [1318.51, 0.24], [1567.98, 0.30]]
    .forEach(([f, s]) => {
      const nd = Math.min(0.28, d - s);
      place(t, applyEnv(bell(f, nd, 0.52), adsr(nd, 0.003, 0.045, 0.15, 0.19)), s, 0.40);
    });
  // final shimmer ding
  place(t, applyEnv(bell(2093, 0.26, 0.55), adsr(0.26, 0.003, 0.04, 0.10, 0.18)), 0.32, 0.22);
  return fade(normalize(reverb(t, 0.18), 0.82));
}

function genWin() {
  // Level complete – arpeggio run + final chord + sparkle trail
  const d = 2.5, t = buf(d);
  [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
    const nd = 0.44;
    place(t, applyEnv(mallet(f, nd), adsr(nd, 0.005, 0.08, 0.28, 0.30)), i * 0.09, 0.46);
  });
  // Final chord
  [261.63, 329.63, 392.00, 523.25, 659.25].forEach(f => {
    const nd = 1.55;
    place(t, applyEnv(bell(f, nd, 0.26), adsr(nd, 0.01, 0.18, 0.36, 0.88)), 0.76, 0.38);
  });
  // Sparkle trail
  for (let i = 0; i < 12; i++)
    place(t, applyEnv(sine(1380 + i * 175, 0.22), adsr(0.22, 0.003, 0.04, 0.06, 0.16)), 0.80 + i * 0.12, 0.09);
  return fade(normalize(reverb(t, 0.20), 0.84));
}

function genLevelUnlock() {
  // Rising sweep → sparkle chord burst
  const d = 1.0, t = buf(d);
  place(t, applyEnv(sweep(270, 1200, 0.58), adsr(0.58, 0.02, 0.12, 0.42, 0.28)), 0, 0.38);
  [1047, 1319, 1568, 2093].forEach((f, i) => {
    const nd = 0.42;
    place(t, applyEnv(bell(f, nd, 0.48), adsr(nd, 0.003, 0.06, 0.22, 0.28)), 0.50 + i * 0.06, 0.42);
  });
  return fade(normalize(reverb(t, 0.18), 0.86));
}

function genCoin() {
  // Classic bright coin — quick double ping with a glassy tail (very candy)
  const d = 0.42, t = buf(d);
  [[1319, 0.00], [1976, 0.045]].forEach(([f, s]) => {
    const nd = d - s;
    place(t, applyEnv(bell(f, nd, 0.58), adsr(nd, 0.002, 0.04, 0.14, nd - 0.08)), s, 0.58);
  });
  place(t, applyEnv(sine(2637, 0.18), adsr(0.18, 0.002, 0.03, 0.05, 0.12)), 0.05, 0.12);
  return fade(normalize(reverb(t, 0.16), 0.84));
}

function genReward() {
  // Ascending mallet arpeggio + sparkle burst + reverb glow
  const d = 1.0, t = buf(d);
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    const nd = 0.48;
    place(t, applyEnv(mallet(f, nd), adsr(nd, 0.003, 0.07, 0.25, 0.28)), i * 0.07, 0.44);
    place(t, applyEnv(bell(f * 2, 0.30, 0.42), adsr(0.30, 0.003, 0.05, 0.12, 0.18)), i * 0.07, 0.12);
  });
  for (let i = 0; i < 5; i++)
    place(t, applyEnv(sine(1760 + i * 260, 0.28), adsr(0.28, 0.003, 0.04, 0.07, 0.20)), 0.48 + i * 0.04, 0.11);
  return fade(normalize(reverb(t, 0.20), 0.84));
}

function genBattleRequest() {
  // Friendly 4-note ascending motif + sparkle
  const d = 0.80, t = buf(d);
  [[523.25, 0.00], [659.25, 0.13], [783.99, 0.26], [1046.50, 0.40]].forEach(([f, s]) => {
    place(t, applyEnv(bell(f, 0.32, 0.33), adsr(0.32, 0.005, 0.05, 0.36, 0.22)), s, 0.56);
  });
  for (let i = 0; i < 3; i++)
    place(t, applyEnv(sine(1600 + i * 280, 0.20), adsr(0.20, 0.003, 0.04, 0.07, 0.14)), 0.54 + i * 0.04, 0.12);
  return fade(normalize(t, 0.80));
}

function genBattleStart() {
  // 3 countdown beeps (descending) + chord impact
  const d = 1.3, t = buf(d);
  [[784, 0.00], [659, 0.27], [523, 0.54]].forEach(([f, s]) => {
    const nd = 0.20;
    const b = sine(f, nd);
    for (let i = 0; i < b.length; i++) b[i] += 0.25 * Math.sin(2 * Math.PI * f * 2 * i / SR);
    place(t, applyEnv(b, adsr(nd, 0.004, 0.04, 0.36, 0.12)), s, 0.52);
  });
  [261.63, 329.63, 392.00].forEach(f =>
    place(t, applyEnv(bell(f, 0.36, 0.26), adsr(0.36, 0.01, 0.09, 0.18, 0.22)), 0.88, 0.38));
  place(t, applyEnv(noise(0.07), adsr(0.07, 0.002, 0.02, 0, 0.05)), 0.88, 0.12);
  return fade(normalize(t, 0.76));
}

function genBattleWin() {
  // Strong victory – 8-note run + chord wall + sparkle rain
  const d = 2.0, t = buf(d);
  [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
    place(t, applyEnv(mallet(f, 0.44), adsr(0.44, 0.005, 0.08, 0.36, 0.30)), i * 0.08, 0.46);
  });
  [261.63, 329.63, 392.00, 523.25, 659.25].forEach(f =>
    place(t, applyEnv(bell(f, 1.1, 0.26), adsr(1.1, 0.01, 0.14, 0.42, 0.62)), 0.78, 0.40));
  for (let i = 0; i < 12; i++)
    place(t, applyEnv(sine(1380 + i * 135, 0.20), adsr(0.20, 0.002, 0.03, 0.05, 0.15)), 0.82 + i * 0.10, 0.10);
  return fade(normalize(reverb(t, 0.18), 0.82));
}

function genLose() {
  // Soft descending minor arpeggio – A E C A F
  const d = 1.2, t = buf(d);
  [440, 392, 329.63, 261.63, 220].forEach((f, i) =>
    place(t, applyEnv(bell(f, 0.50, 0.20), adsr(0.50, 0.01, 0.10, 0.26, 0.33)), i * 0.17, 0.46));
  return fade(normalize(t, 0.70));
}

function genTimerWarning() {
  // Short loopable tick – 880Hz with instant decay
  const d = 0.27;
  return fade(normalize(applyEnv(sine(880, d), adsr(d, 0.002, 0.014, 0, 0.254)), 0.54));
}

function genXoxMove() {
  // Satisfying tile place: soft click + bright pop + resonant body
  const d = 0.22, t = buf(d);
  place(t, applyEnv(softNoise(0.020), adsr(0.020, 0, 0.005, 0, 0.015)), 0, 0.40);
  place(t, applyEnv(pop(680, 360, 0.10), adsr(0.10, 0.002, 0.03, 0.10, 0.07)), 0, 0.46);
  place(t, applyEnv(bell(1200, 0.10, 0.30), adsr(0.10, 0.002, 0.03, 0.05, 0.06)), 0, 0.12);
  return fade(normalize(reverb(t, 0.10), 0.74));
}

function genXoxWin() {
  // 3-note lead + chord resolution + sparkle
  const d = 1.5, t = buf(d);
  [[523.25, 0.00], [659.25, 0.13], [783.99, 0.26]].forEach(([f, s]) =>
    place(t, applyEnv(mallet(f, 0.33), adsr(0.33, 0.005, 0.07, 0.36, 0.22)), s, 0.50));
  [523.25, 659.25, 783.99, 1046.50].forEach(f =>
    place(t, applyEnv(bell(f, 0.88, 0.30), adsr(0.88, 0.01, 0.10, 0.36, 0.52)), 0.48, 0.40));
  for (let i = 0; i < 6; i++)
    place(t, applyEnv(sine(1480 + i * 175, 0.20), adsr(0.20, 0.003, 0.03, 0.07, 0.15)), 0.52 + i * 0.10, 0.10);
  return fade(normalize(reverb(t, 0.18), 0.80));
}

function genDraw() {
  // Neutral G→F→E→C resolution
  const d = 1.0, t = buf(d);
  [[392.00, 0.00], [349.23, 0.16], [329.63, 0.32], [261.63, 0.50]].forEach(([f, s]) =>
    place(t, applyEnv(bell(f, 0.44, 0.26), adsr(0.44, 0.01, 0.10, 0.26, 0.28)), s, 0.46));
  return fade(normalize(t, 0.70));
}

function genFriendRequest() {
  // Two ascending notes E5→A5 + sparkle
  const d = 0.60, t = buf(d);
  place(t, applyEnv(bell(659.25, 0.28, 0.40), adsr(0.28, 0.005, 0.07, 0.28, 0.18)), 0.00, 0.56);
  place(t, applyEnv(bell(880.00, 0.28, 0.40), adsr(0.28, 0.005, 0.07, 0.28, 0.18)), 0.18, 0.56);
  for (let i = 0; i < 3; i++)
    place(t, applyEnv(sine(1760 + i * 380, 0.17), adsr(0.17, 0.003, 0.04, 0.06, 0.12)), 0.38 + i * 0.04, 0.11);
  return fade(normalize(t, 0.80));
}

function genError() {
  // Muted low thud – soft and inoffensive
  const d = 0.20, t = buf(d);
  place(t, applyEnv(sine(200, d), adsr(d, 0.003, 0.04, 0.11, 0.12)), 0, 0.36);
  place(t, applyEnv(sine(150, d), adsr(d, 0.003, 0.04, 0.11, 0.12)), 0, 0.22);
  place(t, applyEnv(noise(d), adsr(d, 0.003, 0.04, 0.11, 0.12)), 0, 0.016);
  return fade(normalize(t, 0.54));
}

// ─── Background music helpers ─────────────────────────────────────────────────

/** Warm detuned pad – 3 oscillators per note, slight tremolo */
function pad(freqs, dur, amp = 0.11) {
  const n = nOf(dur), out = new Float64Array(n);
  for (const f of freqs) {
    for (const dt of [-1.3, 0, 1.3]) {
      const ff  = f * Math.pow(2, dt / 1200);
      const tr  = 0.28 + (Math.random() * 0.06);
      const a   = amp / (3 * freqs.length);
      for (let i = 0; i < n; i++) {
        out[i] += Math.sin(2 * Math.PI * ff * i / SR)
                * (1 + 0.04 * Math.sin(2 * Math.PI * tr * i / SR))
                * a;
      }
    }
  }
  return out;
}

/** Crossfade start ↔ end for seamless loop */
function loopify(sig, fs = 8820) {
  const out = new Float64Array(sig);
  const f   = Math.min(fs, Math.floor(sig.length / 4));
  for (let i = 0; i < f; i++) {
    out[i] = sig[i] * (i / f) + sig[sig.length - f + i] * (1 - i / f);
    out[sig.length - f + i] *= 1 - i / f;
  }
  return out;
}

function addPadSection(t, chords, startSec, durSec, amp) {
  const xf = nOf(1.4);
  const p  = pad(chords, durSec, amp);
  // edge fade
  for (let i = 0; i < Math.min(xf, p.length); i++) p[i] *= i / xf;
  for (let i = 0; i < Math.min(xf, p.length); i++) p[p.length - 1 - i] *= i / xf;
  place(t, p, startSec);
}

// ─── Background music generators ─────────────────────────────────────────────

function genPuzzleLoop() {
  // Main menu – warm marimba melody over slow C–Am–F–G pads
  const dur = 48, t = buf(dur);

  const progression = [
    [[261.63, 329.63, 392.00, 523.25], 0],   // C
    [[220.00, 261.63, 329.63, 440.00], 12],  // Am
    [[174.61, 220.00, 261.63, 349.23], 24],  // F
    [[196.00, 246.94, 293.66, 392.00], 36],  // G
  ];
  for (const [ch, s] of progression) addPadSection(t, ch, s, 12, 0.115);

  // 16-event marimba pattern, repeated x4
  const pat = [
    [0.0, 523.25, 0.22], [0.5, 659.25, 0.18], [1.0, 784.00, 0.20], [1.5, 659.25, 0.18],
    [2.5, 523.25, 0.22], [3.0, 784.00, 0.20], [3.5, 880.00, 0.17], [4.0, 784.00, 0.20],
    [5.0, 659.25, 0.18], [5.5, 523.25, 0.22], [6.5, 659.25, 0.18], [7.0, 784.00, 0.20],
    [8.0, 523.25, 0.22], [8.5, 659.25, 0.18], [9.5, 784.00, 0.20], [10.5,1046.50,0.16],
  ];
  for (let c = 0; c < 4; c++) for (const [o, f, a] of pat) {
    const s = c * 12 + o; if (s >= dur) continue;
    // Brighter marimba/mallet lead for a more modern, candy-like sparkle.
    place(t, applyEnv(mallet(f, 0.48), adsr(0.48, 0.005, 0.06, 0.20, 0.32)), s, a);
  }

  // Bass roots
  for (const [s, f] of [[0, 130.81],[12,110.00],[24, 87.31],[36, 98.00]]) {
    const nd = 10;
    const b = new Float64Array(nOf(nd));
    for (let i = 0; i < b.length; i++)
      b[i] = Math.sin(2*Math.PI*f*i/SR)*0.07 + Math.sin(2*Math.PI*f*2*i/SR)*0.03;
    place(t, applyEnv(b, adsr(nd, 0.12, 0.28, 0.50, 2.0)), s);
  }

  // Occasional high sparkles
  const sp = [3.5,7.2,11.1,15.7,19.4,23.0,27.8,31.3,35.6,39.2,43.0,47.1];
  const sf = [2093,1760,2637,1976,2349,2093,2637,1760,2349,2093,1760,2637];
  for (let i = 0; i < sp.length; i++)
    place(t, applyEnv(sine(sf[i], 0.26), adsr(0.26, 0.004, 0.04, 0.07, 0.18)), sp[i], 0.06);

  return loopify(normalize(t, 0.72));
}

function genRelaxLoop() {
  // Gameplay focus music – ultra-minimal pads + sparse long notes
  const dur = 48, t = buf(dur);

  [[0, 16, [261.63,329.63,392.00]],
   [16, 8, [246.94,293.66,392.00]],
   [24, 8, [220.00,261.63,329.63]],
   [32, 8, [174.61,220.00,261.63]],
   [40, 8, [261.63,329.63,392.00]]].forEach(([s, d, ch]) => addPadSection(t, ch, s, d, 0.068));

  // Very sparse melody – 19 events total, long gaps
  const mel = [
    [0.0,523.25],[2.4,659.25],[5.2,523.25],[8.0,784.00],[11.0,659.25],
    [13.0,523.25],[16.0,587.33],[18.8,493.88],[21.5,523.25],[24.0,659.25],
    [27.0,523.25],[29.8,659.25],[32.0,440.00],[35.2,523.25],[38.0,440.00],
    [40.0,523.25],[42.8,659.25],[45.2,523.25],[47.0,659.25],
  ];
  for (const [s, f] of mel)
    place(t, applyEnv(bell(f, 1.6, 0.26), adsr(1.6, 0.01, 0.16, 0.26, 0.80)), s, 0.14);

  // Soft bass
  for (const [s, f] of [[0,130.81],[12,98.00],[24,110.00],[36,130.81]]) {
    const nd = 10;
    const b = new Float64Array(nOf(nd));
    for (let i = 0; i < b.length; i++) b[i] = Math.sin(2*Math.PI*f*i/SR)*0.048;
    place(t, applyEnv(b, adsr(nd, 0.20, 0.48, 0.54, 2.5)), s);
  }

  return loopify(normalize(t, 0.65));
}

function genCandyLoop() {
  // Playful variant – brighter upper-register melody, more active sparkles
  const dur = 48, t = buf(dur);

  // Higher-octave chord pads
  const prog = [
    [[523.25,659.25,783.99], 0],
    [[440.00,523.25,659.25], 12],
    [[349.23,440.00,523.25], 24],
    [[392.00,523.25,587.33], 36],
  ];
  for (const [ch, s] of prog) addPadSection(t, ch, s, 12, 0.092);

  // Faster, higher melody
  const pat = [
    [0.0,1046.50],[0.40,880.00],[0.80,1046.50],[1.40,1318.51],
    [2.00,1046.50],[2.40,880.00],[3.00, 783.99],[3.60, 880.00],
    [4.40,1046.50],[4.80,1318.51],[5.20,1046.50],[5.80, 880.00],
    [6.40, 783.99],[7.00, 659.25],[7.60, 783.99],[8.20, 880.00],
    [9.00,1046.50],[9.40, 880.00],[9.80, 783.99],[10.40,659.25],
    [11.00,783.99],[11.50, 880.00],
  ];
  for (let c = 0; c < 4; c++) for (const [o, f] of pat) {
    const s = c * 12 + o; if (s >= dur) continue;
    // Bright mallet lead + glassy octave shimmer = candy-game feel.
    place(t, applyEnv(mallet(f, 0.34), adsr(0.34, 0.003, 0.05, 0.20, 0.21)), s, 0.17);
    place(t, applyEnv(bell(f * 2, 0.20, 0.42), adsr(0.20, 0.003, 0.04, 0.10, 0.12)), s, 0.05);
  }

  // Frequent sparkles
  for (let i = 0; i < 32; i++) {
    const s = 1.2 + i * 1.5; if (s >= dur) continue;
    place(t, applyEnv(sine([2093,1760,2349,2637,3136][i%5], 0.16), adsr(0.16,0.003,0.03,0.05,0.12)), s, 0.06);
  }

  // Bass
  for (const [s, f] of [[0,130.81],[12,110.00],[24,87.31],[36,98.00]]) {
    const nd = 10;
    const b = new Float64Array(nOf(nd));
    for (let i = 0; i < b.length; i++) b[i] = Math.sin(2*Math.PI*f*i/SR)*0.062;
    place(t, applyEnv(b, adsr(nd, 0.10, 0.24, 0.52, 2.0)), s);
  }

  return loopify(normalize(t, 0.72));
}

function genForestLoop() {
  // Slow ambient – low register pads, sparse bell, soft noise texture
  const dur = 48, t = buf(dur);

  const sections = [
    [0,  8, [130.81,164.81,196.00,261.63]],
    [8,  8, [98.00, 146.83,196.00,293.66]],
    [16, 8, [110.00,130.81,164.81,220.00]],
    [24, 8, [82.41, 98.00, 130.81,164.81]],
    [32, 8, [87.31, 110.00,130.81,174.61]],
    [40, 8, [130.81,164.81,196.00,261.63]],
  ];
  for (const [s, d, ch] of sections) addPadSection(t, ch, s, d, 0.11);

  // Very sparse high-bell drops (every ~4 seconds)
  const bells = [
    [2.0,1046.50],[6.0,880.00],[10.0,1046.50],[14.0,783.99],
    [18.0,880.00],[22.0,1046.50],[26.0,783.99],[30.0,659.25],
    [34.0,783.99],[38.0,880.00],[42.0,1046.50],[46.0,880.00],
  ];
  for (const [s, f] of bells)
    place(t, applyEnv(bell(f, 2.0, 0.34), adsr(2.0, 0.01, 0.20, 0.28, 1.2)), s, 0.14);

  // Subtle noise ambience layer (soft wind)
  const nz = noise(dur);
  for (let i = 0; i < nz.length; i++) {
    const tm = i / SR;
    t[i] += nz[i] * 0.025 * (1 + 0.30 * Math.sin(2 * Math.PI * 0.04 * tm));
  }

  return loopify(normalize(t, 0.68));
}

function genBattleLoop() {
  // Battle mode – 120 BPM light pulse, energetic but clean melody, brighter chords
  const dur = 48, t = buf(dur);
  const bpm = 120, bd = 60 / bpm;

  // Light quarter-note tick
  for (let b = 0; b * bd < dur; b++) {
    if (b % 2 === 0) {
      const tk = sine(420, 0.055);
      place(t, applyEnv(tk, adsr(0.055, 0.001, 0.007, 0, 0.047)), b * bd, 0.066);
    }
  }

  // Bright pads
  const prog = [
    [[261.63,329.63,392.00,523.25], 0],
    [[220.00,261.63,329.63,440.00], 12],
    [[174.61,220.00,261.63,349.23], 24],
    [[196.00,261.63,293.66,392.00], 36],
  ];
  for (const [ch, s] of prog) addPadSection(t, ch, s, 12, 0.10);

  // Energetic melody (half-beat notes)
  const pat = [
    [0.0,784.00],[0.5,659.25],[1.0,523.25],[1.5,659.25],
    [2.0,784.00],[2.5,880.00],[3.0,784.00],[3.5,659.25],
    [4.0,523.25],[4.5,587.33],[5.0,659.25],[5.5,523.25],
    [6.0,392.00],[6.5,523.25],[7.0,659.25],[7.5,784.00],
    [8.0,659.25],[8.5,523.25],[9.0,659.25],[9.5,784.00],
    [10.0,880.00],[10.5,784.00],[11.0,659.25],[11.5,523.25],
  ];
  for (let c = 0; c < 4; c++) for (const [o, f] of pat) {
    const s = c * 12 + o; if (s >= dur) continue;
    const nd = 0.40;
    const n = new Float64Array(nOf(nd));
    for (let i = 0; i < n.length; i++)
      n[i] = (Math.sin(2*Math.PI*f*i/SR) + 0.24*Math.sin(2*Math.PI*f*2*i/SR)) / 1.24;
    place(t, applyEnv(n, adsr(nd, 0.004, 0.04, 0.26, 0.24)), s, 0.17);
  }

  // Rhythmic bass
  const bassRoots = [130.81, 110.00, 87.31, 98.00];
  for (let c = 0; c < 4; c++) {
    const f = bassRoots[c];
    for (let b = 0; b < 12; b++) {
      const s = c * 12 + b; if (s >= dur) continue;
      const nd = 0.85;
      const n = new Float64Array(nOf(nd));
      for (let i = 0; i < n.length; i++)
        n[i] = Math.sin(2*Math.PI*f*i/SR)*0.092 + Math.sin(2*Math.PI*f*2*i/SR)*0.038;
      place(t, applyEnv(n, adsr(nd, 0.02, 0.04, 0.44, 0.30)), s);
    }
  }

  return loopify(normalize(t, 0.72));
}

// ─── Run ──────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

const ALL = [
  // ── SFX (overwrite existing + add new) ──
  ['tap.wav',            genTap],
  ['word-found.wav',     genWordFound],
  ['win.wav',            genWin],
  ['wrong.wav',          genWrong],
  ['draw.wav',           genDraw],
  ['lose.wav',           genLose],
  ['battle-request.wav', genBattleRequest],
  ['menu-open.wav',      genMenuOpen],
  ['menu-close.wav',     genMenuClose],
  ['letter-select.wav',  genLetterSelect],
  ['word-drag.wav',      genWordDrag],
  ['word-completed.wav', genWordCompleted],
  ['level-unlock.wav',   genLevelUnlock],
  ['coin.wav',           genCoin],
  ['reward.wav',         genReward],
  ['battle-start.wav',   genBattleStart],
  ['battle-win.wav',     genBattleWin],
  ['timer-warning.wav',  genTimerWarning],
  ['xox-move.wav',       genXoxMove],
  ['xox-win.wav',        genXoxWin],
  ['friend-request.wav', genFriendRequest],
  ['error.wav',          genError],
  // ── Background music loops ──
  ['puzzle-loop.wav',    genPuzzleLoop],
  ['relax-loop.wav',     genRelaxLoop],
  ['candy-loop.wav',     genCandyLoop],
  ['forest-loop.wav',    genForestLoop],
  ['battle-loop.wav',    genBattleLoop],
];

console.log('\n🎵  Word Puzzle Game – Sound Pack Generator');
console.log('='.repeat(44));
const t0 = Date.now();
let ok = 0, fail = 0;

for (const [name, gen] of ALL) {
  try { saveWav(name, gen()); ok++; }
  catch (e) { process.stdout.write(`  ✗  ${name}: ${e.message}\n`); fail++; }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log('='.repeat(44));
console.log(`✅  ${ok} files generated in ${elapsed}s  →  assets/sounds/`);
if (fail) console.log(`⚠️   ${fail} failed`);
console.log('');
