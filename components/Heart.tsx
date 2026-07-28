"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Breathe } from "./Breathe";
import { Talk } from "./Talk";
import { addCheckin } from "@/lib/memory";

const EASE = [0.16, 1, 0.3, 1] as const;
const MOODS = ["Rough", "Low", "Okay", "Good", "Great"];

export function Heart({ reflection }: { reflection: string }) {
  const [mood, setMood] = useState<string | null>(null);
  const [breathing, setBreathing] = useState(false);
  const [talking, setTalking] = useState(false);

  function pickMood(m: string) {
    setMood(m);
    addCheckin(m);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full"
    >
      <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[36px]">
        This is your space.
      </h2>
      {reflection && <p className="mt-4 text-[16px] leading-relaxed text-ink/45">{reflection}</p>}

      {/* mood check-in */}
      <div className="mt-10">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink/35">
          How are you, right now?
        </p>
        <div className="mt-3 flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => pickMood(m)}
              className={`flex-1 rounded-2xl border py-3 text-[12.5px] font-medium transition active:scale-[0.98] ${
                mood === m ? "border-ink bg-ink text-white" : "border-hair text-ink/55 hover:bg-mist"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {mood && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-[14px] leading-relaxed text-ink/45"
            >
              Thank you for checking in. Noticing how you feel is the first kind thing you can do today.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* tools */}
      <div className="mt-10 grid grid-cols-2 gap-3">
        <button
          onClick={() => setBreathing(true)}
          className="rounded-3xl border border-hair p-5 text-left transition hover:bg-mist active:scale-[0.99]"
        >
          <div className="text-[15px] font-semibold">Breathe</div>
          <div className="mt-1 text-[13px] text-ink/40">A minute of calm</div>
        </button>
        <button
          onClick={() => setTalking(true)}
          className="rounded-3xl border border-hair p-5 text-left transition hover:bg-mist active:scale-[0.99]"
        >
          <div className="text-[15px] font-semibold">Talk to Sol</div>
          <div className="mt-1 text-[13px] text-ink/40">She remembers you</div>
        </button>
        {[
          { t: "Reflect", d: "Soon" },
          { t: "Track", d: "Soon" },
        ].map((tile) => (
          <div
            key={tile.t}
            className="rounded-3xl border border-dashed border-hair p-5 text-left opacity-60"
          >
            <div className="text-[15px] font-semibold">{tile.t}</div>
            <div className="mt-1 text-[13px] text-ink/40">{tile.d}</div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {breathing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass fixed inset-0 z-50 flex items-center justify-center"
          >
            <Breathe onDone={() => setBreathing(false)} />
          </motion.div>
        )}
        {talking && <Talk key="talk" onClose={() => setTalking(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
