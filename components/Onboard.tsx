"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { APP_NAME } from "@/lib/brand";
import type { Gender } from "@/lib/account";

// First launch: your name (creates your local account), then who you are in the world.
export function Onboard({ onDone }: { onDone: (name: string, gender: Gender) => void }) {
  const [step, setStep] = useState<"name" | "who">("name");
  const [name, setName] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-0 z-[70] flex items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        className="w-full max-w-sm rounded-[28px] border border-hair bg-white p-7 text-center shadow-float"
      >
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">{APP_NAME}</div>

        {step === "name" ? (
          <>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">Welcome to your world</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink/55">
              A calm place to grow a little stronger each day, with a companion who truly remembers you. Before we begin… what should I call you?
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep("who"); }}
              autoFocus
              maxLength={40}
              placeholder="Your name or a nickname"
              className="mt-6 w-full rounded-2xl border border-hair bg-white/70 px-4 py-3 text-center text-[16px] text-ink outline-none transition focus:border-ink/40"
            />
            <button
              onClick={() => name.trim() && setStep("who")}
              disabled={!name.trim()}
              className="mt-4 w-full rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-30"
            >
              Continue →
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-ink/30">No email, no password. Everything stays on your device.</p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">Who are you here, {name}?</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink/55">
              Choose how you'll appear — and the little companion who'll stay by your side, always.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => onDone(name, "boy")}
                className="flex flex-col items-center gap-2 rounded-3xl border border-hair p-5 transition hover:bg-mist active:scale-[0.98]"
              >
                <span className="text-[30px]">🧒</span>
                <span className="text-[14px] font-semibold">A boy</span>
                <span className="text-[11.5px] text-ink/45">with a chick 🐤</span>
              </button>
              <button
                onClick={() => onDone(name, "girl")}
                className="flex flex-col items-center gap-2 rounded-3xl border border-hair p-5 transition hover:bg-mist active:scale-[0.98]"
              >
                <span className="text-[30px]">👧</span>
                <span className="text-[14px] font-semibold">A girl</span>
                <span className="text-[11.5px] text-ink/45">with a penguin 🐧</span>
              </button>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ink/30">
              Penguins partner for life — your companion stays with you, for the whole journey.
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
