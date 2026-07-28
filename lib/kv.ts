/**
 * A tiny Redis client for the standalone deployment.
 *
 * yara.garden is meant to outlive any one platform. Conversations, notes and memory need
 * no shared storage, but the shared garden does: seeing another person walking around
 * means two visitors' requests have to meet somewhere, and serverless functions have no
 * memory between calls.
 *
 * This talks to Upstash Redis over plain HTTP, so there is no SDK and no build step, and
 * it reads whichever env names are present: Vercel's KV integration injects
 * `KV_REST_API_URL` / `KV_REST_API_TOKEN`, while a direct Upstash project injects
 * `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
 *
 * If none are configured, `kvReady()` is false and the callers degrade quietly rather
 * than erroring. The rest of the world keeps working.
 */

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export const kvReady = () => !!(URL_ && TOKEN);

type Cmd = (string | number)[];

/** Run a batch of Redis commands in one round trip. Returns one result per command. */
export async function kv(commands: Cmd[]): Promise<unknown[]> {
  if (!kvReady()) throw new Error("no kv configured");
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands.map((c) => c.map(String))),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kv ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => {
    if (r?.error) throw new Error(`kv: ${r.error}`);
    return r?.result;
  });
}

/** Run a single command. */
export async function kv1(...command: Cmd): Promise<unknown> {
  const [only] = await kv([command]);
  return only;
}
