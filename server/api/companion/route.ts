import { NextResponse } from "next/server";
import { chat, extractJson, looksLikeCrisis, SAFETY, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QA = { question: string; answer: string };
const MAX_Q = 4;

type Step =
  | { question: string; options: string[] }
  | { done: true; reflection: string; crisis?: boolean };

export async function POST(req: Request) {
  let intake = "";
  let answers: QA[] = [];
  try {
    const body = (await req.json()) as { intake?: string; answers?: QA[] };
    intake = (body.intake ?? "").slice(0, 2000);
    answers = Array.isArray(body.answers) ? body.answers.slice(0, MAX_Q) : [];
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Crisis takes priority over everything — short-circuit warmly.
  const allText = intake + " " + answers.map((a) => a.answer).join(" ");
  if (looksLikeCrisis(allText)) {
    return NextResponse.json({
      done: true,
      crisis: true,
      reflection:
        "I'm really glad you told me, and I want you to be safe right now. Please reach out to a local crisis line or emergency services — you deserve support from someone who can be right there with you. I'm here too.",
    } satisfies Step);
  }

  const sys: Msg = {
    role: "system",
    content: `${SAFETY}

You are running a SHORT, gentle intake to understand the person quickly — not an interrogation.
Ask AT MOST ${MAX_Q} questions total, then conclude. Ask ONE short, simple question at a time
(mood, sleep, energy, recent changes, or what kind of help they're hoping for) — whichever most
helps you understand them next. Offer 2–4 short, tappable answer options.

Reply with ONLY a JSON object, no prose, no markdown, no code fences:
- to ask:      {"question":"<one short, warm question>","options":["<short>","<short>","<short>"]}
- to conclude: {"done":true,"reflection":"<2 warm sentences reflecting what you heard — no diagnosis, no advice>"}
Conclude as soon as you understand enough.`,
  };

  const convo =
    answers.map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`).join("\n") || "(no questions yet)";
  const user: Msg = {
    role: "user",
    content: `What they first shared:\n"""${intake || "(nothing yet)"}"""\n\nConversation so far:\n${convo}\n\nReturn the next step as JSON.`,
  };

  try {
    const raw = await chat([sys, user], { temperature: 0.6, maxTokens: 400 });
    const parsed = extractJson<Step>(raw);

    // Hard cap: never exceed MAX_Q questions, even if the model wants more.
    if (!parsed || answers.length >= MAX_Q || (!("question" in parsed) && !("done" in parsed))) {
      return NextResponse.json({
        done: true,
        reflection:
          parsed && "reflection" in parsed && parsed.reflection
            ? parsed.reflection
            : "Thank you for trusting me with that. Let's take the next gentle step together.",
      } satisfies Step);
    }
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      {
        done: true,
        reflection: "Thank you for sharing with me. Let's take the next step together.",
      } satisfies Step,
      { status: 200 },
    );
  }
}
