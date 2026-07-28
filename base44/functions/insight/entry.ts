import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * The Still Pond — Yara's gentle reflection of patterns she has noticed over time.
 *
 * This is the most delicate surface in the app: it tells a person what someone paying
 * close attention has noticed about them. So it is bound hard — patterns are framed as
 * something *she noticed*, never as a conclusion, and never as a diagnosis. Where a
 * pattern genuinely deserves a professional's eyes, it says so softly, without alarm.
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

  let b: { intake?: string; moods?: string[]; talk?: string; profile?: string };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const intake = (b.intake ?? "").slice(0, 1500);
  const moods = (Array.isArray(b.moods) ? b.moods : []).slice(-14);
  const talk = (b.talk ?? "").slice(0, 1600);
  const profile = (b.profile ?? "").slice(0, 2400);

  if (looksLikeCrisis(`${intake} ${moods.join(" ")} ${talk} ${profile}`)) {
    return Response.json({
      crisis: true,
      reflection:
        "Before anything else — what you're carrying sounds heavy, and I need you to be safe. Please reach out to a local crisis line or emergency services right now. You deserve someone who can be right there with you. I'm here too.",
    });
  }

  if (!intake.trim() && moods.length === 0 && !talk.trim() && !profile.trim()) {
    return Response.json({
      reflection:
        "I don't know you well enough yet to show you anything true. Come sit and talk with me a while first — then the water will have something to reflect.",
    });
  }

  const prompt = `${SAFETY}

You are looking into the Still Pond beside this person — a quiet, sacred moment of reflection. Gently mirror back 2–3 patterns you have genuinely noticed in what they've shared over time: mood, sleep, energy, the highs as much as the lows, what lifts them and what weighs on them. Hold each one with warmth, the way a wise friend who pays very close attention would.

RULES: Never diagnose, never name a disorder, never say "you might have X." Frame everything as something YOU noticed, not a conclusion. If a pattern genuinely seems worth a professional's eyes — for example unusually high energy with little need for sleep, or a heaviness that won't lift — gently note it could be worth talking to a doctor about someday, softly and without alarm. Always end with a note of their worth.

Speak warmly in 3–5 short sentences, plain text, no lists, no headings.

What you remember about them over time:
"""${profile || "(still getting to know them)"}"""

What they first shared:
"""${intake || "(little so far)"}"""

Recent mood check-ins: ${moods.join(", ") || "(none yet)"}

Recent things they've said:
"""${talk || "(none yet)"}"""

Look into the pond and reflect gently — speak to what they're actually carrying right now, not generalities.`;

  try {
    const reflection = await base44.integrations.Core.InvokeLLM({ prompt });
    const text = typeof reflection === "string" ? reflection.trim() : "";
    return Response.json({
      reflection:
        text ||
        "What I see most is someone who keeps showing up for themselves, even on the hard days. That isn't nothing — quietly, it's everything.",
    });
  } catch (_err) {
    return Response.json({
      reflection:
        "The water's a little unclear today — but what I do see is someone who's trying, and that matters more than you know.",
    });
  }
}
