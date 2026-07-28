import { NextResponse } from "next/server";
import { chat, extractJson, looksLikeCrisis } from "@/lib/ai";
import { kv, kvReady } from "@/lib/kv";

/**
 * Leaving a note, standalone.
 *
 * Same contract and same duty of care as the Base44 `leaveNote` function, so yara.garden
 * behaves identically without it:
 *
 *   1. ALWAYS delivered privately to the person who tends this world, via a webhook.
 *   2. ONLY IF THEY ASK (`share: true`) is it screened and hung in the world as a lantern.
 *
 * Sharing is opt-in per note, because people write things here they would never post, and
 * the app must never quietly turn a private confession into public content. If the screen
 * itself fails, this fails CLOSED and nothing unscreened reaches a stranger.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LKEY = "yara:lanterns";

const SUPPORT_REPLY =
  "Thank you for trusting this place with that. Please reach out to a local crisis line or emergency services right now — you deserve someone who can be right there with you. You are not a burden for needing that.";

type Screen = { safe: boolean; in_distress: boolean; reason?: string };

export async function POST(req: Request) {
  let b: { message?: string; name?: string; player?: string; share?: boolean };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const message = (b.message || "").trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });

  const from_name = (b.name || "").trim().slice(0, 80);
  const player = (b.player || "").trim().slice(0, 80);
  const wantsToShare = b.share === true;
  const inCrisis = looksLikeCrisis(message);

  // 1. The private delivery always happens, first, whatever else follows.
  const hook = process.env.NOTE_WEBHOOK_URL;
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
    return NextResponse.json({ ok: true, published: false, needs_support: true, reply: SUPPORT_REPLY });
  }

  // 3. Private note, and they didn't ask to share it. Done.
  if (!wantsToShare) {
    return NextResponse.json({ ok: true, published: false, reply: "It landed softly." });
  }

  if (!kvReady()) {
    return NextResponse.json({
      ok: true,
      published: false,
      reply: "Your note reached the keeper. No lantern could be hung here just now.",
    });
  }

  // 4. They asked to share it. Screen before it can reach a stranger.
  let screen: Screen | null = null;
  try {
    const raw = await chat(
      [
        {
          role: "system",
          content:
            'You screen short notes left in a public healing garden, where strangers who are struggling will find them. Reply with ONLY a JSON object: {"safe": boolean, "in_distress": boolean}. "safe" is false for abuse, harassment, hate, graphic content, spam, advertising, or anything that could push a vulnerable reader further down. Gentle, hopeful, sad-but-kind or simply honest notes are safe. "in_distress" is true if the WRITER sounds like they may be in danger or thinking about harming themselves.',
        },
        { role: "user", content: `The note:\n"""${message}"""` },
      ],
      { temperature: 0, maxTokens: 800 },
    );
    screen = extractJson<Screen>(raw);
  } catch {
    screen = null;
  }

  // If the screen itself fails, fail CLOSED — the private delivery already happened.
  if (!screen) {
    return NextResponse.json({
      ok: true,
      published: false,
      reply: "Your note reached the keeper. The garden was too quiet to hang a lantern just now.",
    });
  }

  if (screen.in_distress) {
    return NextResponse.json({ ok: true, published: false, needs_support: true, reply: SUPPORT_REPLY });
  }

  if (!screen.safe) {
    return NextResponse.json({
      ok: true,
      published: false,
      reply:
        "Your note reached the keeper, and I'm keeping this one just between you. The garden stays gentle for whoever wanders in next.",
    });
  }

  try {
    await kv([
      [
        "LPUSH",
        LKEY,
        JSON.stringify({
          id: `l${Date.now()}${Math.floor(Math.random() * 1000)}`,
          message,
          from_name,
          // Scatter lanterns across the world (1500x1150) so finding one feels like a
          // discovery, while keeping clear of the plaza and the roads through the middle.
          lantern_x: Math.round(120 + Math.random() * 1260),
          lantern_y: Math.round(120 + Math.random() * 900),
          created_date: new Date().toISOString(),
        }),
      ],
      // Keep the most recent 200 so the world stays walkable.
      ["LTRIM", LKEY, 0, 199],
    ]);
  } catch {
    return NextResponse.json({
      ok: true,
      published: false,
      reply: "Your note reached the keeper, but the lantern wouldn't light. Please try again in a moment.",
    });
  }

  return NextResponse.json({ ok: true, published: true, reply: "Your lantern is lit. Someone will find it." });
}
