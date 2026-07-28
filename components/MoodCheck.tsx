"use client";

import { motion } from "framer-motion";
import { addCheckin } from "@/lib/memory";

const MOODS = [
  { label: "Rough", emoji: "🌧️" },
  { label: "Low", emoji: "☁️" },
  { label: "Okay", emoji: "⛅" },
  { label: "Good", emoji: "🌤️" },
  { label: "Great", emoji: "☀️" },
];

// A soft daily check-in when you enter your world.
export function MoodCheck({ onDone }: { onDone: (mood: string | null) => void }) {
  function pick(m: string) {
    addCheckin(m);
    onDone(m);
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        className="w-full max-w-sm rounded-[28px] border border-hair bg-white p-7 text-center shadow-float"
      >
        <h2 className="text-[22px] font-semibold tracking-tight">How are you, right now?</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink/45">No wrong answer. Just noticing is the kind thing.</p>
        <div className="mt-6 grid grid-cols-5 gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.label}
              onClick={() => pick(m.label)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-hair py-3 transition hover:bg-mist active:scale-95"
            >
              <span className="text-[20px]">{m.emoji}</span>
              <span className="text-[10.5px] font-medium text-ink/55">{m.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => onDone(null)} className="mt-5 text-[13px] text-ink/35 transition hover:text-ink/60">
          Skip for today
        </button>
      </motion.div>
    </motion.div>
  );
}
