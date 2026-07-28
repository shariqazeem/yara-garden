import { NextResponse } from "next/server";
import { kv, kv1, kvReady } from "@/lib/kv";

/**
 * The shared garden, standalone.
 *
 * This is the same contract as the Base44 `heartbeat` function, backed by Redis instead,
 * so yara.garden can show people each other without depending on any other platform.
 * The client tries Base44 first and falls back here, so both deployments behave the same.
 *
 * As on Base44, the stored row holds only a SHA-256 of the visitor's secret session id.
 * The id itself never leaves their browser, so nothing another visitor can see could be
 * replayed to move their character around.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Visitors fade out of the garden after this long without a heartbeat. */
const STALE_MS = 25_000;
/** A little longer than STALE_MS, so Redis expiry is a backstop rather than the mechanism. */
const TTL_S = 40;

const ZKEY = "yara:presence";
const pkey = (k: string) => `yara:p:${k}`;

type Visitor = {
  id: string;
  name: string;
  avatar: "boy" | "girl";
  x: number;
  y: number;
  mood_hue: string;
  last_seen: string;
};

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Tell the keeper when someone opens the gate, so they can come and be there too. */
async function announce(name: string, avatar: string, othersCount: number) {
  const hook = process.env.PRESENCE_WEBHOOK_URL || process.env.NOTE_WEBHOOK_URL;
  if (!hook) return;
  const who = name || "Someone";
  const pet = avatar === "girl" ? "🐧" : "🐤";
  const company =
    othersCount === 0
      ? "_They're the only one in the garden right now._"
      : `_${othersCount} other${othersCount === 1 ? " is" : "s are"} wandering there too._`;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🌿 **${who}** just opened the gate and stepped into the shared garden ${pet}\n${company}`,
      }),
      signal: AbortSignal.timeout(4_000),
    });
  } catch {
    /* never hold up someone's arrival for a notification */
  }
}

export async function POST(req: Request) {
  // No store configured means no shared garden here, but everything else still works.
  if (!kvReady()) return NextResponse.json({ ok: false, others: [], unavailable: true });

  let b: {
    sessionId?: string;
    name?: string;
    avatar?: "boy" | "girl";
    x?: number;
    y?: number;
    moodHue?: string;
    leaving?: boolean;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const sessionId = (b.sessionId || "").trim();
  if (sessionId.length < 12) return NextResponse.json({ error: "bad session" }, { status: 400 });

  const key = await sha256(sessionId);
  const now = Date.now();
  const cutoff = now - STALE_MS;

  if (b.leaving) {
    try {
      await kv([
        ["DEL", pkey(key)],
        ["ZREM", ZKEY, key],
      ]);
    } catch {
      /* it will expire on its own */
    }
    return NextResponse.json({ ok: true, left: true });
  }

  const row = {
    name: (b.name || "").trim().slice(0, 40),
    avatar: b.avatar === "girl" ? "girl" : "boy",
    x: Number.isFinite(b.x) ? Math.round(b.x as number) : 750,
    y: Number.isFinite(b.y) ? Math.round(b.y as number) : 1055,
    mood_hue: (b.moodHue || "dawn").slice(0, 24),
    last_seen: new Date(now).toISOString(),
  };

  let existed = 1;
  let keys: string[] = [];
  try {
    const [exists, , , , range] = await kv([
      ["EXISTS", pkey(key)],
      ["SET", pkey(key), JSON.stringify(row), "EX", TTL_S],
      ["ZADD", ZKEY, now, key],
      // Sweep anyone who went quiet, so the garden never fills with ghosts.
      ["ZREMRANGEBYSCORE", ZKEY, "-inf", cutoff],
      ["ZRANGEBYSCORE", ZKEY, cutoff, "+inf"],
    ]);
    existed = Number(exists) || 0;
    keys = (Array.isArray(range) ? range : []).map(String).filter((k) => k !== key);
  } catch {
    return NextResponse.json({ ok: false, others: [] }, { status: 500 });
  }

  let others: Visitor[] = [];
  if (keys.length) {
    try {
      const vals = (await kv1("MGET", ...keys.map(pkey))) as (string | null)[];
      others = (Array.isArray(vals) ? vals : [])
        .map((v, i) => {
          if (!v) return null;
          try {
            const d = JSON.parse(v) as Omit<Visitor, "id">;
            return { id: keys[i], ...d } as Visitor;
          } catch {
            return null;
          }
        })
        .filter((v): v is Visitor => !!v);
    } catch {
      /* the caller can live without the roster for one beat */
    }
  }

  // Only on arrival, never on the two-second heartbeats.
  if (!existed) await announce(row.name, row.avatar, others.length);

  return NextResponse.json({ ok: true, meId: key, others });
}
