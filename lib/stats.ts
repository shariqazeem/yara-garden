"use client";

import { getMemory } from "./memory";
import { getProgress } from "./missions";

export type Stats = {
  light: number;
  streak: number;
  daysActive: number;
  friends: number;
  talks: number; // how many things they've said to the souls
  doneToday: number;
  recentMoods: { mood: string; at: number }[];
  recentSkies: { date: string; sky: string }[]; // the weather they painted, day by day
};

const MOOD_EMOJI: Record<string, string> = { Rough: "🌧️", Low: "☁️", Okay: "⛅", Good: "🌤️", Great: "☀️" };
export const moodEmoji = (m: string) => MOOD_EMOJI[m] ?? "•";
const SKY_EMOJI: Record<string, string> = { stormy: "⛈️", rainy: "🌧️", cloudy: "☁️", clear: "🌤️", golden: "☀️" };
export const skyEmoji = (s: string) => SKY_EMOJI[s] ?? "🌤️";

export function getStats(): Stats {
  const m = getMemory();
  const p = getProgress();
  const talks = Object.values(m.talks ?? {}).reduce((n, arr) => n + arr.filter((x) => x.role === "user").length, 0);
  let daysActive = 0;
  let friends = 0;
  try {
    daysActive = (JSON.parse(window.localStorage.getItem("psiddx.progress.v1") || "{}").days ?? []).length;
    friends = (JSON.parse(window.localStorage.getItem("psiddx.friends.v1") || "[]") as string[]).length;
  } catch {
    /* defaults */
  }
  return {
    light: p.light,
    streak: p.streak,
    daysActive,
    friends: friends + 1, // + Yara
    talks,
    doneToday: p.doneToday.length,
    recentMoods: (m.checkins ?? []).slice(-10),
    recentSkies: (m.feelings ?? []).slice(-14).map((f) => ({ date: f.date, sky: f.sky })),
  };
}
