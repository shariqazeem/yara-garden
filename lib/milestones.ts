"use client";

// Gentle milestones — celebrated for showing up and growing, never for grinding.
const KEY = "psiddx.milestones.v1";

export type MStats = { light: number; streak: number; friends: number; discoveries: number };
export type Milestone = { id: string; emoji: string; title: string; sub: string; reached: (s: MStats) => boolean };

export const MILESTONES: Milestone[] = [
  { id: "firstfriend", emoji: "🌿", title: "Your first friend", sub: "You let someone in — that takes a quiet kind of courage.", reached: (s) => s.friends >= 1 },
  { id: "treasure", emoji: "💎", title: "A hidden treasure", sub: "You wandered, and the world gave something back.", reached: (s) => s.discoveries >= 1 },
  { id: "streak3", emoji: "🌅", title: "Three days here", sub: "You keep showing up — for yourself. That matters more than you know.", reached: (s) => s.streak >= 3 },
  { id: "light50", emoji: "🌟", title: "Fifty lights gathered", sub: "Look how much you've gently tended.", reached: (s) => s.light >= 50 },
  { id: "streak7", emoji: "✨", title: "A whole week", sub: "Seven days of returning. Real strength looks exactly like this.", reached: (s) => s.streak >= 7 },
  { id: "light150", emoji: "🌸", title: "A garden of light", sub: "You've grown so much here — it's becoming a place that's truly yours.", reached: (s) => s.light >= 150 },
];

function seen(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function mark(ids: string[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* */ }
}

/** The next freshly-reached milestone (and marks it seen), or null. */
export function nextMilestone(s: MStats): Milestone | null {
  const done = seen();
  const m = MILESTONES.find((x) => !done.includes(x.id) && x.reached(s));
  if (m) { mark([...done, m.id]); return m; }
  return null;
}
