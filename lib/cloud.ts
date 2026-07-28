"use client";

import { base44 } from "@/lib/base44";

/**
 * Where a person's world actually lives.
 *
 * Yara is playable with no account at all — everything works on-device, because asking a
 * struggling person to sign up before they can breathe is the wrong trade. Signing in is
 * offered later, and only as a promise: *this will still be here tomorrow, on any device.*
 *
 * When they do sign in, their whole world syncs to the Base44 `CompanionMemory` entity:
 * the intake, the moods, the daily sky, the conversations with Yara and every other soul
 * in the world, the living profile she has built of them, and their progress.
 *
 * That row is protected by row-level security (`created_by == user`), so a person's
 * private conversations are readable only by them. Not by other players, and not by
 * anyone poking at the API. For this kind of app that isn't a feature, it's the baseline.
 */

/** The localStorage keys that together make up "who this person is" in the world. */
const NAME = "psiddx.account.name";
const GENDER = "psiddx.account.gender";
const MEMORY = "psiddx.memory.v1";
const FRIENDS = "psiddx.friends.v1";
const PROGRESS = "psiddx.progress.v1";
const MOOD_DATE = "psiddx.mood.date";
const STRENGTHS = "psiddx.strengths.v1";
const MILESTONES = "psiddx.milestones.v1";
const DISCOVERIES = "psiddx.discoveries.v1";

/** Cached so the UI can ask synchronously; refreshed by refreshSession(). */
let currentEmail: string | null = null;
let memoryRowId: string | null = null;

const ls = {
  get: (k: string) => (typeof window === "undefined" ? null : window.localStorage.getItem(k)),
  set: (k: string, v: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  },
};

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function cloudUser(): string | null {
  return currentEmail;
}

export function isLoggedIn(): boolean {
  return !!currentEmail;
}

/** Ask Base44 who this is. Call once on boot. */
export async function refreshSession(): Promise<string | null> {
  try {
    const me = (await base44.auth.me()) as { email?: string } | null;
    currentEmail = me?.email ?? null;
  } catch {
    currentEmail = null;
  }
  return currentEmail;
}

/* ------------------------------------------------------------------ sync */

type MemoryBlob = {
  intake?: string;
  profile?: string;
  checkins?: { mood: string; at: number }[];
  feelings?: { date: string; sky: string; words: string[] }[];
  talks?: Record<string, { role: string; content: string }[]>;
};

/** Shape the on-device world into the entity's real columns, not one opaque blob. */
function snapshot() {
  const mem = parse<MemoryBlob>(ls.get(MEMORY), {});
  return {
    display_name: ls.get(NAME) ?? "",
    intake: mem.intake ?? "",
    profile: mem.profile ?? "",
    moods: (mem.checkins ?? []).map((c) => ({
      mood: c.mood,
      at: new Date(c.at || Date.now()).toISOString(),
    })),
    feelings: mem.feelings ?? [],
    // Every conversation, keyed by who it was with (yara, sol, juno, elias...).
    talks: mem.talks ?? {},
    // Everything else the world needs to rebuild itself exactly as they left it.
    progress: {
      gender: ls.get(GENDER),
      friends: parse(ls.get(FRIENDS), null),
      progress: parse(ls.get(PROGRESS), null),
      mood_date: ls.get(MOOD_DATE),
      strengths: parse(ls.get(STRENGTHS), null),
      milestones: parse(ls.get(MILESTONES), null),
      discoveries: parse(ls.get(DISCOVERIES), null),
    },
    last_visit: new Date().toISOString(),
  };
}

type MemoryRow = ReturnType<typeof snapshot> & { id: string };

/** Write the cloud row back onto the device, so every component reads it as normal. */
function restore(row: MemoryRow) {
  if (row.display_name) ls.set(NAME, row.display_name);

  ls.set(
    MEMORY,
    JSON.stringify({
      intake: row.intake ?? "",
      profile: row.profile ?? "",
      checkins: (row.moods ?? []).map((m) => ({ mood: m.mood, at: Date.parse(m.at) || Date.now() })),
      feelings: row.feelings ?? [],
      talks: row.talks ?? {},
    }),
  );

  const p = (row.progress ?? {}) as Record<string, unknown>;
  const put = (key: string, value: unknown) => {
    if (value === null || value === undefined) return;
    ls.set(key, typeof value === "string" ? value : JSON.stringify(value));
  };
  put(GENDER, p.gender);
  put(FRIENDS, p.friends);
  put(PROGRESS, p.progress);
  put(MOOD_DATE, p.mood_date);
  put(STRENGTHS, p.strengths);
  put(MILESTONES, p.milestones);
  put(DISCOVERIES, p.discoveries);
}

async function findRow(): Promise<MemoryRow | null> {
  // RLS means this only ever returns this person's own row.
  const rows = (await base44.entities.CompanionMemory.list("-created_date", 1, 0)) as MemoryRow[];
  const row = rows?.[0] ?? null;
  memoryRowId = row?.id ?? null;
  return row;
}

const DEVICE = "psiddx.device.id";

/**
 * A secret id for this browser. Only its SHA-256 ever reaches the server, so an anonymous
 * visitor's memory can be found again without the server ever learning who they are.
 */
function deviceId(): string {
  let d = ls.get(DEVICE);
  if (!d) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    d = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    ls.set(DEVICE, d);
  }
  return d;
}

/** Push the current world up. */
export async function syncUp(): Promise<void> {
  // Anonymous visitors get a row too, so what Yara remembers lives in the database rather
  // than only in a browser tab. An account is still what makes it follow you to another
  // device — this keyed-by-device row cannot, by design.
  if (!currentEmail) {
    try {
      await base44.functions.invoke("memory", {
        action: "save",
        deviceId: deviceId(),
        data: snapshot(),
      });
    } catch {
      /* offline — the device copy is intact, and we retry on the next change */
    }
    return;
  }
  try {
    const data = snapshot();
    if (!memoryRowId) await findRow();
    if (memoryRowId) {
      await base44.entities.CompanionMemory.update(memoryRowId, data);
    } else {
      const created = (await base44.entities.CompanionMemory.create(data)) as { id: string };
      memoryRowId = created?.id ?? null;
    }
  } catch {
    /* offline — the device copy is intact, and we retry on the next change */
  }
}

/**
 * Pull an anonymous visitor's stored world back down, but only when this browser has
 * nothing local — otherwise a slow round trip could overwrite a session already in
 * progress. Returns true if something was waiting for them.
 */
export async function restoreAnonymous(): Promise<boolean> {
  if (currentEmail) return false;
  if (ls.get(MEMORY)) return false; // this device already remembers; leave it alone
  try {
    const res = await base44.functions.invoke("memory", { action: "load", deviceId: deviceId() });
    const memory = res?.data?.memory as MemoryRow | null | undefined;
    if (!memory) return false;
    restore(memory);
    return true;
  } catch {
    return false;
  }
}

/** Pull their world down after signing in. Returns true if one was waiting. */
export async function syncDown(): Promise<boolean> {
  if (!currentEmail) return false;
  try {
    const row = await findRow();
    if (!row) return false;
    restore(row);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ auth */

type Result = { ok?: true; error?: string; needsOtp?: true; username?: string };

const message = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
  (e as { message?: string })?.message ??
  fallback;

/**
 * Create an account. Base44 emails a verification code, so this returns `needsOtp` and the
 * panel collects that code before the person is really signed in.
 */
export async function signup(email: string, password: string): Promise<Result> {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return { error: "Please use an email address." };
  if (!password || password.length < 6) return { error: "Please pick a password of 6 or more characters." };
  try {
    await base44.auth.register({ email: e, password });
    return { needsOtp: true };
  } catch (err) {
    return { error: message(err, "That didn't work. Try a different email?") };
  }
}

/** Confirm the emailed code, then sign in and carry their world up with them. */
export async function verifyOtp(email: string, code: string, password: string): Promise<Result> {
  const e = email.trim().toLowerCase();
  try {
    await base44.auth.verifyOtp({ email: e, otpCode: code.trim() });
    return await login(e, password);
  } catch (err) {
    return { error: message(err, "That code didn't match. Check the email and try again.") };
  }
}

export async function login(email: string, password: string): Promise<Result> {
  const e = email.trim().toLowerCase();
  try {
    await base44.auth.loginViaEmailPassword(e, password);
    await refreshSession();

    // If they already have a world saved, bring it down. If not, this device IS their
    // world, so push it up rather than greeting them with an empty garden.
    const had = await syncDown();
    if (!had) await syncUp();

    return { ok: true, username: currentEmail ?? e };
  } catch (err) {
    return { error: message(err, "That email and password didn't match.") };
  }
}

/** One tap, no code to wait for. */
export function loginWithGoogle() {
  try {
    base44.auth.loginWithProvider("google");
  } catch {
    /* the panel still offers the email route */
  }
}

export function logout() {
  currentEmail = null;
  memoryRowId = null;
  try {
    base44.auth.logout();
  } catch {
    /* already gone */
  }
}
