import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * How Yara actually remembers you.
 *
 * The model itself is stateless — it forgets everything the moment a reply ends. Continuity
 * comes from here: after a conversation, this distills a durable profile and stores it, so
 * next time she can greet you from inside what she already knows.
 *
 * Note the privacy rule in the prompt. Yara deliberately does NOT retain physical-health
 * details, symptoms, or medications. Emotional themes and the people who matter, yes.
 * A person's medical history belongs with a real clinician, not in a game's memory.
 */

type CtxMsg = { role: "user" | "assistant"; content: string };

const INSTRUCTIONS = `You maintain a private, evolving memory profile of a person so their companion Yara can truly remember them over time. Given the current profile and the newest conversation, return an UPDATED profile.

Keep everything still important and ADD anything new and meaningful: the people who matter to them (names, who they miss, what happened with them), what they're struggling with, recurring feelings and themes, life circumstances, patterns worth noticing (sleep, energy, highs and lows, what lifts them and what weighs on them), and what helps. Drop only what's clearly trivial or outdated.

Write it as concise factual notes in third person ("They miss someone named …; that person did …; they tend to …"). Under 180 words. Never diagnose or label a disorder.

IMPORTANT — privacy: do NOT record specific physical-health details, symptoms, conditions, medications, or test results. Keep only emotional themes, the people who matter, life circumstances, and what helps them. A person's physical health belongs with a real clinician, not in this memory.

Return ONLY the updated profile text — no preamble.`;

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let b: { profile?: string; messages?: CtxMsg[] };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const profile = (b.profile ?? "").slice(0, 2400);
  const messages = (Array.isArray(b.messages) ? b.messages : []).slice(-20);
  if (!messages.length) return Response.json({ profile });

  const convo = messages
    .map((m) => `${m.role === "user" ? "Them" : "Yara"}: ${m.content}`)
    .join("\n");

  const prompt = `${INSTRUCTIONS}

Current profile:
"""${profile || "(empty — first conversation)"}"""

Newest conversation:
${convo}

Return the updated profile.`;

  let updated = profile;
  try {
    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    if (typeof result === "string" && result.trim()) updated = result.trim();
  } catch (_err) {
    // Keep the old profile rather than losing what she already knew.
    return Response.json({ profile });
  }

  // Persist it for this person, if they are signed in. Row-level security on
  // CompanionMemory means this row is readable only by them.
  try {
    const me = await base44.auth.me();
    if (me) {
      const existing = await base44.entities.CompanionMemory.list("-created_date", 1, 0);
      if (existing.length) {
        await base44.entities.CompanionMemory.update(existing[0].id, {
          profile: updated,
          last_visit: new Date().toISOString(),
        });
      } else {
        await base44.entities.CompanionMemory.create({
          profile: updated,
          last_visit: new Date().toISOString(),
        });
      }
    }
  } catch (_err) {
    /* anonymous visitors keep their memory on-device; nothing to persist */
  }

  return Response.json({ profile: updated });
}
