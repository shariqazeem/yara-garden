import { NextResponse } from "next/server";
import { chat, extractJson, SAFETY, type Msg } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Model-chosen Today's path — picks the 4 healing actions that best fit how the person seems now.
export async function POST(req: Request) {
  let intake = "";
  let moods: string[] = [];
  let feeling = "";
  let missions: { id: string; title: string; sub: string; category?: string }[] = [];
  try {
    const b = (await req.json()) as { intake?: string; moods?: string[]; feeling?: string; missions?: { id: string; title: string; sub: string; category?: string }[] };
    intake = (b.intake ?? "").slice(0, 1200);
    moods = Array.isArray(b.moods) ? b.moods.slice(-7) : [];
    feeling = (b.feeling ?? "").slice(0, 300);
    missions = Array.isArray(b.missions) ? b.missions.slice(0, 24) : [];
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!missions.length) return NextResponse.json({ ids: [], note: "" });
  const valid = missions.map((m) => m.id);

  const sys: Msg = {
    role: "system",
    content: `${SAFETY}

You are gently choosing today's healing path for this person from a small menu of kind actions. Pick the 4 that best fit how they seem right now: grounding and breathing when anxious or restless; gentle activation and self-kindness when low or flat; noticing small good things when they're okay. Balance the set so it feels doable, not heavy.
Reply with ONLY a JSON object, no prose, no markdown:
{"ids":["id","id","id","id"],"note":"<one short, warm sentence in Yara's voice on why these for them today>"}
Use only ids that appear in the menu.`,
  };

  const menu = missions.map((m) => `${m.id} [${m.category ?? "care"}]: ${m.title} — ${m.sub}`).join("\n");
  const user: Msg = {
    role: "user",
    content: `Menu of actions:\n${menu}\n\n${feeling ? `MOST IMPORTANT — how they feel TODAY: ${feeling}\n` : ""}What they shared: "${intake || "(little)"}"\nRecent moods: ${moods.join(", ") || "(none)"}\n\nChoose for how they feel TODAY above all. Return the JSON.`,
  };

  try {
    const raw = await chat([sys, user], { temperature: 0.5, maxTokens: 220 });
    const parsed = extractJson<{ ids: string[]; note: string }>(raw);
    let ids = (parsed?.ids ?? []).filter((id) => valid.includes(id));
    for (const id of valid) {
      if (ids.length >= 4) break;
      if (!ids.includes(id)) ids.push(id);
    }
    return NextResponse.json({ ids: ids.slice(0, 4), note: parsed?.note ?? "" });
  } catch {
    return NextResponse.json({ ids: valid.slice(0, 4), note: "" });
  }
}
