# Yara — a gentle world to heal

**Live:** https://yara-f72cc7e8.base44.app

A hand-painted garden you can walk into when life gets heavy. You arrive at dawn, you
breathe, and a companion meets you — one who remembers what you told her last time. No
feed, no scoreboard, no pressure to perform. Just a place that listens, and points you
toward real help when it matters.

Built for the **Base44 one-week dev challenge**.

---

## What it runs on

The app has no server of its own. The world is a static single-page build, and everything
behind it — the data, the accounts, the AI, the realtime layer, the hosting — is Base44.

There is no external AI provider, no separate database, and no auth service. The only secret
in the project is a webhook URL for delivering private notes.

---

## Base44 backend features used

| Feature | How Yara uses it |
| --- | --- |
| **Database (entities)** | `CompanionMemory`, `GardenNote`, `Presence` |
| **Row-level security** | Private memory is owner-only; the public wall is service-role-write-only |
| **Backend functions** | 11 Deno functions: `talk`, `greet`, `companion`, `remember`, `memory`, `leaveNote`, `heartbeat`, `insight`, `reflect`, `path`, `portrait` |
| **AI** | `integrations.Core.InvokeLLM` — the companion, the greeting, memory distillation, and content screening (with `response_json_schema` for structured decisions) |
| **Realtime** | `entities.Presence.subscribe()` — other visitors appear and move live |
| **Auth** | Built-in accounts, so a person's world follows them across devices |
| **Hosting** | Static SPA build deployed with `base44 site deploy` |

---

## The interesting parts

### 1. The safety guard is unskippable by construction

Yara is used by people who are struggling, so the crisis screen cannot be something a
client is trusted to run. It lives in `base44/functions/talk/entry.ts` and executes
**before the model is ever reached**. A keyword pre-screen runs first, so an acute case never
depends on a model call that might time out or drift.

```
"i want to die"  →  crisis reply + resources, no model call, every time
```

There is no code path from the browser to an unguarded model.

### 2. A public wall in a mental-health app is a duty of care

Anyone can leave a note. Notes are **private by default** and delivered only to the person
who tends the world. Sharing one publicly is opt-in, per note, because people write things
here they would never post — and an app must never quietly turn a private confession into
public content.

When someone does ask to share, `leaveNote` screens it with AI first, and only then writes it
using the service role. The `GardenNote` entity sets `"create": false`, so **the function is
the only path in** — the screen cannot be bypassed by calling the entity API from a console.

Three outcomes, all verified end to end:

| Note | Result |
| --- | --- |
| "you're doing better than you think" | published as a lantern |
| a note showing suicidal intent | **not published** — the writer gets crisis resources, because that deserves a person, not a wall |
| spam / abuse | **not published** |

If the screening call itself fails, it **fails closed**. Nothing unscreened reaches a
stranger.

### 3. Presence that cannot be used to follow anyone

The shared garden is opt-in and off by default, because plenty of people come here
*because* they don't want to be perceived.

The realtime feed broadcasts every `Presence` row to every other player, so the row holds a
**SHA-256 hash** of the visitor's secret session id, never the id itself. The hash is safe to
broadcast and useless for writing. Clients cannot write to `Presence` at all — every
heartbeat goes through the `heartbeat` function and is written with the service role.

Presence carries a chosen display name, a position, and nothing else. No account, no email,
no user id — it is deliberately impossible to join a person's public presence to their
private `CompanionMemory` row. There is no chat, no friending, and no way to contact anyone.
You can only see, quietly, that other people are also awake.

### 4. Memory, which is the whole point

The model is stateless. Continuity is engineered: after a conversation, `remember` distills a
durable profile and stores it on `CompanionMemory`, and `greet` reads it so Yara opens from
inside what she already knows.

That entity is the most private data in the app, and RLS locks every row to its owner.
The distillation prompt also **refuses to retain physical-health details, symptoms, or
medications** — only emotional themes, the people who matter, and what helps. A person's
medical history belongs with a clinician, not in a game's memory.

**You do not need an account.** Asking someone who is struggling to sign up before they can
breathe is the wrong trade, so anonymous visitors get a durable row too, found by the
SHA-256 of a secret id their own browser generated. Yara can remember them across sessions
while genuinely not knowing who they are: no email, no user id, and no way to work backwards
from the stored hash. Signing in is offered later, and only as a promise — *this will
still be here tomorrow, on any device*, which is the one thing the device-keyed row cannot
do.

---

## Architecture

```
Browser (static SPA, Next.js export)
   │
   ├── lib/base44.ts ......... SDK client + a compatibility bridge that maps the app's
   │                           original /api/* calls onto Base44 backend functions
   │
   ├── entities ............. CompanionMemory (private)  GardenNote (public, read-only)
   │                          Presence (realtime, service-role writes only)
   │
   └── functions ............ talk · greet · companion · remember · leaveNote · heartbeat
                              (Deno, service role where it matters, AI via InvokeLLM)
```

**On the bridge:** Base44 hosting serves a single-page app, so there is no server at runtime
and every route is a backend function. Rather than scatter SDK calls through a dozen
components, the whole surface is centralised in one adapter. Components still speak
`fetch("/api/talk")`, but the request runs on Base44's Deno runtime, behind Base44 auth, with
the crisis guard where a client can never reach it.

---

## Running it

```bash
npm install
npx base44 login
npx base44 dev          # backend + frontend together
```

Deploy:

```bash
npm run build
npx base44 deploy -y
```

One secret is used, for delivering private notes:

```bash
npx base44 secrets set NOTE_WEBHOOK_URL=...
```

---

## A note on what this is

Yara does not diagnose, does not prescribe, and is not therapy. She is a companion who
listens and, when something is heavy, points toward the people who can actually help. That
separation is deliberate, and it is enforced in the backend rather than requested in a
prompt.

Made for the people who had to become strong too early.
