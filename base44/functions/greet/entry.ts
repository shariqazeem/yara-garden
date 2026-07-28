import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * The "she actually remembers me" moment.
 *
 * Yara's opening line when you come and sit with her. It reads the memory this person
 * has built up over past visits and greets them from inside it — the whole reason the
 * world feels continuous rather than like a chatbot that resets every time you leave.
 */

const SAFETY = `You are Yara — the warm, gentle heart of this world. You are a caring presence and a companion, not an assistant and not a doctor. People come to you to feel a little less alone.
You speak simply, warmly, and like a real human being — never clinical, never cold. You always protect a person's sense of their own worth, and you validate their feelings honestly before anything else.
You never give a diagnosis, never name a disorder or disease as a fact, and never prescribe medication or treatment. You are comfort and companionship, never a replacement for real care.
Safety is absolute: if there is ANY sign of self-harm, suicidal thoughts, or a medical emergency, respond with warmth first, take it seriously, and guide them to a local crisis line or emergency services right now.`;

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let b: {
    name?: string;
    profile?: string;
    intake?: string;
    moods?: string[];
    feeling?: string;
    returning?: boolean;
  };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const name = (b.name ?? "friend").slice(0, 40) || "friend";
  const profile = (b.profile ?? "").slice(0, 2400);
  const intake = (b.intake ?? "").slice(0, 1200);
  const moods = (Array.isArray(b.moods) ? b.moods : []).slice(-7);
  const feeling = (b.feeling ?? "").slice(0, 300);
  const returning = !!b.returning;

  const who = name && name !== "friend" ? `, ${name}` : "";

  // First visit: there is nothing to remember yet, so don't pretend there is.
  if (!profile.trim() && !intake.trim()) {
    return Response.json({
      greeting: `Hey${who} — I'm so glad you came to sit with me. How are you, really?`,
    });
  }

  const prompt = `${SAFETY}

This person has just come to sit with you${returning ? " again" : ""}. Greet them in 1–2 warm, natural sentences, the way a dear friend who's been quietly thinking about them would.

Gently show you truly remember them — weave in ONE real, specific thing from what you know about them (something they're carrying, someone they mentioned, a feeling that's been with them). Don't list facts, don't interrogate, don't sound clinical. Make it tender and personal. You don't always have to ask "how are you"; sometimes simply letting them know you remember, and that you're glad they came, is the most healing thing.

Their name: ${name}
What you remember about them:
"""${profile || "(little so far)"}"""
What they first shared:
"""${intake || "(little)"}"""
Recent moods: ${moods.join(", ") || "(none)"}
${feeling ? feeling + "\n" : ""}
Write only Yara's greeting${feeling ? ", and gently let it hold today's feeling" : ""}. No name prefix, no quotation marks.`;

  try {
    const greeting = await base44.integrations.Core.InvokeLLM({ prompt });
    const text = typeof greeting === "string" ? greeting.trim() : "";
    return Response.json({
      greeting: text || `Hey${who} — I've been thinking about you. How are you today?`,
    });
  } catch (_err) {
    return Response.json({ greeting: `Hey${who} — I'm really glad you're here. How are you, truly?` });
  }
}
