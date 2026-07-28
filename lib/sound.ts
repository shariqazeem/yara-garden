// Lumora soundscape — a self-contained Web Audio ambience + chimes (no audio files).
// A soft breathing pad + a gentle filtered-noise breeze, with pentatonic bell chimes on
// delightful interactions. Starts only after a user gesture (iOS/browser autoplay policy).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let started = false;
let muted = false;

const VOL = 0.42; // master volume when unmuted

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOL;
  master.connect(ctx.destination);
  return ctx;
}

/** Begin the ambient bed. Idempotent; safe to call on every gesture. */
export function startAmbient(): void {
  const c = ensure();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume();
  if (started) return;
  started = true;

  const bed = c.createGain();
  bed.gain.value = 0;
  bed.gain.linearRampToValueAtTime(0.2, c.currentTime + 5); // slow fade-in
  const warm = c.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = 760;
  warm.connect(bed);
  bed.connect(master);

  // a soft, sweet Cmaj6 pad — each voice gently breathing on its own slow LFO
  [130.81, 164.81, 196.0, 220.0].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.16;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.045 + i * 0.018;
    const lfoG = c.createGain();
    lfoG.gain.value = 0.09;
    lfo.connect(lfoG);
    lfoG.connect(g.gain);
    lfo.start();
    o.connect(g);
    g.connect(warm);
    o.start();
  });

  // gentle breeze — looped filtered noise that swells
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = c.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const nf = c.createBiquadFilter();
  nf.type = "lowpass";
  nf.frequency.value = 480;
  const ng = c.createGain();
  ng.gain.value = 0.05;
  const blfo = c.createOscillator();
  blfo.frequency.value = 0.06;
  const blfoG = c.createGain();
  blfoG.gain.value = 0.035;
  blfo.connect(blfoG);
  blfoG.connect(ng.gain);
  blfo.start();
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(bed);
  noise.start();
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 D5 E5 G5 A5 — always pleasant

/** A soft bell. `i` picks the note; omit for a random pentatonic tone. */
export function chime(i?: number): void {
  const c = ensure();
  if (!c || !master || muted) return;
  if (c.state === "suspended") c.resume();
  const f = PENTA[(i ?? Math.floor(Math.random() * PENTA.length)) % PENTA.length];
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.value = f;
  const o2 = c.createOscillator(); // a soft octave shimmer
  o2.type = "sine";
  o2.frequency.value = f * 2;
  const g = c.createGain();
  g.gain.value = 0;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  o.connect(g);
  const g2 = c.createGain();
  g2.gain.value = 0.35;
  o2.connect(g2);
  g2.connect(g);
  g.connect(lp);
  lp.connect(master);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 1.6);
  o.start(t); o2.start(t);
  o.stop(t + 1.7); o2.stop(t + 1.7);
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master && ctx) master.gain.linearRampToValueAtTime(m ? 0 : VOL, ctx.currentTime + 0.25);
  try { window.localStorage.setItem("lumora.muted", m ? "1" : "0"); } catch { /* */ }
}

export function isMuted(): boolean {
  try { return window.localStorage.getItem("lumora.muted") === "1"; } catch { return false; }
}
