"use client";

// Strengths grow with what you do — a strengths-based, never-deficit record of becoming.
const KEY = "psiddx.strengths.v1";

export type StrengthKey = "calm" | "connection" | "energy" | "rest" | "courage";
export type Strengths = Record<StrengthKey, number>;
const EMPTY: Strengths = { calm: 0, connection: 0, energy: 0, rest: 0, courage: 0 };

export const STRENGTH_DIMS: { key: StrengthKey; label: string; color: string }[] = [
  { key: "calm", label: "Calm", color: "#7FBFD0" },
  { key: "connection", label: "Connection", color: "#E98A7C" },
  { key: "energy", label: "Energy", color: "#A9D88A" },
  { key: "rest", label: "Rest", color: "#C9A9E0" },
  { key: "courage", label: "Courage", color: "#F4C66B" },
];

const CAT_TO_DIM: Record<string, StrengthKey> = {
  ground: "calm", anchor: "calm", sleep: "rest", move: "energy",
  connect: "connection", kind: "rest", aware: "courage", structure: "courage",
};
export const dimForCategory = (cat: string): StrengthKey => CAT_TO_DIM[cat] ?? "calm";

export function getStrengths(): Strengths {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    return { ...EMPTY, ...JSON.parse(window.localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...EMPTY };
  }
}

export function addStrength(dim: StrengthKey, n = 1): Strengths {
  const s = getStrengths();
  s[dim] = (s[dim] || 0) + n;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ }
  return s;
}
