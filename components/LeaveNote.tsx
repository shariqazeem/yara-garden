"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getName } from "@/lib/account";

const EASE = [0.16, 1, 0.3, 1] as const;

// A quiet place to leave words for whoever tends this world — feedback, or anything
// at all. Framed so it never asks for vulnerability, only offers a safe place for it.
export function LeaveNote({ onClose }: { onClose: () => void }) {
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // Sharing is opt-in, per note. A note is private unless the writer says otherwise.
  const [share, setShare] = useState(false);
  const [reply, setReply] = useState("");

  async function send() {
    if (!msg.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, name, player: getName() || "", share }),
      });
      const data = (await res.json()) as { reply?: string };
      if (data?.reply) setReply(data.reply);
    } catch { /* no-op — we still thank them */ }
    setBusy(false);
    setSent(true);
  }

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.5, ease: EASE }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[82dvh] w-full max-w-lg flex-col rounded-t-[28px] border-t border-hair px-6 pb-7 pt-5 shadow-float"
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight">Leave a note 🕊️</span>
        <button onClick={onClose} className="text-[14px] text-ink/40 transition hover:text-ink">
          {sent ? "Close" : "Not now"}
        </button>
      </div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col items-center px-2 py-10 text-center"
        >
          <div className="text-[34px]">🤍</div>
          <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-ink/70">
            {reply || "It landed softly."} Thank you for trusting this place with your words — they’re read with care.
          </p>
          <button
            onClick={onClose}
            className="mt-7 rounded-full bg-ink px-8 py-3 text-[14px] font-semibold text-white transition active:scale-[0.97]"
          >
            Back to the world
          </button>
        </motion.div>
      ) : (
        <>
          <p className="mb-4 mt-1 text-[14px] leading-relaxed text-ink/55">
            A word for whoever tends this place — about the world, or anything you’re carrying. There’s no pressure to explain, and it stays private unless you choose otherwise.
          </p>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            autoFocus
            rows={5}
            placeholder="anything at all…"
            className="min-h-[120px] w-full resize-none rounded-2xl border border-hair bg-white/70 px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition focus:border-ink/40"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="sign it, or leave it unnamed"
            className="mt-3 w-full rounded-2xl border border-hair bg-white/70 px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-ink/40"
          />
          {/* Opt-in sharing. Off by default — a note is private until its writer says it isn't. */}
          <button
            onClick={() => setShare((s) => !s)}
            className="mt-4 flex w-full items-start gap-3 rounded-2xl border border-hair bg-white/50 px-4 py-3 text-left transition hover:bg-white/70"
          >
            <span
              className={`mt-[2px] grid size-[18px] shrink-0 place-items-center rounded-[6px] border text-[11px] transition ${
                share ? "border-transparent bg-ink text-white" : "border-ink/25 text-transparent"
              }`}
            >
              ✓
            </span>
            <span className="text-[13px] leading-relaxed text-ink/70">
              Also hang it in the garden as a lantern, for a stranger to find.
              <span className="block text-[11px] text-ink/40">
                Anyone wandering here could read it. Gentle words only — it’s checked first.
              </span>
            </span>
          </button>

          <button
            onClick={send}
            disabled={!msg.trim() || busy}
            className="mt-4 w-full rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-30"
          >
            {busy ? "sending…" : share ? "send it & light a lantern 🏮" : "send it 🕊️"}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink/30">
            {share
              ? "Read with care. Shared as a lantern once it’s checked."
              : "Read with care. Private to the keeper of this world."}
          </p>
        </>
      )}
    </motion.div>
  );
}
