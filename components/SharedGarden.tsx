"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/lib/base44";

/**
 * The shared garden.
 *
 * Yara is single-player, and stays that way unless a person decides otherwise. Plenty of
 * people come here precisely because they don't want to be perceived, so being visible is
 * opt-in, reversible in one tap, and off by default.
 *
 * When you open the gate you start appearing to other visitors, and they start appearing
 * to you: soft, translucent figures wandering the same world, each with the name they
 * chose. That's the whole feature. There is no chat, no friending, no profiles, no way to
 * touch another person. You cannot perform here and you cannot be harassed here. You can
 * only see, quietly, that other people are also awake and also walking around.
 *
 * Backend: `heartbeat` backend function (service-role writes only) + the `Presence` entity
 * with `entities.Presence.subscribe()` for live movement.
 */

const SESSION_KEY = "psiddx.presence.session";
const JOINED_KEY = "psiddx.presence.joined";
/** Heartbeat cadence. Movement is tweened over exactly this long, so other people
 *  glide continuously instead of teleporting between updates. */
const BEAT_MS = 2000;
/** Mirrors the server's sweep window, so a visitor who closed their tab fades from the
 *  world here at the same moment they are swept from the table. */
const STALE_MS = 25_000;

export type Visitor = {
  id: string;
  name: string;
  avatar: "boy" | "girl";
  x: number;
  y: number;
  last_seen?: string;
};

/** A per-visit secret. Only its SHA-256 ever leaves this device. */
function sessionId(): string {
  if (typeof window === "undefined") return "";
  let s = window.localStorage.getItem(SESSION_KEY);
  if (!s) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    s = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    window.localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

const spriteFor = (a: string) => (a === "girl" ? "/player_girl.png" : "/player.png");
const petFor = (a: string) => (a === "girl" ? "/penguin.png" : "/chick_companion.png");

export function useSharedGarden(opts: { x: number; y: number; name: string; avatar: "boy" | "girl" }) {
  const [joined, setJoined] = useState(false);
  const [others, setOthers] = useState<Visitor[]>([]);
  const pos = useRef(opts);
  pos.current = opts;

  // Remember the choice between visits.
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(JOINED_KEY) === "1") setJoined(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(JOINED_KEY, joined ? "1" : "0");
    if (!joined) {
      setOthers([]);
      return;
    }

    let alive = true;
    const sid = sessionId();
    // Our own Presence row id. The realtime feed sends every row to every player, including
    // ours, so without this we'd render a ghost of ourselves drifting into our character.
    const meId = { current: null as string | null };

    const beat = async (leaving = false) => {
      try {
        const res = await base44.functions.invoke("heartbeat", {
          sessionId: sid,
          name: pos.current.name,
          avatar: pos.current.avatar,
          x: pos.current.x,
          y: pos.current.y,
          leaving,
        });
        if (!alive || leaving) return;
        if (res?.data?.meId) meId.current = res.data.meId as string;
        const list = (res?.data?.others ?? []) as Visitor[];
        setOthers(list.filter((o) => o.id !== meId.current));
      } catch {
        /* a dropped beat just means we reappear on the next one */
      }
    };

    beat();
    const id = setInterval(() => beat(), BEAT_MS);

    // Live movement between our own heartbeats.
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = base44.entities.Presence.subscribe(
        (event: { type: string; id: string; data: Record<string, unknown> }) => {
          if (!alive) return;
          const d = event.data ?? {};
          const id = (d.id as string) ?? event.id;
          if (event.type === "delete") {
            setOthers((prev) => prev.filter((o) => o.id !== id));
            return;
          }
          // Our own row arrives here too. Rendering it produced a ghost twin that drifted
          // across the world and merged into the player.
          if (id === meId.current) return;
          const visitor: Visitor = {
            id,
            name: (d.display_name as string) ?? "",
            avatar: d.avatar === "girl" ? "girl" : "boy",
            x: (d.x as number) ?? 750,
            y: (d.y as number) ?? 1055,
            last_seen: d.last_seen as string,
          };
          setOthers((prev) => {
            const rest = prev.filter((o) => o.id !== visitor.id);
            return [...rest, visitor];
          });
        },
      );
    } catch {
      /* polling alone still keeps the garden populated */
    }

    const onLeave = () => beat(true);
    window.addEventListener("pagehide", onLeave);

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("pagehide", onLeave);
      try {
        unsubscribe?.();
      } catch {
        /* nothing to tear down */
      }
      beat(true);
    };
  }, [joined]);

  // Never draw someone who has gone quiet, even if the sweep hasn't caught them yet.
  const visible = useMemo(() => {
    const now = Date.now();
    return others.filter((o) => {
      const seen = Date.parse(o.last_seen ?? "") || now;
      return now - seen < STALE_MS;
    });
  }, [others]);

  return { joined, setJoined, others: visible };
}

/**
 * One other person, drawn into the world.
 *
 * NOTE on `maxWidth: "none"`: Tailwind's preflight applies `img { max-width: 100% }`, and
 * these sprites live inside a zero-width positioned wrapper — so without this the browser
 * resolves their width to 0 and the person is invisible. The name label still rendered,
 * which is exactly what made it look like a data bug rather than a CSS one.
 */
function VisitorSprite({ v }: { v: Visitor }) {
  const prev = useRef({ x: v.x, y: v.y });
  const moved = Math.hypot(v.x - prev.current.x, v.y - prev.current.y);
  const walking = moved > 3;
  const facing = v.x < prev.current.x ? -1 : 1;
  useEffect(() => {
    prev.current = { x: v.x, y: v.y };
  }, [v.x, v.y]);

  return (
    <motion.div
      // Arriving and leaving should feel like someone stepping out of the light,
      // not like a sprite being switched on.
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute"
      style={{ left: 0, top: 0, zIndex: Math.round(v.y) }}
    >
      <motion.div
        className="absolute"
        style={{ left: 0, top: 0 }}
        // Start exactly where they actually are. Without this, framer tweens from the
        // world's origin, so every arriving visitor came sliding in from the far corner.
        initial={{ x: v.x, y: v.y }}
        animate={{ x: v.x, y: v.y }}
        // Tweened over exactly one heartbeat so they glide instead of teleporting.
        transition={{ duration: BEAT_MS / 1000, ease: "linear" }}
      >
        {/* a soft dawn aura, so other people read as warm presences, not as NPCs */}
        <div
          className="absolute rounded-full"
          style={{
            left: -54,
            top: -74,
            width: 108,
            height: 108,
            background: "radial-gradient(circle, rgba(255,214,158,0.34) 0%, rgba(255,214,158,0) 70%)",
          }}
        />
        <div
          className="absolute rounded-[50%] bg-black/10 blur-[1px]"
          style={{ left: -16, top: -6, width: 32, height: 11 }}
        />

        <motion.div
          animate={walking ? { y: [0, -4, 0] } : { y: 0 }}
          transition={walking ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={petFor(v.avatar)}
            alt=""
            draggable={false}
            className="absolute select-none"
            style={{
              left: -60,
              top: -44,
              width: 44,
              height: 44,
              maxWidth: "none",
              objectFit: "contain",
              opacity: 0.55,
              transform: `scaleX(${facing})`,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spriteFor(v.avatar)}
            alt=""
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/player.png";
            }}
            className="absolute select-none"
            style={{
              left: -46,
              top: -82,
              width: 92,
              height: 92,
              maxWidth: "none",
              objectFit: "contain",
              opacity: 0.72,
              transform: `scaleX(${facing})`,
            }}
          />
        </motion.div>

        {v.name && (
          <span
            className="absolute whitespace-nowrap text-[11px] font-medium tracking-wide"
            style={{
              left: -70,
              top: -104,
              width: 140,
              textAlign: "center",
              color: "rgba(74,58,44,0.66)",
              textShadow: "0 1px 7px rgba(255,250,240,0.95), 0 0 14px rgba(255,250,240,0.8)",
            }}
          >
            {v.name}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}

/** The other people, drawn into the world. */
export function OtherVisitors({ visitors }: { visitors: Visitor[] }) {
  return (
    <AnimatePresence>
      {visitors.map((v) => (
        <VisitorSprite key={v.id} v={v} />
      ))}
    </AnimatePresence>
  );
}

/** The gate. Off by default, one tap either way. */
export function SharedGardenToggle({
  joined,
  count,
  onToggle,
}: {
  joined: boolean;
  count: number;
  onToggle: () => void;
}) {
  const [asking, setAsking] = useState(false);
  // The gate is easy to miss in a world this big, so it breathes softly until someone
  // has opened it at least once. After that it settles down and stays out of the way.
  const [everOpened, setEverOpened] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setEverOpened(window.localStorage.getItem(JOINED_KEY) !== null);
    }
  }, []);

  return (
    <>
      <motion.button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          setEverOpened(true);
          joined ? onToggle() : setAsking(true);
        }}
        animate={!joined && !everOpened ? { scale: [1, 1.045, 1] } : { scale: 1 }}
        transition={
          !joined && !everOpened
            ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
        className="glass absolute bottom-6 right-5 z-10 flex items-center gap-1.5 rounded-full border border-hair px-3.5 py-2 text-[12px] font-medium text-ink/65 shadow-card transition hover:text-ink active:scale-95"
      >
        {joined ? (
          <>
            🌿 <span>{count > 0 ? `${count} here with you` : "you're the only one here"}</span>
          </>
        ) : (
          <>
            🚪 <span>shared garden</span>
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {asking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setAsking(false)}
            className="fixed inset-0 z-[70] grid place-items-center px-6"
            style={{ background: "rgba(24,17,12,0.5)", backdropFilter: "blur(3px)" }}
          >
            <motion.div
              initial={{ y: 16, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[400px] rounded-[24px] px-7 py-8 text-center shadow-2xl"
              style={{
                background: "linear-gradient(180deg,#fffaf1 0%,#fdf1dd 100%)",
                border: "1px solid rgba(255,206,150,0.5)",
              }}
            >
              <div className="text-[26px]">🌿</div>
              <h3
                className="mt-3 text-[19px] text-[#4a3a2c]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Walk with others?
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#6b5643]">
                You&apos;ll see other people wandering this garden, and they&apos;ll see you. Just the
                name you chose, and where you are.
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#96795f]">
                No chat, no adding anyone, no way to be messaged. Nobody can reach you here. You can
                close the gate again anytime.
              </p>
              <button
                onClick={() => {
                  onToggle();
                  setAsking(false);
                }}
                className="mt-6 w-full rounded-full bg-[#4a3a2c] py-3 text-[14px] font-semibold text-[#fdf3e6] transition active:scale-[0.98]"
              >
                Open the gate
              </button>
              <button
                onClick={() => setAsking(false)}
                className="mt-2 w-full rounded-full py-2.5 text-[13px] text-[#6b5643]/70 transition hover:text-[#4a3a2c]"
              >
                Stay on my own
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
