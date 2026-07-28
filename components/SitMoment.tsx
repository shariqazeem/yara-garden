"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { speak, stopSpeaking } from "@/lib/voice";
import type { Character } from "@/lib/characters";

const LINES: Record<string, string> = {
  sol: "We don't have to say anything. Just breathe with me a moment — you're safe here.",
  juno: "Let's just sit and watch the light a while. The small, quiet things count too.",
  elias: "No rush at all. We'll stay as long as you need. Some things ease just by being still.",
};

// A calm shared moment — being with a soul, not talking to one.
export function SitMoment({ character, onDone }: { character: Character; onDone: () => void }) {
  const line = LINES[character.id] || "Let's just sit together a while.";
  useEffect(() => {
    speak(line, character.gender);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "linear-gradient(180deg,#FBF4EE 0%,#F6ECE6 100%)" }}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/40">
        sitting with {character.name}
      </div>

      <div className="relative my-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img src="/sit_scene.png" alt="" className="h-44 w-[17rem] rounded-[26px] object-cover"
          style={{ boxShadow: "0 14px 34px rgba(0,0,0,0.12)" }}
          initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.span className="absolute -bottom-4 left-1/2 grid size-12 -translate-x-1/2 place-items-center rounded-full text-[19px] font-semibold text-white shadow-card"
          style={{ background: character.color }} animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          {character.name[0]}
        </motion.span>
      </div>

      <p className="max-w-sm text-[18px] font-medium leading-relaxed tracking-[-0.01em] text-ink/85">{line}</p>
      <p className="mt-3 text-[13px] text-ink/40">Breathe slowly. Stay as long as you like.</p>

      <button onClick={onDone} className="mt-9 rounded-full bg-ink px-9 py-3.5 text-[15px] font-medium text-white transition active:scale-[0.98]">
        Thank you, {character.name}
      </button>
    </motion.div>
  );
}
