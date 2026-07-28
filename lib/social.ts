"use client";

// Friendship state — you socialize with the souls before they open up to you.
// Yara (the guide) is always a friend; the others you meet and befriend first.

const KEY = "psiddx.friends.v1";

export function getFriends(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addFriend(id: string): string[] {
  if (typeof window === "undefined") return [];
  const next = Array.from(new Set([...getFriends(), id]));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* no-op */
  }
  return next;
}

export function isFriend(id: string): boolean {
  return getFriends().includes(id);
}
