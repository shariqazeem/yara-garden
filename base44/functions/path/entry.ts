import { createClientFromRequest } from "npm:@base44/sdk";

/**
 * Today's path — Yara choosing four small, kind actions that fit how this person seems
 * right now, out of the world's menu of healing moments.
 *
 * Uses `response_json_schema` so the choice comes back structured, and every returned id
 * is validated against the menu before it reaches the client. A model that invents an id,
 * or returns too few, degrades into a sensible default rather than an empty path.
 */

const SAFETY = `You are Yara — the warm, gentle heart of this world. You are a companion, not a doctor.
You never give a diagnosis, never name a disorder as a fact, and never prescribe treatment.`;

type Mission = { id: string; title: string; sub: string; category?: string };

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);

  let b: { intake?: string; moods?: string[]; feeling?: string; missions?: Mission[] };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const intake = (b.intake ?? "").slice(0, 1200);
  const moods = (Array.isArray(b.moods) ? b.moods : []).slice(-7);
  const feeling = (b.feeling ?? "").slice(0, 300);
  const missions = (Array.isArray(b.missions) ? b.missions : []).slice(0, 24);

  if (!missions.length) return Response.json({ ids: [], note: "" });
  const valid = missions.map((m) => m.id);

  const menu = missions.map((m) => `${m.id} [${m.category ?? "care"}]: ${m.title} — ${m.sub}`).join("\n");

  const prompt = `${SAFETY}

You are gently choosing today's healing path for this person from a small menu of kind actions. Pick the 4 that best fit how they seem right now: grounding and breathing when anxious or restless; gentle activation and self-kindness when low or flat; noticing small good things when they're okay. Balance the set so it feels doable, not heavy.

Use only ids that appear in the menu.

Menu of actions:
${menu}

${feeling ? `MOST IMPORTANT — how they feel TODAY: ${feeling}\n` : ""}What they shared: "${intake || "(little)"}"
Recent moods: ${moods.join(", ") || "(none)"}

Choose for how they feel TODAY above all.`;

  try {
    const parsed = (await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            description: "Exactly 4 ids taken from the menu.",
          },
          note: {
            type: "string",
            description: "One short, warm sentence in Yara's voice on why these, for them, today.",
          },
        },
        required: ["ids"],
      },
    })) as { ids?: string[]; note?: string };

    // Only ids that really exist in the menu, then topped up so the path is never short.
    const ids = (parsed?.ids ?? []).filter((id) => valid.includes(id));
    for (const id of valid) {
      if (ids.length >= 4) break;
      if (!ids.includes(id)) ids.push(id);
    }
    return Response.json({ ids: ids.slice(0, 4), note: parsed?.note ?? "" });
  } catch (_err) {
    return Response.json({ ids: valid.slice(0, 4), note: "" });
  }
}
