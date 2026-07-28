"use client";

// A deliberately simple, local-only account. No email, no verification, no backend.
// • First launch: you enter a name → that's your account.
// • Optionally "save your journey" under a username + password → a snapshot is stored
//   locally so you (or a returning visitor on this device) can restore everything.
// Yara "remembers" because all of a person's state lives in these keys and is restored
// together. NOTE: the password is a local lock only, not real security.

const NAME_KEY = "psiddx.account.name";
const GENDER_KEY = "psiddx.account.gender";

// Every key that makes up "who this person is" in the world.
const STATE_KEYS = [
  "psiddx.account.name",
  "psiddx.account.gender",
  "psiddx.memory.v1", // intake, mood check-ins, per-soul conversations, the living profile
  "psiddx.friends.v1",
  "psiddx.progress.v1",
  "psiddx.mood.date",
];

export function getName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function setName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name.slice(0, 40));
}

export type Gender = "boy" | "girl";

export function getGender(): Gender {
  if (typeof window === "undefined") return "boy";
  return window.localStorage.getItem(GENDER_KEY) === "girl" ? "girl" : "boy";
}

export function setGender(g: Gender) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GENDER_KEY, g);
}

function snapshot(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const k of STATE_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v != null) data[k] = v;
  }
  return data;
}

const saveKey = (username: string) => "psiddx.save." + username.trim().toLowerCase();

export function saveJourney(username: string, password: string): boolean {
  if (typeof window === "undefined" || !username.trim() || !password) return false;
  window.localStorage.setItem(saveKey(username), JSON.stringify({ password, data: snapshot(), savedAt: Date.now() }));
  return true;
}

/** Returns true if restored. Caller should reload so every component re-reads state. */
export function loadJourney(username: string, password: string): boolean {
  if (typeof window === "undefined" || !username.trim()) return false;
  const raw = window.localStorage.getItem(saveKey(username));
  if (!raw) return false;
  try {
    const save = JSON.parse(raw) as { password: string; data: Record<string, string> };
    if (save.password !== password) return false;
    for (const k of STATE_KEYS) {
      if (save.data[k] != null) window.localStorage.setItem(k, save.data[k]);
    }
    return true;
  } catch {
    return false;
  }
}

export function hasSave(username: string): boolean {
  if (typeof window === "undefined" || !username.trim()) return false;
  return !!window.localStorage.getItem(saveKey(username));
}
