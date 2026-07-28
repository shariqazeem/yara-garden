"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { speak, stopSpeaking } from "@/lib/voice";

// The Green — a tiny guided movement break. Healing isn't only the mind; the body needs care too.
const STEPS = [
  "Reach up to the sky — as tall as you can. Breathe in.",
  "Now roll your shoulders back, slow and easy.",
  "Shake out your hands. Let the tension fall away.",
  "One more deep breath. Your body has been carrying you — thank it.",
];

export function MoveMoment({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    speak(STEPS[i], "female");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  useEffect(() => () => stopSpeaking(), []);
  const last = i >= STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "linear-gradient(180deg,#EEF7E6 0%,#E2F0D6 100%)" }}
    >
      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6E9A4E]">the green · move your body</div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src="/move_scene.png" alt="" className="my-8 h-44 w-[17rem] rounded-[26px] object-cover"
        style={{ boxShadow: "0 14px 34px rgba(110,154,78,0.28)" }}
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: [1, 1.03, 1] }}
        transition={{ opacity: { duration: 0.5 }, scale: { duration: 5, repeat: Infinity, ease: "easeInOut" } }} />

      <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="max-w-sm text-[19px] font-medium leading-relaxed tracking-[-0.01em] text-ink/85">
        {STEPS[i]}
      </motion.p>
      <p className="mt-3 text-[12px] text-ink/40">{i + 1} of {STEPS.length}</p>

      <button onClick={() => (last ? onDone() : setI(i + 1))} className="mt-9 rounded-full bg-ink px-9 py-3.5 text-[15px] font-medium text-white transition active:scale-[0.98]">
        {last ? "Done 🌿" : "Next"}
      </button>
    </motion.div>
  );
}
