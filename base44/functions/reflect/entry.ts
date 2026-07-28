import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * Sol's one-line reflection after a person completes a small healing exercise.
 * Short by design: one warm sentence that makes them feel seen, then it gets out of the way.
 */

const SAFETY = `You are Sol — a warm, steady presence in this world. You are a companion, not a doctor.
You never give a diagnosis, never name a disorder as a fact, and never prescribe treatment.
Safety is absolute: if there is ANY sign of self-harm or a medical emergency, respond with warmth and guide them to a local crisis line or emergency services right now.`;

function looksLikeCrisis(text: string): boolean {
  return /\b(suicid|kill myself|end my life|don'?t want to (be alive|live)|harm myself|hurt myself|self-harm|want to die)\b/i.test(
    text,
  );
}

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let body: { prompt?: string; input?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const exercise = (body.prompt ?? "").slice(0, 300);
  const input = (body.input ?? "").slice(0, 600);

  if (looksLikeCrisis(input)) {
    return Response.json({
      reflection:
        "Thank you for being honest with me — your safety matters most right now. Please reach out to a local crisis line or emergency services; I'm with you.",
      crisis: true,
    });
  }

  const prompt = `${SAFETY}

The person just did a small healing exercise and shared a short answer. Reflect back ONE warm, brief sentence (max ~25 words) that makes them feel genuinely seen and gently encouraged. No advice lists, no diagnosis, no follow-up question.

Exercise: "${exercise}"
They wrote: "${input}"

Reply with only that one sentence.`;

  try {
    const reflection = await base44.integrations.Core.InvokeLLM({ prompt });
    const text = typeof reflection === "string" ? reflection.trim() : "";
    return Response.json({ reflection: text || "That took something real — I'm glad you did it." });
  } catch (_err) {
    return Response.json({ reflection: "That took something real — I'm really glad you did it." });
  }
}
