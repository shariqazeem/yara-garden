import { NextResponse } from "next/server";
import { chat, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CtxMsg = { role: "user" | "assistant"; content: string };

// Distills a durable, evolving profile of the person so Yara genuinely remembers them
// across conversations — the people they miss, what happened, what they're carrying, their
// patterns. Not user-facing; this is Yara's private memory.
export async function POST(req: Request) {
  let profile = "";
  let messages: CtxMsg[] = [];
  try {
    const b = (await req.json()) as { profile?: string; messages?: CtxMsg[] };
    profile = (b.profile ?? "").slice(0, 2400);
    messages = Array.isArray(b.messages) ? b.messages.slice(-20) : [];
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!messages.length) return NextResponse.json({ profile });

  const sys: Msg = {
    role: "system",
    content: `You maintain a private, evolving memory profile of a person so their companion Yara can truly remember them over time. Given the current profile and the newest conversation, return an UPDATED profile.
Keep everything still important and ADD anything new and meaningful: the people who matter to them (names, who they miss, what happened with them), what they're struggling with, recurring feelings and themes, life circumstances, patterns worth noticing (sleep, energy, highs and lows, what lifts them and what weighs on them), and what helps. Drop only what's clearly trivial or outdated.
Write it as concise factual notes in third person ("They miss someone named …; that person did …; they tend to …"). Under 180 words. Never diagnose or label a disorder.
IMPORTANT — privacy: do NOT record specific physical-health details, symptoms, conditions, medications, or test results (e.g. "has chest tightness", "trouble sleeping with palpitations"). Keep only emotional themes, the people who matter, life circumstances, and what helps them. A person's physical health belongs with a real clinician, not in this memory.
Return ONLY the updated profile text — no preamble.`,
  };
  const convo = messages.map((m) => `${m.role === "user" ? "Them" : "Yara"}: ${m.content}`).join("\n");
  const user: Msg = {
    role: "user",
    content: `Current profile:\n"""${profile || "(empty — first conversation)"}"""\n\nNewest conversation:\n${convo}\n\nReturn the updated profile.`,
  };

  try {
    const updated = await chat([sys, user], { temperature: 0.3, maxTokens: 360 });
    return NextResponse.json({ profile: (updated || profile).trim() });
  } catch {
    return NextResponse.json({ profile });
  }
}
