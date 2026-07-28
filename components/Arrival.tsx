"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startAmbient } from "@/lib/sound";
import { speak } from "@/lib/voice";
import type { Gender } from "@/lib/account";

const EASE = [0.16, 1, 0.3, 1] as const;

export type Feeling = { mood: string; sky: string; word: string } | null;
export type Answers = { feeling: Feeling; spark: string; care: string };

const FEELINGS: { mood: string; sky: string; word: string }[] = [
  { mood: "Heavy", sky: "rainy", word: "heavy" },
  { mood: "Foggy", sky: "cloudy", word: "foggy" },
  { mood: "Tired", sky: "cloudy", word: "tired" },
  { mood: "Restless", sky: "stormy", word: "restless" },
  { mood: "Hopeful", sky: "clear", word: "hopeful" },
  { mood: "Bright", sky: "golden", word: "grateful" },
];
// "what brings you here" — each carries a natural phrase that seeds Yara's understanding
const SPARKS = [
  { seed: "carrying a heavy heart", label: "A heavy heart" },
  { seed: "with a restless, racing mind", label: "A restless mind" },
  { seed: "just needing a friend", label: "I just need a friend" },
  { seed: "curious, having wandered in", label: "Just curious" },
];
const CARES = [
  { seed: "someone who really listens", label: "Someone who listens" },
  { seed: "quiet, and a little rest", label: "Quiet & rest" },
  { seed: "being out in nature", label: "Out in nature" },
  { seed: "still figuring that out", label: "Still figuring it out" },
];

const MEET =
  "Oh — hello. I felt you arrive. I'm Yara. I tend this place — I made it for people carrying something heavy, so they'd have somewhere gentle to set it down.";
const PROMISE =
  "Whatever you're carrying, you can set it down here. I'll listen, I'll remember, and I'll help you make sense of it. I've been hoping someone like you would find this place. Come — let's walk in together.";

/** Words fade in one by one, like someone speaking (real spaces, screen-reader safe). */
function Speech({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={className}>
      {text.split(" ").map((w, i, arr) => (
        <Fragment key={i}>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.045, ease: EASE }}
            className="inline-block"
          >
            {w}
          </motion.span>
          {i < arr.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </p>
  );
}

type Beat = "threshold" | "dawn" | "meet" | "name" | "spark" | "feeling" | "care" | "promise";

export function Arrival({
  returning,
  knownName,
  onDone,
}: {
  returning: boolean;
  knownName?: string;
  onDone: (name: string, gender: Gender, answers: Answers) => void;
}) {
  const [beat, setBeat] = useState<Beat>("threshold");
  const [name, setName] = useState(knownName ?? "");
  // Matches the world's own default in page.tsx. They used to disagree ("girl" here,
  // "boy" there), so anyone who never tapped a choice silently got a mismatched
  // character and companion.
  const [gender, setGender] = useState<Gender>("boy");
  const [feeling, setFeeling] = useState<Feeling>(null);
  const [spark, setSpark] = useState("");
  const [care, setCare] = useState("");
  const spoken = useRef<Set<string>>(new Set());

  const say = (t: string) => { try { speak(t, "female"); } catch { /* */ } };

  function enter() {
    try { startAmbient(); } catch { /* */ }
    setBeat("dawn");
  }
  function finish() {
    onDone(name.trim() || knownName || "friend", gender, { feeling, spark, care });
  }

  // pacing + speech — Yara greets quickly, right as the world arrives
  useEffect(() => {
    if (beat === "dawn") {
      const t = setTimeout(() => (returning ? finish() : setBeat("meet")), 1700);
      return () => clearTimeout(t);
    }
    if (beat === "meet" && !spoken.current.has("meet")) { spoken.current.add("meet"); say(MEET); }
    if (beat === "promise" && !spoken.current.has("promise")) { spoken.current.add("promise"); say(PROMISE); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  const capBox = "absolute inset-x-0 bottom-0 flex flex-col items-center px-7 pb-14 pt-24 text-center";
  const capBg = {
    background: "linear-gradient(to top, rgba(14,11,9,0.82) 0%, rgba(14,11,9,0.55) 45%, rgba(14,11,9,0) 100%)",
  } as const;
  const line = "max-w-md text-[18px] font-light leading-relaxed text-[#fdf3e6]";
  const chip = "rounded-full border border-[#fdf3e6]/25 px-5 py-2.5 text-[14px] font-light text-[#fdf3e6] transition hover:border-[#ffd79a]/70 hover:bg-[#ffd79a]/10 active:scale-[0.97]";
  const skip = "mt-6 text-[13px] font-light text-[#fdf3e6]/55 transition hover:text-[#fdf3e6]/90";

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: EASE }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[90] overflow-hidden"
    >
      {/* DUSK — the dawn scene at dusk; fades quickly so the world arrives */}
      <motion.div
        animate={{ opacity: beat === "threshold" ? 1 : 0 }}
        transition={{ duration: 1.6, ease: EASE }}
        style={{ pointerEvents: beat === "threshold" ? "auto" : "none" }}
        className="absolute inset-0"
        onClick={beat === "threshold" ? enter : undefined}
      >
        <img src="/yara_dawn.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ background: "rgba(13,10,8,0.66)" }} />
        {beat === "threshold" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <motion.div
              animate={{ opacity: [0.45, 0.95, 0.45], scale: [1, 1.06, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="mb-10 h-16 w-16 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,214,150,0.9) 0%, rgba(255,180,110,0.25) 55%, rgba(255,180,110,0) 75%)" }}
            />
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              className="text-[26px] font-light tracking-[0.32em] text-[#fdf3e6]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              breathe
            </motion.span>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 1.6, delay: 0.6, ease: EASE }}
              className="mt-6 text-[12.5px] font-light tracking-[0.2em] text-[#fdf3e6]/70"
            >
              {returning ? `welcome back, ${knownName}` : "tap to step inside"}
            </motion.p>
          </div>
        )}
      </motion.div>

      {/* warm dawn wash as the world appears */}
      {beat === "dawn" && (
        <motion.div
          initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 1.7, ease: EASE }}
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(255,221,170,0.55), rgba(255,190,150,0.18) 45%, rgba(255,190,150,0))" }}
        />
      )}

      {/* CAPTIONS — world visible behind; Yara talks, you answer */}
      <AnimatePresence mode="wait">
        {beat === "meet" && (
          <motion.div key="meet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={capBg} className={capBox} onClick={() => setBeat("name")}>
            <Speech text={MEET} className={line} />
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} transition={{ delay: 2.6, duration: 0.9 }} className="mt-7 text-[12px] tracking-[0.2em] text-[#fdf3e6]/60">tap to go on</motion.span>
          </motion.div>
        )}

        {beat === "name" && (
          <motion.div key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={capBg} className={capBox}>
            <Speech text="Before we walk in together… what should I call you?" className={line} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setBeat("spark"); }}
              autoFocus maxLength={40} placeholder="your name"
              className="mt-7 w-full max-w-[280px] border-b border-[#fdf3e6]/30 bg-transparent pb-2 text-center text-[20px] font-light text-[#fdf3e6] caret-[#ffd79a] outline-none transition focus:border-[#ffd79a]/70"
              style={{ fontFamily: "Georgia, serif" }}
            />
            {/* This choice sets BOTH who you are in the world and who walks beside you —
                a boy walks with the chick, a girl walks with the penguin. It used to be two
                unlabelled buttons, so nobody knew what they were picking. */}
            <p className="mt-8 text-[12px] tracking-[0.18em] text-[#fdf3e6]/50">AND WHO'S ARRIVING?</p>
            <div className="mt-3 flex items-center gap-3">
              {([["boy", "🐤", "a boy", "& his chick"], ["girl", "🐧", "a girl", "& her penguin"]] as const).map(
                ([g, e, who, pet]) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition ${gender === g ? "border-[#ffd79a]/80 bg-[#ffd79a]/15 text-[#fdf3e6]" : "border-[#fdf3e6]/20 text-[#fdf3e6]/60"}`}
                  >
                    <span className="text-[16px]">{e}</span>
                    <span>
                      {who} <span className="opacity-60">{pet}</span>
                    </span>
                  </button>
                ),
              )}
            </div>
            <button onClick={() => name.trim() && setBeat("spark")} disabled={!name.trim()} className="mt-7 rounded-full bg-[#fdf3e6] px-8 py-3 text-[14px] font-medium text-[#241a12] transition active:scale-[0.97] disabled:opacity-30">
              continue →
            </button>
          </motion.div>
        )}

        {beat === "spark" && (
          <motion.div key="spark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={capBg} className={capBox}>
            <Speech text={`What brings you here, ${name.trim() || "friend"}? There's no wrong answer.`} className={line} />
            <div className="mt-7 flex max-w-sm flex-wrap justify-center gap-2.5">
              {SPARKS.map((s) => (
                <button key={s.label} onClick={() => { setSpark(s.seed); setBeat("feeling"); }} className={chip}>{s.label}</button>
              ))}
            </div>
            <button onClick={() => setBeat("promise")} className={skip}>or just step inside →</button>
          </motion.div>
        )}

        {beat === "feeling" && (
          <motion.div key="feeling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={capBg} className={capBox}>
            <Speech text="And how are you arriving today? You don't have to make it neat." className={line} />
            <div className="mt-7 flex max-w-sm flex-wrap justify-center gap-2.5">
              {FEELINGS.map((f) => (
                <button key={f.mood} onClick={() => { setFeeling(f); setBeat("care"); }} className={chip}>{f.mood}</button>
              ))}
            </div>
            <button onClick={() => setBeat("care")} className={skip}>skip for now →</button>
          </motion.div>
        )}

        {beat === "care" && (
          <motion.div key="care" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={capBg} className={capBox}>
            <Speech text="When everything feels heavy — what helps you most?" className={line} />
            <div className="mt-7 flex max-w-sm flex-wrap justify-center gap-2.5">
              {CARES.map((c) => (
                <button key={c.label} onClick={() => { setCare(c.seed); setBeat("promise"); }} className={chip}>{c.label}</button>
              ))}
            </div>
            <button onClick={() => setBeat("promise")} className={skip}>skip for now →</button>
          </motion.div>
        )}

        {beat === "promise" && (
          <motion.div key="promise" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={capBg} className={capBox}>
            <Speech text={PROMISE} className={line} />
            <button onClick={finish} className="mt-8 rounded-full bg-[#fdf3e6] px-9 py-3.5 text-[14.5px] font-medium text-[#241a12] shadow-[0_0_30px_rgba(255,215,150,0.4)] transition active:scale-[0.97]">
              come in →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
