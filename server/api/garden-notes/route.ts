import { NextResponse } from "next/server";
import { kv, kvReady } from "@/lib/kv";

/**
 * The lanterns hanging in the world, for the standalone deployment.
 *
 * Separate from /api/note on purpose: the client's Base44 bridge maps /api/note onto the
 * `leaveNote` function, so the read path needs its own address that passes straight
 * through to this server.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LKEY = "yara:lanterns";

/** The lanterns currently hanging in the world. */
export async function GET() {
  if (!kvReady()) return NextResponse.json({ notes: [] });
  try {
    const [raw] = await kv([["LRANGE", LKEY, 0, 199]]);
    const notes = (Array.isArray(raw) ? raw : [])
      .map((v) => {
        try {
          return JSON.parse(String(v));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return NextResponse.json({ notes });
  } catch {
    return NextResponse.json({ notes: [] });
  }
}
