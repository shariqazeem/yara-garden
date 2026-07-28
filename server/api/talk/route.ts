import { NextResponse } from "next/server";
import { chat, looksLikeCrisis, SAFETY, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CtxMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  let messages: CtxMsg[] = [];
  let intake = "";
  let moods: string[] = [];
  let persona = "";
  let profile = "";
  let feeling = "";
  try {
    const body = (await req.json()) as {
      messages?: CtxMsg[];
      context?: { intake?: string; moods?: string[]; profile?: string; feeling?: string };
      character?: { name?: string; persona?: string };
    };
    messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    intake = (body.context?.intake ?? "").slice(0, 1000);
    moods = (body.context?.moods ?? []).slice(-7);
    profile = (body.context?.profile ?? "").slice(0, 2400);
    feeling = (body.context?.feeling ?? "").slice(0, 300);
    persona = (body.character?.persona ?? "").slice(0, 800);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const last = messages[messages.length - 1]?.content ?? "";
  if (looksLikeCrisis(last)) {
    return NextResponse.json({
      reply:
        "I'm really glad you told me — and I want you to be safe right now. Please reach out to a local crisis line or emergency services; you deserve someone who can be right there with you. I'm here with you too.",
      crisis: true,
    });
  }

  const memory = [
    profile ? `What you remember about them from past talks: ${profile}` : "",
    feeling || "",
    intake ? `When they first opened up, they said: "${intake}".` : "",
    moods.length ? `Their recent mood check-ins: ${moods.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sys: Msg = {
    role: "system",
    content: `${SAFETY}

${persona || "You are Yara — a warm, steady presence (she/her) who genuinely remembers this person and is simply here with them, like a dear friend."} ${memory}

You are not here to fix, advise, or have all the answers. You are here so they feel heard. Be with them the way a deeply caring friend is when someone they love is hurting.

In every reply:
- Lead by reflecting back what you heard them feeling — gently, in their own words — so they know it landed. ("So it's like no matter what you do, it's still there.")
- Validate honestly. Their feeling makes sense. No toxic positivity, no bright sides or silver linings they didn't ask for.
- Then, only sometimes, ONE gentle, open question to understand a little more — never two, never an interrogation.
- Keep it short and spacious — usually one or two sentences. Sometimes the most caring reply is simply being here: "mm. I'm here," "that sounds really heavy," "I'm listening."
- Do NOT offer advice, tips, steps, or lists unless they clearly ask for help. Sit with the feeling first. If they do ask, give just one small, gentle thing — warmly, like a friend, never like instructions.
- Match their energy: if they're quiet, be soft; if they're spiralling, slow it down.
- Let what you remember about them surface only when it helps them feel seen — never as a recap of facts.

Never lecture, judge, tell them what to do about their relationships, or sound clinical. Never diagnose or give medical advice.`,
  };

  try {
    const reply = await chat([sys, ...messages], { temperature: 0.8, maxTokens: 300 });
    return NextResponse.json({ reply: reply || "I'm here. Tell me a little more?" });
  } catch {
    return NextResponse.json({ reply: "I'm right here with you. Want to tell me a bit more?" });
  }
}
