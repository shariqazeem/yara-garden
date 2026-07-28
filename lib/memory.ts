"use client";

// Lightweight on-device memory so the app "remembers you" (no backend yet).
// This is what makes the companion feel continuous — the core of the hook.

export type CheckIn = { mood: string; at: number };
export type TalkMsg = { role: "user" | "assistant"; content: string };
export type Feeling = { date: string; sky: string; words: string[] }; // expressed through play, not asked

export type Memory = {
  intake: string;
  checkins: CheckIn[];
  talks: Record<string, TalkMsg[]>;
  profile: string; // a living, model-distilled understanding of the person — grows as you talk
  feelings: Feeling[]; // the daily "sky" + feeling-words a person paints (indirect, playful)
};

const KEY = "psiddx.memory.v1";
const EMPTY: Memory = { intake: "", checkins: [], talks: {}, profile: "", feelings: [] };

function read(): Memory {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function write(m: Memory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage full / unavailable — fail quietly */
  }
}

export function getMemory(): Memory {
  return read();
}

export function setIntake(intake: string) {
  const m = read();
  m.intake = intake.slice(0, 2000);
  write(m);
}

export function addCheckin(mood: string) {
  const m = read();
  m.checkins = [...m.checkins, { mood, at: Date.now() }].slice(-60);
  write(m);
}

export function setTodayFeeling(sky: string, words: string[]) {
  const m = read();
  const date = new Date().toISOString().slice(0, 10);
  const feelings = (m.feelings ?? []).filter((f) => f.date !== date);
  feelings.push({ date, sky, words });
  m.feelings = feelings.slice(-40);
  write(m);
}

export function getTodayFeeling(): Feeling | null {
  const date = new Date().toISOString().slice(0, 10);
  return (read().feelings ?? []).find((f) => f.date === date) ?? null;
}

/** A short, model-ready line describing how they feel today (or "" if not set yet). */
export function feelingLine(): string {
  const f = getTodayFeeling();
  if (!f) return "";
  const w = f.words.length ? ` and named these feelings: ${f.words.join(", ")}` : "";
  return `Today their inner sky is "${f.sky}"${w}.`;
}

export function getProfile(): string {
  return read().profile ?? "";
}

export function setProfile(profile: string) {
  const m = read();
  m.profile = profile.slice(0, 2400);
  write(m);
}

export function getTalk(charId = "sol"): TalkMsg[] {
  return read().talks?.[charId] ?? [];
}

export function saveTalk(charId: string, talk: TalkMsg[]) {
  const m = read();
  m.talks = { ...(m.talks ?? {}), [charId]: talk.slice(-40) };
  write(m);
}
