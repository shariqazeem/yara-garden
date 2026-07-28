import { NextResponse } from "next/server";
import { chat, looksLikeCrisis, SAFETY, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "How Yara sees you" — a warm, honest, strengths-focused portrait so a person can meet
// themselves more kindly. Growth-facing, where the Still Pond is awareness-facing.
export async function POST(req: Request) {
  let intake = "";
  let moods: string[] = [];
  let talk = "";
  let profile = "";
  let name = "friend";
  try {
    const b = (await req.json()) as { intake?: string; moods?: string[]; talk?: string; profile?: string; name?: string };
    intake = (b.intake ?? "").slice(0, 1500);
    moods = Array.isArray(b.moods) ? b.moods.slice(-14) : [];
    talk = (b.talk ?? "").slice(0, 1600);
    profile = (b.profile ?? "").slice(0, 2400);
    name = (b.name ?? "friend").slice(0, 40) || "friend";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (looksLikeCrisis(`${intake} ${talk} ${profile}`)) {
    return NextResponse.json({
      portrait:
        "Right now, what matters most is that you're safe. Please reach out to a local crisis line or emergency services — you deserve someone right there with you. I'm here too.",
    });
  }

  if (!intake.trim() && moods.length === 0 && !talk.trim() && !profile.trim()) {
    return NextResponse.json({
      portrait: `I'm still getting to know you, ${name}. Sit and talk with me a while, walk a path or two — then I'll be able to show you what I see.`,
    });
  }

  const sys: Msg = {
    role: "system",
    content: `${SAFETY}

You are Yara, gently painting a portrait of who this person is — for THEM, so they can see themselves more kindly. Draw on everything they've shared. Name 2–3 real strengths or qualities you genuinely notice in them, and one tender hope for how they might grow. Be specific and true, not flattery; if they're struggling, honour that and still find what's strong in them. Never diagnose or name a disorder.
Address them directly as "you". Warm, 4–6 short sentences, plain text — no lists, no headings.`,
  };

  const user: Msg = {
    role: "user",
    content: `Their name: ${name}\nWhat you remember about them over time:\n"""${profile || "(still getting to know them)"}"""\nWhat they first shared:\n"""${intake || "(little)"}"""\nRecent moods: ${moods.join(", ") || "(none)"}\nThings they've said:\n"""${talk || "(none)"}"""\n\nPaint who they are, for them to read.`,
  };

  try {
    const portrait = await chat([sys, user], { temperature: 0.78, maxTokens: 360 });
    return NextResponse.json({
      portrait: portrait || `${name}, what I see is someone who keeps showing up for themselves — and that's a quiet, real kind of strength.`,
    });
  } catch {
    return NextResponse.json({ portrait: `${name}, what I see is someone who's trying — and that matters more than you know.` });
  }
}
