import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * Yara's memory, for people who never signed up.
 *
 * Signing in is deliberately optional — asking someone who is struggling to create an
 * account before they can breathe is the wrong trade. But "she remembers you" is the whole
 * promise of this world, and until now an anonymous visitor's memory lived only in their
 * browser. Clear it, or come back on a different device, and she had forgotten them.
 *
 * So an anonymous visitor gets a durable row too, found by the SHA-256 of a secret device
 * id their browser generated. Yara can remember them across sessions while genuinely not
 * knowing who they are: no email, no name beyond the one they chose, and no way to work
 * backwards from the stored hash to the device.
 *
 * Signed-in people are better off and take a different path — their row is owned by them
 * and protected by row-level security, so not even this function's service role is how
 * they read it.
 */

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Row = { id: string; device_key?: string; [k: string]: unknown };

/** Only these fields are ever accepted from a client. */
const FIELDS = ["intake", "profile", "moods", "feelings", "talks", "progress", "display_name"] as const;

function pick(src: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let b: { action?: "load" | "save"; deviceId?: string; data?: Record<string, unknown> };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const action = b.action === "save" ? "save" : "load";
  const deviceId = (b.deviceId || "").trim();
  if (deviceId.length < 12) return Response.json({ error: "bad device id" }, { status: 400 });

  // A signed-in person owns their row; RLS already protects it and the client reads and
  // writes it directly. Nothing for this function to do.
  try {
    const me = await base44.auth.me();
    if (me) return Response.json({ ok: true, owned: true, memory: null });
  } catch {
    /* anonymous — carry on below */
  }

  const device_key = await sha256(deviceId);
  const db = base44.asServiceRole.entities.CompanionMemory;

  // Matched in memory rather than with filter(): the same lookup silently failed to match
  // for Presence, which quietly created a duplicate row on every single write.
  let mine: Row | null = null;
  try {
    const all = (await db.list("-created_date", 500, 0)) as Row[];
    mine = all.find((r) => r.device_key === device_key) ?? null;
  } catch {
    /* treated as "no row yet" */
  }

  if (action === "load") {
    if (!mine) return Response.json({ ok: true, memory: null });
    return Response.json({
      ok: true,
      memory: {
        intake: mine.intake ?? "",
        profile: mine.profile ?? "",
        moods: mine.moods ?? [],
        feelings: mine.feelings ?? [],
        talks: mine.talks ?? {},
        progress: mine.progress ?? {},
        display_name: mine.display_name ?? "",
        last_visit: mine.last_visit ?? null,
      },
    });
  }

  const patch = {
    ...pick(b.data ?? {}),
    device_key,
    last_visit: new Date().toISOString(),
  };

  try {
    if (mine) await db.update(mine.id, patch);
    else await db.create(patch);
  } catch (_err) {
    return Response.json({ ok: false, error: "could not save" }, { status: 500 });
  }

  return Response.json({ ok: true, saved: true });
}
