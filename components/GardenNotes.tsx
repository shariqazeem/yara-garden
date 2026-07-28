"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/lib/base44";

/**
 * The shared garden.
 *
 * Every note anyone leaves becomes a lantern somewhere in the world. You wander, you find
 * one, you read what a stranger left behind. When someone else lights one right now, it
 * blooms into your world live — no refresh, no feed, no notification.
 *
 * This is the one social surface in Yara, and it is deliberately almost nothing: no names
 * required, no replies, no likes, no follower counts. You cannot perform here. You can only
 * leave something kind and find something kind. The realtime layer exists so a person alone
 * at 3am can see the garden quietly light up and know someone else is awake too.
 *
 * Data: Base44 `GardenNote` entity (read-only to clients; writes go through the screened
 * `leaveNote` backend function) + `entities.subscribe()` for the live updates.
 */

type Note = {
  id: string;
  message: string;
  from_name?: string;
  lantern_x?: number;
  lantern_y?: number;
  created_date?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function GardenNotes({ worldW = 1500, worldH = 1150 }: { worldW?: number; worldH?: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState<Note | null>(null);
  const [justArrived, setJustArrived] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  // Load what's already in the world, then stay subscribed for new lanterns.
  useEffect(() => {
    let alive = true;

    (async () => {
      let rows: Note[] = [];
      try {
        rows = (await base44.entities.GardenNote.list("-created_date", 200, 0)) as Note[];
      } catch {
        // Base44 is out of reach. This deployment may keep its own lanterns, so ask it
        // directly before giving up. On the static build this simply 404s.
        try {
          const r = await fetch("/api/garden-notes");
          if (r.ok) rows = ((await r.json())?.notes ?? []) as Note[];
        } catch {
          /* the garden simply has no lanterns tonight */
        }
      }
      if (!alive || !rows.length) return;
      rows.forEach((n) => seen.current.add(n.id));
      setNotes(rows);
    })();

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = base44.entities.GardenNote.subscribe((event: { type: string; data: Note; id: string }) => {
        if (!alive || event.type !== "create" || !event.data) return;
        const note = { ...event.data, id: event.data.id ?? event.id };
        if (seen.current.has(note.id)) return;
        seen.current.add(note.id);
        setNotes((prev) => [note, ...prev]);
        // A soft bloom, so you notice someone just lit one.
        setJustArrived(note.id);
        setTimeout(() => setJustArrived((cur) => (cur === note.id ? null : cur)), 6000);
      });
    } catch {
      /* realtime unavailable — the lanterns already loaded still glow */
    }

    return () => {
      alive = false;
      try {
        unsubscribe?.();
      } catch {
        /* nothing to tear down */
      }
    };
  }, []);

  // Every lantern has to land somewhere a person can actually walk to. Notes written
  // before positions existed get a stable spot derived from their id (so it doesn't
  // wander between visits), and anything outside the world is pulled back inside.
  const placed = useMemo(
    () =>
      notes.map((n) => {
        let x = n.lantern_x;
        let y = n.lantern_y;
        if (typeof x !== "number" || typeof y !== "number" || x < 60 || y < 60 || x > worldW - 60 || y > worldH - 60) {
          let h = 0;
          for (let i = 0; i < n.id.length; i++) h = (h * 31 + n.id.charCodeAt(i)) >>> 0;
          x = 120 + (h % (worldW - 240));
          y = 120 + ((h >> 8) % (worldH - 240));
        }
        return { ...n, lantern_x: x, lantern_y: y };
      }),
    [notes, worldW, worldH],
  );

  return (
    <>
      {placed.map((n) => {
        const isNew = justArrived === n.id;
        return (
          <motion.button
            key={n.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(n);
            }}
            initial={isNew ? { opacity: 0, scale: 0.2 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
            aria-label="a note someone left"
            className="absolute cursor-pointer select-none"
            style={{
              left: (n.lantern_x ?? 0) - 13,
              top: (n.lantern_y ?? 0) - 13,
              width: 26,
              height: 26,
              zIndex: Math.round(n.lantern_y ?? 0),
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            {/* the glow */}
            <motion.span
              animate={{ opacity: [0.55, 1, 0.55], scale: isNew ? [1, 1.35, 1] : [1, 1.12, 1] }}
              transition={{ duration: isNew ? 2.2 : 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 block rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,236,196,0.95) 0%, rgba(255,206,150,0.55) 42%, rgba(255,196,120,0) 72%)",
                boxShadow: "0 0 18px rgba(255,206,150,0.75)",
              }}
            />
            {/* the little flame at its heart */}
            <span
              className="absolute rounded-full"
              style={{
                left: 10,
                top: 9,
                width: 6,
                height: 8,
                background: "linear-gradient(180deg,#fff6e2 0%,#ffd08a 100%)",
                filter: "blur(0.4px)",
              }}
            />
          </motion.button>
        );
      })}

      {/* reading a note */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="note-reader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[80] grid place-items-center px-6"
            style={{ background: "rgba(24,17,12,0.55)", backdropFilter: "blur(3px)" }}
          >
            <motion.div
              initial={{ y: 18, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] rounded-[22px] px-7 py-8 text-center shadow-2xl"
              style={{
                background: "linear-gradient(180deg,#fffaf1 0%,#fdf1dd 100%)",
                border: "1px solid rgba(255,206,150,0.5)",
              }}
            >
              <div className="mb-4 text-[22px]">🕊️</div>
              <p
                className="whitespace-pre-wrap text-[16px] leading-relaxed text-[#4a3a2c]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {open.message}
              </p>
              <p className="mt-5 text-[12px] uppercase tracking-[0.22em]" style={{ color: "#a3856a" }}>
                {open.from_name ? `— ${open.from_name}` : "— someone who was here"}
              </p>
              <button
                onClick={() => setOpen(null)}
                className="mt-6 rounded-full px-5 py-2 text-[13px] text-[#6b5643] transition hover:text-[#4a3a2c]"
                style={{ background: "rgba(255,206,150,0.28)" }}
              >
                leave it where it was
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
