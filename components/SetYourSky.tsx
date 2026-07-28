"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { addCheckin, setTodayFeeling } from "@/lib/memory";
import { getName } from "@/lib/account";

// Feeling through play — you paint your inner weather (and tap a few words), instead of
// answering "how do you feel". It feeds the model, and becomes the world's sky.
const SKIES = [
  { key: "stormy", label: "Stormy", emoji: "⛈️", mood: "Rough" },
  { key: "rainy", label: "Rainy", emoji: "🌧️", mood: "Low" },
  { key: "cloudy", label: "Cloudy", emoji: "☁️", mood: "Okay" },
  { key: "clear", label: "Clear", emoji: "🌤️", mood: "Good" },
  { key: "golden", label: "Golden", emoji: "☀️", mood: "Great" },
];
const WORDS = ["tired", "heavy", "restless", "foggy", "anxious", "numb", "lonely", "okay", "calm", "hopeful", "grateful", "fierce", "tender", "wired"];

export function SetYourSky({ onDone }: { onDone: (sky: string) => void }) {
  const name = getName();
  const [sky, setSky] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);

  function pickSky(s: { key: string; mood: string }) {
    setSky(s.key);
    addCheckin(s.mood); // the weather → a mood check-in the model already understands
  }
  function toggle(w: string) {
    setWords((ws) => (ws.includes(w) ? ws.filter((x) => x !== w) : ws.length < 4 ? [...ws, w] : ws));
  }
  function finish() {
    setTodayFeeling(sky || "clear", words);
    onDone(sky || "clear");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        className="w-full max-w-sm rounded-[28px] border border-hair bg-white p-7 text-center shadow-float"
      >
        {!sky ? (
          <>
            <h2 className="text-[22px] font-semibold tracking-tight">How's your sky today{name ? `, ${name}` : ""}?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink/45">No right answer — just paint it how it feels.</p>
            <div className="mt-6 grid grid-cols-5 gap-1.5">
              {SKIES.map((s) => (
                <button key={s.key} onClick={() => pickSky(s)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-hair py-3 transition hover:bg-mist active:scale-95">
                  <span className="text-[22px]">{s.emoji}</span>
                  <span className="text-[10px] font-medium text-ink/55">{s.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[22px] font-semibold tracking-tight">What's it like under that sky?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink/45">Tap a few that fit — or none. Just noticing helps.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {WORDS.map((w) => {
                const on = words.includes(w);
                return (
                  <button key={w} onClick={() => toggle(w)}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95 ${on ? "border-ink bg-ink text-white" : "border-hair text-ink/55 hover:bg-mist"}`}>
                    {w}
                  </button>
                );
              })}
            </div>
            <button onClick={finish} className="mt-6 w-full rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98]">
              Step into your world
            </button>
            <button onClick={() => setSky(null)} className="mt-3 text-[12.5px] text-ink/35 transition hover:text-ink/60">← change the sky</button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
