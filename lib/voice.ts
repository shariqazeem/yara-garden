"use client";

// Yara's voice. Prefers a premium TTS (POST /api/voice -> ElevenLabs/OpenAI) for a
// soft, natural sound; falls back to the best available browser voice with gentle,
// unhurried delivery. Premium audio is cached per line so repeats are instant.

let audioEl: HTMLAudioElement | null = null;
let premiumOff = false; // once we learn there's no premium key, stop trying (no repeated 501s)
const cache = new Map<string, string>(); // text -> object URL

const FEMALE = /(samantha|allison|ava|serena|zoe|karen|moira|tessa|shelley|sandy|\bflo\b|sonia|libby|emma|nora|joanna|amy|aria|jenny|michelle|female|google us english|google uk english female)/i;
const MALE = /(\bdaniel\b|\bfred\b|albert|ralph|rishi|\beddy\b|\breed\b|rocko|grandpa|\bmale\b|\bman\b|\balex\b|george|arthur|\btom\b|\bdavid\b|\bmark\b|oliver|ryan|aaron|gordon)/i;
const NOVELTY = /(bad news|bahh|bells|boing|bubbles|cellos|good news|jester|junior|organ|superstar|trinoids|whisper|wobble|zarvox|grandma)/i;

function browserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const all = window.speechSynthesis.getVoices();
  if (!all.length) return null;
  const en = all.filter((v) => /^en/i.test(v.lang));
  const pool = en.length ? en : all;
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    if (MALE.test(n) || NOVELTY.test(n)) return -1000;
    let s = 0;
    if (/natural|neural|premium|enhanced|\bonline\b/.test(n)) s += 120; // best, if installed
    if (/google (us|uk) english|aria|jenny|michelle/.test(n)) s += 70;  // good cloud voices
    if (/samantha|allison|ava|serena|zoe/.test(n)) s += 45;             // best Apple voices
    if (FEMALE.test(n)) s += 20;
    if (!v.localService) s += 15;
    return s;
  };
  return pool.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

function browserSpeak(text: string, gender: "female" | "male") {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = gender === "female" ? browserVoice() : null;
    if (v) u.voice = v;
    u.rate = 0.9; // slower = calmer, softer
    u.pitch = gender === "female" ? 1.06 : 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* no-op */
  }
}

export async function speak(text: string, gender: "female" | "male" = "female") {
  stopSpeaking();
  if (!text) return;
  if (premiumOff) return browserSpeak(text, gender);
  try {
    let url = cache.get(text);
    if (!url) {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 501) { premiumOff = true; return browserSpeak(text, gender); }
      if (!res.ok) throw new Error("tts " + res.status);
      url = URL.createObjectURL(await res.blob());
      cache.set(text, url);
    }
    audioEl = new Audio(url);
    audioEl.play().catch(() => browserSpeak(text, gender)); // autoplay blocked -> fall back
  } catch {
    browserSpeak(text, gender);
  }
}

export function stopSpeaking() {
  try {
    if (audioEl) { audioEl.pause(); audioEl = null; }
  } catch { /* no-op */ }
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch { /* no-op */ }
}

// warm the browser voice list early (loads async)
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => { /* voices ready */ };
  } catch { /* no-op */ }
}
