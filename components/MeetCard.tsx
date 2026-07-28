"use client";

import { motion } from "framer-motion";
import { speak } from "@/lib/voice";
import { useEffect } from "react";
import type { Character } from "@/lib/characters";

const EASE = [0.16, 1, 0.3, 1] as const;

export function MeetCard({
  character,
  onBefriend,
  onClose,
}: {
  character: Character;
  onBefriend: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    speak(character.intro, character.gender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.5, ease: EASE }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-[28px] border-t border-hair px-6 pb-8 pt-6 shadow-float"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid size-12 place-items-center rounded-full text-[18px] font-semibold text-white"
          style={{ background: character.color }}
        >
          {character.name[0]}
        </span>
        <div>
          <div className="text-[18px] font-semibold tracking-tight">{character.name}</div>
          <div className="text-[12.5px] font-medium text-ink/40">{character.role}</div>
        </div>
      </div>

      <p className="mt-5 text-[15.5px] leading-relaxed text-ink/80">“{character.intro}”</p>

      <div className="mt-4 rounded-2xl bg-mist px-4 py-3 text-[13.5px] leading-relaxed text-ink/55">
        <span className="font-medium text-ink/70">How {character.name} helps:</span> {character.helps}
      </div>

      <div className="mt-6 flex gap-2.5">
        <button
          onClick={onClose}
          className="rounded-full border border-hair px-5 py-3 text-[14px] font-medium text-ink/55 transition hover:bg-mist"
        >
          Not now
        </button>
        <button
          onClick={onBefriend}
          className="flex-1 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
        >
          Become friends 🌿
        </button>
      </div>
    </motion.div>
  );
}
