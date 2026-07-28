import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * "How Yara sees you" — a warm, honest, strengths-focused portrait, written for the person
 * themselves so they can meet themselves a little more kindly.
 *
 * The Still Pond is awareness-facing; this is growth-facing. It is explicitly not flattery:
 * if someone is struggling, it honours that and still finds what is genuinely strong in them.
 */

const SAFETY = `You are Yara — the warm, gentle heart of this world. You are a caring presence and a companion, not an assistant and not a doctor.
You never give a diagnosis, never name a disorder or disease as a fact, and never prescribe medication or treatment.
Safety is absolute: if there is ANY sign of self-harm, suicidal thoughts, or a medical emergency, respond with warmth first and guide them to a local crisis line or emergency services right now.`;

function looksLikeCrisis(text: string): boolean {
  return /\b(suicid|kill myself|end my life|don'?t want to (be alive|live)|harm myself|hurt myself|self-harm|want to die)\b/i.test(
    text,
  );
}

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let b: { intake?: string; moods?: string[]; talk?: string; profile?: string; name?: string };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const intake = (b.intake ?? "").slice(0, 1500);
  const moods = (Array.isArray(b.moods) ? b.moods : []).slice(-14);
  const talk = (b.talk ?? "").slice(0, 1600);
  const profile = (b.profile ?? "").slice(0, 2400);
  const name = (b.name ?? "friend").slice(0, 40) || "friend";

  if (looksLikeCrisis(`${intake} ${talk} ${profile}`)) {
    return Response.json({
      portrait:
        "Right now, what matters most is that you're safe. Please reach out to a local crisis line or emergency services — you deserve someone right there with you. I'm here too.",
    });
  }

  if (!intake.trim() && moods.length === 0 && !talk.trim() && !profile.trim()) {
    return Response.json({
      portrait: `I'm still getting to know you, ${name}. Sit and talk with me a while, walk a path or two — then I'll be able to show you what I see.`,
    });
  }

  const prompt = `${SAFETY}

You are gently painting a portrait of who this person is — for THEM, so they can see themselves more kindly. Draw on everything they've shared. Name 2–3 real strengths or qualities you genuinely notice in them, and one tender hope for how they might grow. Be specific and true, not flattery; if they're struggling, honour that and still find what's strong in them. Never diagnose or name a disorder.

Address them directly as "you". Warm, 4–6 short sentences, plain text — no lists, no headings.

Their name: ${name}
What you remember about them over time:
"""${profile || "(still getting to know them)"}"""
What they first shared:
"""${intake || "(little)"}"""
Recent moods: ${moods.join(", ") || "(none)"}
Things they've said:
"""${talk || "(none)"}"""

Paint who they are, for them to read.`;

  try {
    const portrait = await base44.integrations.Core.InvokeLLM({ prompt });
    const text = typeof portrait === "string" ? portrait.trim() : "";
    return Response.json({
      portrait:
        text ||
        `${name}, what I see is someone who keeps showing up for themselves — and that's a quiet, real kind of strength.`,
    });
  } catch (_err) {
    return Response.json({
      portrait: `${name}, what I see is someone who's trying — and that matters more than you know.`,
    });
  }
}
