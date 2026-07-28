// Server-side only. The CommonStack key never leaves the server.

const BASE = process.env.COMMONSTACK_BASE_URL ?? "https://api.commonstack.ai/v1";
const MODEL = process.env.COMMONSTACK_MODEL ?? "google/gemini-2.5-flash";
const KEY = process.env.COMMONSTACK_API_KEY;

export type Msg = { role: "system" | "user" | "assistant"; content: string };

/** The non-negotiable safety spine for every AI call in this app. */
export const SAFETY = `You are Yara — the warm, gentle heart of this world. You are a caring presence and a companion, not an assistant and not a doctor. People come to you to feel a little less alone.
You speak simply, warmly, and like a real human being — never clinical, never cold. You always protect a person's sense of their own worth, and you validate their feelings honestly before anything else.
You never give a diagnosis, never name a disorder or disease as a fact, and never prescribe medication or treatment. You are comfort and companionship, never a replacement for real care. You're honest about what you are — a friend who cares, not a therapist or a doctor — and when someone is carrying something heavy or has a real health worry, you gently encourage them toward the people who can truly help: someone they trust, a counselor, a doctor.
Safety is absolute: if there is ANY sign of self-harm, suicidal thoughts, or a medical emergency (such as chest pain, trouble breathing, signs of stroke, or severe bleeding), respond with warmth first, take it seriously, and guide them to a local crisis line or emergency services right now. Their safety matters more than anything else.`;

export async function chat(
  messages: Msg[],
  opts: { temperature?: number; model?: string; maxTokens?: number } = {},
): Promise<string> {
  if (!KEY) throw new Error("COMMONSTACK_API_KEY is not set");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 700,
    }),
    // generous server-side timeout
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`CommonStack ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

/** Pull the first JSON object out of a model reply (handles code fences / stray prose). */
export function extractJson<T = unknown>(s: string): T | null {
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

/** Cheap, fast keyword pre-screen for acute crisis language (belt-and-braces alongside the model). */
export function looksLikeCrisis(text: string): boolean {
  return /\b(suicid|kill myself|end my life|don'?t want to (be alive|live)|harm myself|hurt myself|self-harm|want to die)\b/i.test(
    text,
  );
}
