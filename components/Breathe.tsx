"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// 4-4-6 calming cycle.
const PHASES = [
  { label: "Breathe in", dur: 4000, scale: 1.5 },
  { label: "Hold", dur: 4000, scale: 1.5 },
  { label: "Breathe out", dur: 6000, scale: 0.78 },
] as const;

export function Breathe({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase((p) => {
        const next = (p + 1) % PHASES.length;
        if (next === 0) setCycles((c) => c + 1);
        return next;
      });
    }, PHASES[phase].dur);
    return () => clearTimeout(t);
  }, [phase]);

  const p = PHASES[phase];

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-72 w-72 items-center justify-center">
        <motion.div
          className="absolute size-44 rounded-full bg-ink/[0.035]"
          animate={{ scale: p.scale }}
          transition={{ duration: p.dur / 1000, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute size-44 rounded-full border border-ink/12"
          animate={{ scale: p.scale }}
          transition={{ duration: p.dur / 1000, ease: "easeInOut" }}
        />
        <motion.span
          key={p.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative text-[16px] font-medium tracking-tight text-ink/65"
        >
          {p.label}
        </motion.span>
      </div>
      <p className="mt-2 text-[12px] text-ink/30">{cycles > 0 ? `${cycles} breaths` : "Follow the circle"}</p>
      <button
        onClick={onDone}
        className="mt-8 text-[15px] font-medium text-ink/40 transition hover:text-ink"
      >
        Done
      </button>
    </div>
  );
}
