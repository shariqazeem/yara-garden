import { NextResponse } from "next/server";
import { chat, SAFETY, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Yara's opening line when you come to sit with her — a warm greeting that recalls who you
// are. This is the "she truly remembers me" moment: the model's intelligence, made tender.
export async function POST(req: Request) {
  let name = "friend";
  let profile = "";
  let intake = "";
  let moods: string[] = [];
  let feeling = "";
  let returning = false;
  try {
    const b = (await req.json()) as { name?: string; profile?: string; intake?: string; moods?: string[]; feeling?: string; returning?: boolean };
    name = (b.name ?? "friend").slice(0, 40) || "friend";
    profile = (b.profile ?? "").slice(0, 2400);
    intake = (b.intake ?? "").slice(0, 1200);
    moods = Array.isArray(b.moods) ? b.moods.slice(-7) : [];
    feeling = (b.feeling ?? "").slice(0, 300);
    returning = !!b.returning;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const who = name && name !== "friend" ? `, ${name}` : "";
  if (!profile.trim() && !intake.trim()) {
    return NextResponse.json({ greeting: `Hey${who} — I'm so glad you came to sit with me. How are you, really?` });
  }

  const sys: Msg = {
    role: "system",
    content: `${SAFETY}

You are Yara, and this person has just come to sit with you${returning ? " again" : ""}. Greet them in 1–2 warm, natural sentences, the way a dear friend who's been quietly thinking about them would. Gently show you truly remember them — weave in ONE real, specific thing from what you know about them (something they're carrying, someone they mentioned, a feeling that's been with them). Don't list facts, don't interrogate, don't sound clinical — make it tender and personal. You don't always have to ask "how are you"; sometimes simply letting them know you remember, and that you're glad they came, is the most healing thing. Never diagnose.`,
  };
  const user: Msg = {
    role: "user",
    content: `Their name: ${name}\nWhat you remember about them:\n"""${profile || "(little so far)"}"""\nWhat they first shared:\n"""${intake || "(little)"}"""\nRecent moods: ${moods.join(", ") || "(none)"}\n${feeling ? feeling + "\n" : ""}\nWrite Yara's greeting to them now${feeling ? " — and gently let it hold today's feeling" : ""}.`,
  };

  try {
    const greeting = await chat([sys, user], { temperature: 0.8, maxTokens: 150 });
    return NextResponse.json({ greeting: greeting || `Hey${who} — I've been thinking about you. How are you today?` });
  } catch {
    return NextResponse.json({ greeting: `Hey${who} — I'm really glad you're here. How are you, truly?` });
  }
}
