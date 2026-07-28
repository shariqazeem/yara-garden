import { NextResponse } from "next/server";
import { chat, looksLikeCrisis, SAFETY, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Still Pond — Yara's gentle, model-driven reflection of patterns she's noticed.
// This is where "catch what others miss" becomes visible — as awareness, never a diagnosis.
export async function POST(req: Request) {
  let intake = "";
  let moods: string[] = [];
  let talk = "";
  let profile = "";
  try {
    const b = (await req.json()) as { intake?: string; moods?: string[]; talk?: string; profile?: string };
    intake = (b.intake ?? "").slice(0, 1500);
    moods = Array.isArray(b.moods) ? b.moods.slice(-14) : [];
    talk = (b.talk ?? "").slice(0, 1600);
    profile = (b.profile ?? "").slice(0, 2400);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const signal = `${intake} ${moods.join(" ")} ${talk} ${profile}`;
  if (looksLikeCrisis(signal)) {
    return NextResponse.json({
      crisis: true,
      reflection:
        "Before anything else — what you're carrying sounds heavy, and I need you to be safe. Please reach out to a local crisis line or emergency services right now. You deserve someone who can be right there with you. I'm here too.",
    });
  }

  if (!intake.trim() && moods.length === 0 && !talk.trim() && !profile.trim()) {
    return NextResponse.json({
      reflection:
        "I don't know you well enough yet to show you anything true. Come sit and talk with me a while first — then the water will have something to reflect.",
    });
  }

  const sys: Msg = {
    role: "system",
    content: `${SAFETY}

You are looking into the Still Pond beside this person — a quiet, sacred moment of reflection. Gently mirror back 2–3 patterns you have genuinely noticed in what they've shared over time: mood, sleep, energy, the highs as much as the lows, what lifts them and what weighs on them. Hold each one with warmth, the way a wise friend who pays very close attention would.
RULES: Never diagnose, never name a disorder, never say "you might have X." Frame everything as something YOU noticed, not a conclusion. If a pattern genuinely seems worth a professional's eyes — for example unusually high energy with little need for sleep, or a heaviness that won't lift — gently note it could be worth talking to a doctor about someday, softly and without alarm. Always end with a note of their worth.
Speak warmly in 3–5 short sentences, plain text, no lists, no headings.`,
  };

  const user: Msg = {
    role: "user",
    content: `What you remember about them over time:\n"""${profile || "(still getting to know them)"}"""\n\nWhat they first shared:\n"""${intake || "(little so far)"}"""\n\nRecent mood check-ins: ${moods.join(", ") || "(none yet)"}\n\nRecent things they've said:\n"""${talk || "(none yet)"}"""\n\nLook into the pond and reflect gently — speak to what they're actually carrying right now, not generalities.`,
  };

  try {
    const reflection = await chat([sys, user], { temperature: 0.72, maxTokens: 340 });
    return NextResponse.json({
      reflection:
        reflection ||
        "What I see most is someone who keeps showing up for themselves, even on the hard days. That isn't nothing — quietly, it's everything.",
    });
  } catch {
    return NextResponse.json({
      reflection:
        "The water's a little unclear today — but what I do see is someone who's trying, and that matters more than you know.",
    });
  }
}
