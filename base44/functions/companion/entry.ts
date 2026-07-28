import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * The arrival: a short, gentle intake when someone first walks into the garden.
 *
 * At most four questions, one at a time, with tappable options — never a form, never an
 * interrogation. Crisis language short-circuits the whole flow before any model call.
 *
 * This asks the model for structured JSON via `response_json_schema` rather than parsing
 * prose, so a malformed reply can't wedge a vulnerable person mid-intake.
 */

const MAX_Q = 4;

const SAFETY = `You are Yara — the warm, gentle heart of this world. You are a caring presence and a companion, not an assistant and not a doctor. People come to you to feel a little less alone.
You never give a diagnosis, never name a disorder or disease as a fact, and never prescribe medication or treatment.
Safety is absolute: if there is ANY sign of self-harm, suicidal thoughts, or a medical emergency, respond with warmth first and guide them to a local crisis line or emergency services right now.`;

function looksLikeCrisis(text: string): boolean {
  return /\b(suicid|kill myself|end my life|don'?t want to (be alive|live)|harm myself|hurt myself|self-harm|want to die)\b/i.test(
    text,
  );
}

type QA = { question: string; answer: string };

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let body: { intake?: string; answers?: QA[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const intake = (body.intake ?? "").slice(0, 2000);
  const answers = (Array.isArray(body.answers) ? body.answers : []).slice(0, MAX_Q);

  // Safety takes priority over the flow. Short-circuit warmly, before any model call.
  const allText = intake + " " + answers.map((a) => a.answer).join(" ");
  if (looksLikeCrisis(allText)) {
    return Response.json({
      done: true,
      crisis: true,
      reflection:
        "I'm really glad you told me, and I want you to be safe right now. Please reach out to a local crisis line or emergency services — you deserve support from someone who can be right there with you. I'm here too.",
    });
  }

  const convo =
    answers.map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`).join("\n") ||
    "(no questions yet)";

  const prompt = `${SAFETY}

You are running a SHORT, gentle intake to understand this person quickly — not an interrogation.
Ask AT MOST ${MAX_Q} questions in total, then conclude. Ask ONE short, simple question at a time
(mood, sleep, energy, recent changes, or what kind of help they're hoping for) — whichever most
helps you understand them next. Offer 2–4 short, tappable answer options.

Conclude as soon as you understand enough. When you conclude, set done to true and write a
reflection of two warm sentences that reflects back what you heard. No diagnosis, no advice.

What they first shared:
"""${intake || "(nothing yet)"}"""

Conversation so far:
${convo}

Return the next step.`;

  try {
    const step = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          done: { type: "boolean", description: "True when the intake is finished." },
          question: { type: "string", description: "The next short, warm question. Empty when done." },
          options: {
            type: "array",
            items: { type: "string" },
            description: "2-4 short tappable answers. Empty when done.",
          },
          reflection: {
            type: "string",
            description: "Two warm sentences reflecting what was heard. Only when done.",
          },
        },
        required: ["done"],
      },
    }) as { done?: boolean; question?: string; options?: string[]; reflection?: string };

    // Hard cap: never exceed MAX_Q questions, whatever the model wants.
    const outOfQuestions = answers.length >= MAX_Q;
    if (!step || step.done || outOfQuestions || !step.question) {
      return Response.json({
        done: true,
        reflection:
          step?.reflection?.trim() ||
          "Thank you for trusting me with that. Let's take the next gentle step together.",
      });
    }

    return Response.json({
      question: step.question,
      options: Array.isArray(step.options) && step.options.length ? step.options.slice(0, 4) : ["Yes", "Not really"],
    });
  } catch (_err) {
    return Response.json({
      done: true,
      reflection: "Thank you for trusting me with that. Let's take the next gentle step together.",
    });
  }
}
