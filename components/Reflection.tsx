"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getMemory } from "@/lib/memory";
import { speak, stopSpeaking } from "@/lib/voice";

const EASE = [0.16, 1, 0.3, 1] as const;

// The Still Pond moment — Yara reflects what she's quietly noticed. Awareness, never diagnosis.
export function Reflection({ onClose }: { onClose: () => void }) {
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const mem = getMemory();
    const talk = Object.values(mem.talks ?? {})
      .flat()
      .slice(-14)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    fetch("/api/insight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intake: mem.intake, moods: mem.checkins.map((c) => c.mood), talk, profile: mem.profile }),
    })
      .then((r) => r.json())
      .then((d) => {
        const text = d.reflection ?? "The water's quiet today.";
        setReflection(text);
        speak(text, "female");
      })
      .catch(() => setReflection("The water's quiet today — but what I see is someone still trying, and that's enough."))
      .finally(() => setBusy(false));
    return () => stopSpeaking();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-7 text-center"
      style={{ background: "linear-gradient(180deg,#EAF6F8 0%,#DCEFF2 45%,#CDE6EC 100%)" }}
    >
      <motion.div
        className="absolute left-1/2 top-[20%] size-32 -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle,#bfe6ee,transparent 70%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative w-full max-w-md">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5EA3B8]">🪞 the still pond</div>
        <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-ink/80">What Yara sees in the water</h2>

        {busy ? (
          <div className="mt-10 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-2 rounded-full bg-[#7FBFD0]" animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
            ))}
          </div>
        ) : (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-7 text-[19px] font-medium leading-relaxed tracking-[-0.01em] text-ink"
          >
            {reflection}
          </motion.p>
        )}

        {!busy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <p className="mx-auto mt-8 max-w-xs text-[11.5px] leading-relaxed text-ink/35">
              This is just what I've noticed about you — not a verdict, only care. If anything here resonates, talking it through with someone you trust can help.
            </p>
            <button onClick={onClose} className="mt-7 rounded-full bg-ink px-9 py-3.5 text-[15px] font-medium text-white transition active:scale-[0.98]">
              Thank you, Yara
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
