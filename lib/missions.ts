"use client";

// The healing-quest loop. Small, genuinely-helpful actions — most done in REAL life, then
// marked here — earning "light" and a gentle streak. The model (/api/path) chooses which
// fit how a person is right now, so someone with low mood gets gentle activation, someone
// flooded or hearing things gets grounding + reality-anchoring, someone bright-and-sleepless
// gets sleep + self-awareness. Evidence-informed in spirit, never clinical.

export type Category = "ground" | "anchor" | "sleep" | "move" | "connect" | "kind" | "aware" | "structure";

export type Mission = {
  id: string;
  title: string;
  sub: string;
  type: "breathe" | "reflect" | "timer" | "tap";
  category: Category;
  light: number;
  realWorld?: boolean; // something you actually do out in your life
  prompt?: string;
  seconds?: number;
};

export const MISSIONS: Mission[] = [
  // grounding — for anxiety, racing, overwhelm
  { id: "breathe", title: "Three slow breaths", sub: "Let your shoulders drop", type: "breathe", category: "ground", light: 10 },
  { id: "senses", title: "Five, four, three", sub: "Name 5 you see, 4 you hear, 3 you can touch", type: "reflect", category: "ground", light: 12, prompt: "Look around and name 5 things you can see, 4 you can hear, 3 you can touch. Type a few here." },
  { id: "cold", title: "Cool water on your wrists", sub: "Thirty seconds — it resets the body", type: "tap", category: "ground", light: 8, realWorld: true },
  { id: "floor", title: "Feel the floor hold you", sub: "Press your feet down, breathe", type: "timer", category: "ground", light: 8, seconds: 20 },

  // anchoring — gentle, for when things feel unreal / loud / not-quite-here
  { id: "here", title: "Where are you, right now?", sub: "Say it out loud — place, day, you're safe", type: "reflect", category: "anchor", light: 10, realWorld: true, prompt: "Out loud, say where you are and what day it is. What's one solid, real thing you can see?" },
  { id: "texture", title: "Hold something textured", sub: "A blanket, a stone — feel it fully", type: "tap", category: "anchor", light: 8, realWorld: true },
  { id: "real3", title: "Three real, solid things", sub: "Name them — they're here, you're here", type: "reflect", category: "anchor", light: 8, prompt: "Name three solid, real things near you right now." },

  // sleep — especially important when energy runs high
  { id: "winddown", title: "Choose tonight's wind-down", sub: "Pick a time to start slowing down", type: "tap", category: "sleep", light: 8, realWorld: true },
  { id: "screens", title: "Screens off, a little early", sub: "Give your mind a softer landing tonight", type: "tap", category: "sleep", light: 10, realWorld: true },
  { id: "sleepnote", title: "How did you sleep?", sub: "Just noticing helps catch patterns", type: "reflect", category: "sleep", light: 8, prompt: "How did you sleep last night — hours, and how it felt?" },

  // movement / activation — for heaviness and low days
  { id: "outside", title: "Step outside for two minutes", sub: "Just the doorway counts", type: "tap", category: "move", light: 10, realWorld: true },
  { id: "stretch", title: "Reach up to the sky", sub: "Then let everything go", type: "timer", category: "move", light: 8, seconds: 20 },
  { id: "walk", title: "Walk to the end of the street", sub: "And back — that's the whole quest", type: "tap", category: "move", light: 12, realWorld: true },

  // connection
  { id: "text", title: "Text someone you trust", sub: "Even just 'hi' — you don't have to explain", type: "tap", category: "connect", light: 12, realWorld: true },
  { id: "truething", title: "Tell someone one true thing", sub: "However small, said out loud", type: "tap", category: "connect", light: 10, realWorld: true },

  // self-compassion
  { id: "kind", title: "A kind word to yourself", sub: "Like you'd say to a friend", type: "reflect", category: "kind", light: 12, prompt: "What would you tell a friend who felt the way you do right now?" },
  { id: "heart", title: "Hand on your heart", sub: "Three breaths, just for you", type: "breathe", category: "kind", light: 10 },
  { id: "forgive", title: "Forgive yourself one thing", sub: "You're carrying enough", type: "reflect", category: "kind", light: 10, prompt: "What's one small thing you can let yourself off the hook for today?" },

  // self-awareness — quietly catches the highs and the lows
  { id: "energy", title: "Where's your energy?", sub: "High, low, or steady — no wrong answer", type: "reflect", category: "aware", light: 10, prompt: "Right now, is your energy running high, low, or steady? What does it feel like in your body?" },
  { id: "highnotice", title: "Did today feel fast or bright?", sub: "Noticing the ups matters as much as the downs", type: "reflect", category: "aware", light: 12, prompt: "Did today feel unusually fast, bright, or sped-up in any way? Tell me about it." },
  { id: "feeling", title: "Name one feeling", sub: "No judgment — just notice", type: "reflect", category: "aware", light: 10, prompt: "What's one feeling you're holding right now?" },
  { id: "explore", title: "What matters to you lately?", sub: "A small window into yourself", type: "reflect", category: "aware", light: 12, prompt: "What's been mattering most to you lately — even if it surprises you?" },

  // structure / basic care
  { id: "plan", title: "One tiny plan for tomorrow", sub: "Just one gentle thing", type: "reflect", category: "structure", light: 10, prompt: "What's one small, kind thing you'll do for yourself tomorrow?" },
  { id: "eat", title: "Eat or drink something", sub: "Your body's been carrying you", type: "tap", category: "structure", light: 8, realWorld: true },
  { id: "tidy", title: "Tidy one small thing", sub: "One cup, one corner", type: "tap", category: "structure", light: 6, realWorld: true },
];

const KEY = "psiddx.progress.v1";

type Prog = { light: number; days: string[]; today: string; todayIds: string[] };
const EMPTY: Prog = { light: 0, days: [], today: "", todayIds: [] };

const dayStr = (d = new Date()) => d.toISOString().slice(0, 10);

function read(): Prog {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    const p = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
    if (p.today !== dayStr()) {
      p.today = dayStr();
      p.todayIds = [];
    }
    return p;
  } catch {
    return { ...EMPTY };
  }
}

function write(p: Prog) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* no-op */
  }
}

export type Progress = { light: number; streak: number; doneToday: string[] };

function streakOf(days: string[]): number {
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(dayStr(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (set.has(dayStr(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export function getProgress(): Progress {
  const p = read();
  return { light: p.light, streak: streakOf(p.days), doneToday: p.todayIds };
}

/** Today's gently-rotating set of four (fallback when the model isn't reached). */
export function dailyPath(): Mission[] {
  const idx = Math.floor(Date.now() / 86_400_000) % MISSIONS.length;
  return Array.from({ length: 4 }, (_, i) => MISSIONS[(idx + i) % MISSIONS.length]);
}

/** Build a path from model-chosen ids; falls back to the daily rotation if too few resolve. */
export function pathFromIds(ids: string[]): Mission[] {
  const picked = ids.map((id) => MISSIONS.find((m) => m.id === id)).filter(Boolean) as Mission[];
  return picked.length >= 4 ? picked.slice(0, 4) : dailyPath();
}

/** Award light for moments that aren't a formal mission (e.g. sitting with a soul). */
export function addLight(n: number): Progress {
  const p = read();
  p.light += n;
  if (!p.days.includes(p.today)) p.days = [...p.days, p.today].slice(-365);
  write(p);
  return getProgress();
}

export function complete(id: string): Progress {
  const p = read();
  if (!p.todayIds.includes(id)) {
    const m = MISSIONS.find((x) => x.id === id);
    p.todayIds = [...p.todayIds, id];
    p.light += m?.light ?? 5;
    if (!p.days.includes(p.today)) p.days = [...p.days, p.today].slice(-365);
    write(p);
  }
  return getProgress();
}
