import { NextResponse } from "next/server";
import { chat, looksLikeCrisis, SAFETY, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let prompt = "";
  let input = "";
  try {
    const body = (await req.json()) as { prompt?: string; input?: string };
    prompt = (body.prompt ?? "").slice(0, 300);
    input = (body.input ?? "").slice(0, 600);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (looksLikeCrisis(input)) {
    return NextResponse.json({
      reflection:
        "Thank you for being honest with me — your safety matters most right now. Please reach out to a local crisis line or emergency services; I'm with you.",
      crisis: true,
    });
  }

  const sys: Msg = {
    role: "system",
    content: `${SAFETY}

You are Sol. The person just did a small healing exercise and shared a short answer. Reflect back ONE warm, brief sentence (max ~25 words) that makes them feel genuinely seen and gently encouraged. No advice lists, no diagnosis, no follow-up question.`,
  };
  const user: Msg = {
    role: "user",
    content: `Exercise: "${prompt}". They wrote: "${input}". Reflect in one warm sentence.`,
  };

  try {
    const reflection = await chat([sys, user], { temperature: 0.7, maxTokens: 90 });
    return NextResponse.json({ reflection: reflection || "That took something real — I'm glad you did it." });
  } catch {
    return NextResponse.json({ reflection: "That took something real — I'm really glad you did it." });
  }
}
