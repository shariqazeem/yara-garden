#!/usr/bin/env node
/**
 * Switch which backend this build targets.
 *
 * Yara ships to two places from one source tree:
 *
 *   base44  static export, no server at runtime. Every /api/* call is served by a Base44
 *           backend function. This is the hackathon deployment.
 *
 *   vercel  a normal Next build that also carries its own /api routes, talking straight to
 *           the model provider. This is the safety net: if Base44 ever goes away, whether
 *           through credits, an outage, or the app simply not existing any more, the world
 *           at yara.garden keeps working on its own.
 *
 * The routes live in `server/api` as the source of truth and are copied into `app/api`
 * only for the Vercel build, because Next refuses to static-export a project that has
 * route handlers in it.
 */
import { cp, rm, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const SRC = new URL("../server/api/", import.meta.url);
const DEST = new URL("../app/api/", import.meta.url);
const mode = process.argv[2];

if (mode !== "on" && mode !== "off") {
  console.error("usage: api-routes.mjs on|off");
  process.exit(1);
}

// Always start clean, so a switch between targets can never leave stale routes behind.
if (existsSync(DEST)) await rm(DEST, { recursive: true, force: true });

if (mode === "on") {
  await mkdir(DEST, { recursive: true });
  await cp(SRC, DEST, { recursive: true });
  const routes = await readdir(DEST);
  console.log(`api routes ON  (${routes.length}): ${routes.join(", ")}`);
} else {
  console.log("api routes OFF (static export, Base44 functions serve /api/*)");
}
