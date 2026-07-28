"use client";

// A gentle daily reminder to return to your world. Uses the browser Notification API.
// NOTE: this fires reliably while the app/tab is open at the chosen time. True background
// reminders (app closed) need an installed PWA + push or the native app — a later step.

const KEY = "psiddx.reminder";
export type Reminder = { enabled: boolean; time: string }; // time as "HH:MM"
const DEFAULT: Reminder = { enabled: false, time: "20:00" };

let timer: ReturnType<typeof setTimeout> | null = null;

export function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permission(): NotificationPermission | "unsupported" {
  return supported() ? Notification.permission : "unsupported";
}

export function getReminder(): Reminder {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...JSON.parse(window.localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULT };
  }
}

function save(r: Reminder) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* no-op */
  }
}

function msUntil(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const t = new Date();
  t.setHours(h || 20, m || 0, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime() - now.getTime();
}

export function schedule() {
  const r = getReminder();
  if (!r.enabled || !supported() || Notification.permission !== "granted") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      new Notification("Your world is waiting 🌿", { body: "A gentle minute with Yara, whenever you're ready." });
    } catch {
      /* no-op */
    }
    schedule(); // re-arm for tomorrow
  }, msUntil(r.time));
}

export async function enableReminders(time: string): Promise<"ok" | "denied" | "unsupported"> {
  if (!supported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  save({ enabled: true, time });
  schedule();
  return "ok";
}

export function disableReminders() {
  save({ ...getReminder(), enabled: false });
  if (timer) clearTimeout(timer);
}
