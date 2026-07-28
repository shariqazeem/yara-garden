/**
 * Shared model access for the backend functions.
 *
 * Base44's own AI is the primary path and stays the default. But this world is used by
 * people who are having a hard time, and someone in the middle of telling Yara something
 * difficult should never hit a wall because a billing meter ran out. So if InvokeLLM fails
 * for any reason, including the workspace exhausting its integration credits, these fall
 * through to a direct provider call and the moment continues.
 *
 * Both return an empty value if every path fails, so callers keep their own gentle
 * fallback line rather than showing an error to someone who is struggling.
 */

type Base44Like = {
  integrations: { Core: { InvokeLLM: (args: Record<string, unknown>) => Promise<unknown> } };
};

function backupConfig() {
  return {
    key: Deno.env.get("FALLBACK_API_KEY"),
    base: Deno.env.get("FALLBACK_BASE_URL") ?? "https://api.commonstack.ai/v1",
    model: Deno.env.get("FALLBACK_MODEL") ?? "google/gemini-2.5-flash",
  };
}

async function backupChat(prompt: string, maxTokens: number): Promise<string> {
  const { key, base, model } = backupConfig();
  if (!key) return "";
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        // The backup model spends reasoning tokens from this same budget, so a tight
        // limit can come back with reasoning done and no content at all. Give it room.
        max_tokens: Math.max(maxTokens * 3, 800),
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return (data?.choices?.[0]?.message?.content ?? "").trim();
  } catch (_e) {
    return "";
  }
}

/** Free-form text. Returns "" if both the primary and the backup fail. */
export async function ask(base44: Base44Like, prompt: string, maxTokens = 400): Promise<string> {
  try {
    const r = await base44.integrations.Core.InvokeLLM({ prompt });
    if (typeof r === "string" && r.trim()) return r.trim();
  } catch (_e) {
    /* fall through to the backup provider */
  }
  return await backupChat(prompt, maxTokens);
}

/** Pull the first JSON object out of a reply, tolerating code fences and stray prose. */
function extractJson<T>(s: string): T | null {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

/**
 * A structured decision. The primary path uses `response_json_schema`, which is reliable.
 * The backup has to ask for JSON in the prompt and parse it, so it is best-effort.
 * Returns null if nothing usable came back.
 */
export async function askJson<T>(
  base44: Base44Like,
  prompt: string,
  schema: Record<string, unknown>,
  maxTokens = 400,
): Promise<T | null> {
  try {
    const r = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    if (r && typeof r === "object") return r as T;
  } catch (_e) {
    /* fall through to the backup provider */
  }
  const text = await backupChat(
    `${prompt}\n\nReply with ONLY a JSON object matching this schema, no prose and no code fences:\n${JSON.stringify(schema)}`,
    maxTokens,
  );
  return text ? extractJson<T>(text) : null;
}
