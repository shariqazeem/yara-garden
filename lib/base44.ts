"use client";

import { createClient } from "@base44/sdk";

// The app id is public by design — it identifies the app, it does not authorise anything.
// All real authority lives server-side in row-level security and the backend functions.
export const APP_ID =
  process.env.NEXT_PUBLIC_BASE44_APP_ID || "6a689a64ec02e4ecf72cc7e8";

export const base44 = createClient({ appId: APP_ID });

/**
 * Compatibility bridge: `/api/*` → Base44 backend functions.
 *
 * Yara was born as a Next.js app with server routes. Base44 hosting serves a single-page
 * app, so there is no Next server at runtime and every route had to become a backend
 * function. Rather than rewrite a dozen call sites inside a game that is already tuned and
 * working (and risk breaking the feel of it), the migration is centralised here: one
 * adapter maps the old paths onto `base44.functions.invoke`.
 *
 * Everything still speaks `fetch("/api/talk")`, but the request now runs on Base44's Deno
 * runtime, behind Base44 auth, with the crisis guard where a client can never reach it.
 */

/** Old route path -> deployed Base44 function name. */
const ROUTES: Record<string, string> = {
  talk: "talk",
  greet: "greet",
  companion: "companion",
  remember: "remember",
  note: "leaveNote",
  insight: "insight",
  path: "path",
  reflect: "reflect",
  portrait: "portrait",
};

/**
 * Routes with no server-side equivalent. They resolve to a soft failure so the caller's
 * existing fallback runs — e.g. voice falls back to the browser's own speech synthesis
 * rather than the app going silent.
 */
const UNAVAILABLE = new Set(["voice", "ddx", "account"]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let installed = false;

export function installApiBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Anything that isn't one of our old API routes goes straight through untouched.
    if (!url.startsWith("/api/")) return nativeFetch(input as RequestInfo, init);

    const name = url.slice("/api/".length).split(/[?#/]/)[0];

    if (UNAVAILABLE.has(name)) {
      return jsonResponse({ error: "not available on this deployment" }, 501);
    }

    const fn = ROUTES[name];
    if (!fn) return jsonResponse({ error: "unknown route" }, 404);

    let payload: Record<string, unknown> = {};
    try {
      const body = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
      if (typeof body === "string" && body) payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      /* an empty payload is fine; functions validate their own input */
    }

    try {
      const res = await base44.functions.invoke(fn, payload);
      // invoke() returns the raw axios response — the function's JSON is on `.data`.
      return jsonResponse(res.data ?? {});
    } catch (err: unknown) {
      // Surface the function's own error body when there is one, so callers keep
      // their existing error handling and the person never sees a blank screen.
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      return jsonResponse(data ?? { error: "request failed" }, 502);
    }
  };
}
