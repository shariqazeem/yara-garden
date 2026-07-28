"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { setIntake, setProfile } from "@/lib/memory";
import { getName } from "@/lib/account";
import { speak, stopSpeaking } from "@/lib/voice";

const EASE = [0.16, 1, 0.3, 1] as const;
type QA = { question: string; answer: string };
type Step = { question?: string; options?: string[]; done?: boolean; reflection?: string };

function Dots() {
  return (
    <span className="flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-1.5 rounded-full bg-ink/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </span>
  );
}

// Yara's first conversation — the gentle intake, reborn as her introduction.
export function IntakeChat({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"open" | "q" | "done">("open");
  const [opener, setOpener] = useState("");
  const [answers, setAnswers] = useState<QA[]>([]);
  const [step, setStep] = useState<Step | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reflection, setReflection] = useState("");
  const answersRef = useRef<QA[]>([]);
  const intakeRef = useRef("");

  const who = getName();
  const greeting = `Hi${who ? `, ${who}` : ""}… I'm Yara. I'm really glad you're here. Before we walk together — what's been weighing on you lately? However you want to say it, I'm listening.`;

  useEffect(() => {
    speak(greeting, "female");
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStep(nextAnswers: QA[]) {
    setBusy(true);
    setStep(null);
    try {
      const res = await fetch("/api/companion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intake: intakeRef.current, answers: nextAnswers }),
      });
      const data = (await res.json()) as Step;
      if (data.done || (!data.question && data.reflection)) {
        finish(data.reflection || "Thank you for trusting me with that. Let's take the next gentle step together.");
      } else {
        setStep(data);
        if (data.question) speak(data.question, "female");
      }
    } catch {
      finish("Thank you for trusting me with that. Let's take this gently, together.");
    } finally {
      setBusy(false);
    }
  }

  function finish(refl: string) {
    const summary = [
      intakeRef.current && `They shared: "${intakeRef.current}"`,
      ...answersRef.current.map((a) => `${a.question} → ${a.answer}`),
    ]
      .filter(Boolean)
      .join(" · ");
    setIntake(summary || refl);
    if (summary) setProfile(summary); // seed Yara's living memory from the very first hello
    setReflection(refl);
    setPhase("done");
    speak(refl, "female");
  }

  function submitOpener(text: string) {
    intakeRef.current = text.trim();
    setInput("");
    setPhase("q");
    fetchStep([]);
  }

  function answer(text: string) {
    const a = text.trim();
    if (!a || busy || !step?.question) return;
    const next = [...answersRef.current, { question: step.question, answer: a }];
    answersRef.current = next;
    setAnswers(next);
    setInput("");
    fetchStep(next);
  }

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.5, ease: EASE }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[82dvh] w-full max-w-lg flex-col rounded-t-[28px] border-t border-hair shadow-float"
    >
      <div className="flex items-center gap-2.5 px-6 pt-5">
        <span className="grid size-9 place-items-center rounded-full text-[14px] font-semibold text-white" style={{ background: "#E98A7C" }}>Y</span>
        <div>
          <div className="text-[15px] font-semibold tracking-tight">Yara</div>
          <div className="text-[11px] font-medium text-ink/40">your guide</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {phase === "open" && (
          <p className="rounded-3xl bg-mist px-4 py-3 text-[15.5px] leading-relaxed text-ink/85">{greeting}</p>
        )}

        {phase === "q" && (
          <div className="flex flex-col gap-3">
            {answers.map((a, i) => (
              <div key={i} className="flex flex-col gap-2">
                <p className="self-start max-w-[88%] rounded-3xl bg-mist px-4 py-2.5 text-[15px] leading-relaxed text-ink/85">{a.question}</p>
                <p className="self-end max-w-[88%] rounded-3xl bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-white">{a.answer}</p>
              </div>
            ))}
            {busy && <div className="self-start rounded-3xl bg-mist px-4"><Dots /></div>}
            {step?.question && !busy && (
              <p className="self-start max-w-[88%] rounded-3xl bg-mist px-4 py-2.5 text-[15px] leading-relaxed text-ink/85">{step.question}</p>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="grid size-12 place-items-center rounded-full text-[20px] font-semibold text-white" style={{ background: "#E98A7C" }}>Y</span>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-ink/80">{reflection}</p>
            <p className="mt-2 text-[13px] text-ink/40">I'll remember this. You can always find me here.</p>
          </div>
        )}
      </div>

      <div className="px-6 pb-7 pt-1">
        {phase === "open" && (
          <>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) submitOpener(input); } }}
                rows={1}
                placeholder="Say it your way…"
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-3xl border border-hair bg-white/70 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink/40"
              />
              <button onClick={() => input.trim() && submitOpener(input)} disabled={!input.trim()} aria-label="Send"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-95 disabled:opacity-30">↑</button>
            </div>
            <button onClick={() => { setIntake("(Chose to start exploring first — hasn't shared much yet.)"); onDone(); }} className="mt-3 w-full text-center text-[13px] text-ink/40 transition hover:text-ink/70">
              I'd rather just start exploring →
            </button>
          </>
        )}

        {phase === "q" && step?.question && !busy && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {(step.options ?? []).map((o) => (
                <button key={o} onClick={() => answer(o)} className="rounded-full border border-hair bg-white px-4 py-2 text-[13.5px] font-medium text-ink transition hover:bg-mist active:scale-95">
                  {o}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); answer(input); } }}
                rows={1}
                placeholder="…or say it in your own words"
                className="max-h-24 min-h-[42px] flex-1 resize-none rounded-3xl border border-hair bg-white/70 px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-ink/40"
              />
              <button onClick={() => answer(input)} disabled={!input.trim()} aria-label="Send"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-95 disabled:opacity-30">↑</button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <button onClick={onDone} className="w-full rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98]">
            Step into your world
          </button>
        )}
      </div>
    </motion.div>
  );
}
