import { createClientFromRequest } from "npm:@base44/sdk";
import { askJson } from "./ai.ts";

/**
 * Leaving a note.
 *
 * Two different things can happen here, and which one is entirely the writer's choice:
 *
 *   1. ALWAYS — the note is delivered privately to the person who tends this world,
 *      via a webhook. This is the original behaviour and it never changed: someone can
 *      write something they only want one person to read, and that is where it goes.
 *
 *   2. ONLY IF THEY ASK (`share: true`) — the note is also screened and, if it is safe
 *      for a hurting stranger to find, placed in the world as a lantern others can open.
 *
 * The split matters. People write things here they would never post publicly, and the
 * app must never quietly turn a private confession into public content. Sharing is opt-in,
 * per note, and the screening still cannot be bypassed: GardenNote sets `create: false`,
 * so this function's service-role write is the only path into the shared garden.
 */

/** Fast keyword pre-screen, so acute cases never depend on the model alone. */
function looksLikeCrisis(text: string): boolean {
  return /\b(suicid|kill myself|end my life|don'?t want to (be alive|live)|harm myself|hurt myself|self-harm|want to die)\b/i.test(
    text,
  );
}

const SUPPORT_REPLY =
  "Thank you for trusting this place with that. Please reach out to a local crisis line or emergency services right now — you deserve someone who can be right there with you. You are not a burden for needing that.";

type Screen = { safe: boolean; in_distress: boolean; reason?: string };

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let b: { message?: string; name?: string; player?: string; share?: boolean };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const message = (b.message || "").trim().slice(0, 4000);
  if (!message) return Response.json({ error: "empty" }, { status: 400 });

  const from_name = (b.name || "").trim().slice(0, 80);
  const player = (b.player || "").trim().slice(0, 80);
  const wantsToShare = b.share === true;

  const inCrisis = looksLikeCrisis(message);

  // 1. The private delivery always happens, first, whatever else follows.
  const hook = Deno.env.get("NOTE_WEBHOOK_URL");
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content:
            `🕊️ **A note was left in Yara**${from_name ? ` — from *${from_name}*` : ""}` +
            `${player ? ` _(playing as ${player})_` : ""}` +
            `${wantsToShare ? " · _asked to share it as a lantern_" : ""}` +
            `${inCrisis ? "\n⚠️ _crisis language detected — they were shown support resources_" : ""}` +
            `\n\n${message}`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      /* delivery is best-effort; never block the person on it */
    }
  }

  // 2. Someone in danger gets a person, not a lantern.
  if (inCrisis) {
    return Response.json({ ok: true, published: false, needs_support: true, reply: SUPPORT_REPLY });
  }

  // 3. Private note, and they didn't ask to share it. Done.
  if (!wantsToShare) {
    return Response.json({ ok: true, published: false, reply: "It landed softly." });
  }

  // 4. They asked to share it. Screen before it can reach a stranger.
  let screen: Screen = { safe: true, in_distress: false };
  const SCREEN_SCHEMA = {
    type: "object",
    properties: {
      safe: { type: "boolean" },
      in_distress: { type: "boolean" },
      reason: { type: "string", description: "A few words, for the log only." },
    },
    required: ["safe", "in_distress"],
  };

  const result = await askJson<Screen>(
    base44,
    `You are screening a short note that someone has asked to leave in a public healing garden, where strangers who are struggling will find it.

Decide two things:
- "safe": is this note safe for a hurting stranger to stumble on? Notes that are gentle, hopeful, sad-but-kind, or simply honest are safe. Notes containing abuse, harassment, hate, graphic content, spam, advertising, or anything that could push a vulnerable reader further down are NOT safe.
- "in_distress": does the WRITER sound like they may be in danger, or thinking about harming themselves?

The note:
"""${message}"""`,
    SCREEN_SCHEMA,
  );

  // If the screen itself fails, fail CLOSED — the private delivery already happened.
  if (!result) {
    return Response.json({
      ok: true,
      published: false,
      reply: "Your note reached the keeper. The garden was too quiet to hang a lantern just now.",
    });
  }
  screen = { ...screen, ...result };

  if (screen.in_distress) {
    return Response.json({ ok: true, published: false, needs_support: true, reply: SUPPORT_REPLY });
  }

  if (!screen.safe) {
    return Response.json({
      ok: true,
      published: false,
      reply:
        "Your note reached the keeper, and I'm keeping this one just between you. The garden stays gentle for whoever wanders in next.",
    });
  }

  try {
    await base44.asServiceRole.entities.GardenNote.create({
      message,
      from_name,
      // Scatter lanterns across the world (1500x1150) so finding one feels like a
      // discovery, while keeping clear of the plaza and the roads through the middle.
      lantern_x: Math.round(120 + Math.random() * 1260),
      lantern_y: Math.round(120 + Math.random() * 900),
      found_count: 0,
    });
  } catch (_err) {
    return Response.json({
      ok: true,
      published: false,
      reply: "Your note reached the keeper, but the lantern wouldn't light. Please try again in a moment.",
    });
  }

  return Response.json({ ok: true, published: true, reply: "Your lantern is lit. Someone will find it." });
}
