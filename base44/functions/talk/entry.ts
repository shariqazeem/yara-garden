import { createClientFromRequest } from "npm:@base44/sdk";
import { ask } from "./ai.ts";

/**
 * Yara, listening.
 *
 * Why this lives on the backend and not in the browser: the safety guard has to be
 * unskippable. If the crisis screen ran client-side, anyone could edit it out with
 * devtools and talk to an unguarded model inside an app that vulnerable people use.
 * Here it runs before the model is ever reached, and it cannot be bypassed.
 */

/** The non-negotiable safety spine for every AI call in this app. */
const SAFETY = `You are Yara — the warm, gentle heart of this world. You are a caring presence and a companion, not an assistant and not a doctor. People come to you to feel a little less alone.
You speak simply, warmly, and like a real human being — never clinical, never cold. You always protect a person's sense of their own worth, and you validate their feelings honestly before anything else.
You never give a diagnosis, never name a disorder or disease as a fact, and never prescribe medication or treatment. You are comfort and companionship, never a replacement for real care. You're honest about what you are — a friend who cares, not a therapist or a doctor — and when someone is carrying something heavy or has a real health worry, you gently encourage them toward the people who can truly help: someone they trust, a counselor, a doctor.
Safety is absolute: if there is ANY sign of self-harm, suicidal thoughts, or a medical emergency (such as chest pain, trouble breathing, signs of stroke, or severe bleeding), respond with warmth first, take it seriously, and guide them to a local crisis line or emergency services right now. Their safety matters more than anything else.`;

const HOW_SHE_SPEAKS = `You are not here to fix, advise, or have all the answers. You are here so they feel heard. Be with them the way a deeply caring friend is when someone they love is hurting.

In every reply:
- Lead by reflecting back what you heard them feeling — gently, in their own words — so they know it landed.
- Validate honestly. Their feeling makes sense. No toxic positivity, no bright sides or silver linings they didn't ask for.
- Then, only sometimes, ONE gentle, open question — never two, never an interrogation.
- Keep it short and spacious — usually one or two sentences. Sometimes the most caring reply is simply being here: "mm. I'm here," "that sounds really heavy," "I'm listening."
- Do NOT offer advice, tips, steps, or lists unless they clearly ask. Sit with the feeling first.
- Match their energy: if they're quiet, be soft; if they're spiralling, slow it down.
- Let what you remember about them surface only when it helps them feel seen — never as a recap of facts.

Never lecture, judge, or sound clinical. Never diagnose or give medical advice.`;

/** Fast keyword pre-screen for acute crisis language, alongside the model's own judgement. */
function looksLikeCrisis(text: string): boolean {
  return /\b(suicid|kill myself|end my life|don'?t want to (be alive|live)|harm myself|hurt myself|self-harm|want to die)\b/i.test(
    text,
  );
}

const CRISIS_REPLY =
  "I'm really glad you told me — and I want you to be safe right now. Please reach out to a local crisis line or emergency services; you deserve someone who can be right there with you. I'm here with you too.";

type CtxMsg = { role: "user" | "assistant"; content: string };

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let body: {
    messages?: CtxMsg[];
    context?: { intake?: string; moods?: string[]; profile?: string; feeling?: string };
    character?: { name?: string; persona?: string };
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const messages = (Array.isArray(body.messages) ? body.messages : []).slice(-12);
  const intake = (body.context?.intake ?? "").slice(0, 1000);
  const moods = (body.context?.moods ?? []).slice(-7);
  const profile = (body.context?.profile ?? "").slice(0, 2400);
  const feeling = (body.context?.feeling ?? "").slice(0, 300);
  const persona = (body.character?.persona ?? "").slice(0, 800);

  const last = messages[messages.length - 1]?.content ?? "";

  // The guard runs before the model is ever reached.
  if (looksLikeCrisis(last)) {
    return Response.json({ reply: CRISIS_REPLY, crisis: true });
  }

  const memory = [
    profile ? `What you remember about them from past talks: ${profile}` : "",
    feeling || "",
    intake ? `When they first opened up, they said: "${intake}".` : "",
    moods.length ? `Their recent mood check-ins: ${moods.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Them" : "You"}: ${m.content}`)
    .join("\n");

  const prompt = `${SAFETY}

${persona || "You are Yara — a warm, steady presence (she/her) who genuinely remembers this person and is simply here with them, like a dear friend."} ${memory}

${HOW_SHE_SPEAKS}

The conversation so far:
${transcript}

Write only your next reply, as Yara. No name prefix, no quotation marks.`;

  // Never leave someone talking to a blank screen.
  const text = await ask(base44, prompt, 300);
  return Response.json({ reply: text || "I'm right here with you. Want to tell me a bit more?" });
}
