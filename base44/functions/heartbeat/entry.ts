import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * Presence in the shared garden.
 *
 * The only way a visitor appears in, moves through, or leaves the shared world. Clients
 * cannot write to the Presence table directly (`create`/`update`/`delete` are all false),
 * so every heartbeat lands here and is written with the service role.
 *
 * Why the hashing: the realtime feed broadcasts each Presence row to every other player.
 * If the row held the visitor's session id, anyone listening could replay it and puppet
 * that person's character. So the row stores only a SHA-256 of the secret, which is safe
 * to broadcast and useless for writing.
 *
 * Presence carries a chosen display name and nothing else. No account, no email, no user
 * id — it is deliberately impossible to join a person's public presence to their private
 * CompanionMemory row.
 */

/**
 * Visitors fade out of the garden after this long without a heartbeat.
 *
 * Heartbeats arrive every 2s, so this tolerates ~12 dropped beats before someone is
 * swept — forgiving of a bad connection, while still clearing people who closed the tab
 * within a few seconds. Browsers do not reliably fire `pagehide`, so this timeout, rather
 * than the explicit leave, is what actually keeps the world free of ghosts.
 */
const STALE_MS = 25_000;

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Row = {
  id: string;
  session_key: string;
  display_name?: string;
  avatar?: string;
  x?: number;
  y?: number;
  mood_hue?: string;
  last_seen?: string;
};

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

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
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const sessionId = (b.sessionId || "").trim();
  if (sessionId.length < 12) return Response.json({ error: "bad session" }, { status: 400 });

  const session_key = await sha256(sessionId);
  const db = base44.asServiceRole.entities.Presence;

  // One read serves everything: finding our own row, building the list of other people,
  // and sweeping the ones who have gone quiet.
  //
  // This deliberately does NOT use `filter({ session_key })`. That lookup silently failed
  // to match, so every heartbeat believed it was the visitor's first and created another
  // row — one new row every two seconds per person. Matching in memory is exact, and it
  // also lets us clean up any duplicates a session already accumulated.
  let all: Row[] = [];
  try {
    all = (await db.list("-last_seen", 500, 0)) as Row[];
  } catch {
    /* fall through: we can still write our own row */
  }

  const ourRows = all.filter((r) => r.session_key === session_key);
  const mine: Row | null = ourRows[0] ?? null;
  const duplicates = ourRows.slice(1);

  // Closing the tab, or stepping back out into the quiet.
  if (b.leaving) {
    for (const r of ourRows) {
      try {
        await db.delete(r.id);
      } catch {
        /* it will go stale and be swept anyway */
      }
    }
    return Response.json({ ok: true, left: true });
  }

  // Collapse any duplicates this session left behind before the fix.
  for (const r of duplicates.slice(0, 20)) {
    try {
      await db.delete(r.id);
    } catch {
      /* the sweep will get it */
    }
  }

  const now = Date.now();
  const patch = {
    session_key,
    display_name: (b.name || "").trim().slice(0, 40),
    avatar: b.avatar === "girl" ? "girl" : "boy",
    x: Number.isFinite(b.x) ? Math.round(b.x as number) : 750,
    y: Number.isFinite(b.y) ? Math.round(b.y as number) : 1055,
    mood_hue: (b.moodHue || "dawn").slice(0, 24),
    last_seen: new Date(now).toISOString(),
  };

  // The client needs its own row id back. The realtime feed delivers every Presence row
  // to every player, including their own, so without this a person sees a ghost of
  // themselves drifting across the world and merging into their character.
  let meId: string | null = mine?.id ?? null;
  try {
    if (mine) await db.update(mine.id, patch);
    else {
      const created = (await db.create(patch)) as Row;
      meId = created?.id ?? null;
    }
  } catch (_err) {
    return Response.json({ ok: false, error: "could not update presence" }, { status: 500 });
  }

  // Everyone else who is still awake, one entry per person, freshest row wins.
  const freshest = new Map<string, Row>();
  const stale: Row[] = [];
  for (const r of all) {
    if (r.session_key === session_key) continue;
    const seen = Date.parse(r.last_seen ?? "") || 0;
    if (now - seen > STALE_MS) {
      stale.push(r);
      continue;
    }
    const held = freshest.get(r.session_key);
    if (!held) freshest.set(r.session_key, r);
    else {
      // A duplicate from another session: keep the newer one, sweep the older.
      const heldSeen = Date.parse(held.last_seen ?? "") || 0;
      if (seen > heldSeen) {
        freshest.set(r.session_key, r);
        stale.push(held);
      } else stale.push(r);
    }
  }

  // Sweep the ghosts, a handful per call so one heartbeat never becomes a long job.
  for (const r of stale.slice(0, 15)) {
    try {
      await db.delete(r.id);
    } catch {
      /* another heartbeat will get it */
    }
  }

  const others = Array.from(freshest.values());

  return Response.json({
    ok: true,
    meId,
    // Never echo session keys back to the client; it has no use for them.
    others: others.map((o) => ({
      id: o.id,
      name: o.display_name ?? "",
      avatar: o.avatar ?? "boy",
      x: o.x ?? 750,
      y: o.y ?? 1055,
      mood_hue: o.mood_hue ?? "dawn",
      last_seen: o.last_seen,
    })),
  });
}
