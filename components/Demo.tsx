"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CASES, DDxResult } from "@/lib/cases";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Demo() {
  const [text, setText] = useState(CASES[0].presentation);
  const [activeChip, setActiveChip] = useState<string>(CASES[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DDxResult | null>(null);
  const [steps, setSteps] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function analyze(presentation: string, caseId?: string) {
    if (timer.current) clearInterval(timer.current);
    setLoading(true);
    setResult(null);
    setSteps(0);
    try {
      const res = await fetch("/api/ddx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presentation, caseId }),
      });
      const data: DDxResult = await res.json();
      await new Promise((r) => setTimeout(r, 480)); // "thinking" beat
      setLoading(false);
      setResult(data);
      let i = 0;
      timer.current = setInterval(() => {
        i += 1;
        setSteps(i);
        if (i >= data.reasoning.length && timer.current) clearInterval(timer.current);
      }, 600);
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const reasoningDone = result ? steps >= result.reasoning.length : false;

  return (
    <section id="demo" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-[32px] font-semibold tracking-[-0.02em] sm:text-[40px]">
            Try a real case.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[16px] text-subtle">
            Pick a presentation a generic model gets wrong — and watch PsiDDx reason
            through it.
          </p>
        </div>

        {/* case chips */}
        <div className="no-scrollbar -mx-6 mb-5 flex gap-2.5 overflow-x-auto px-6 sm:justify-center">
          {CASES.map((c) => {
            const active = activeChip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveChip(c.id);
                  setText(c.presentation);
                  analyze(c.presentation, c.id);
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-hair bg-canvas text-subtle hover:bg-mist"
                }`}
              >
                {c.chip}
              </button>
            );
          })}
        </div>

        {/* console card */}
        <div className="overflow-hidden rounded-4xl border border-hair bg-canvas shadow-card">
          <div className="border-b border-hair p-5 sm:p-6">
            <label className="mb-2 block text-[12px] font-medium uppercase tracking-wide text-subtle">
              Patient presentation
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-subtle"
              placeholder="Describe the presentation: history, course, symptoms…"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-subtle">
                Decision support — not a diagnosis.
              </span>
              <button
                onClick={() => analyze(text)}
                disabled={loading}
                className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Analyzing…" : "Analyze"}
              </button>
            </div>
          </div>

          {/* results */}
          <div className="min-h-[120px] bg-mist/40 p-5 sm:p-6">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 text-[14px] text-subtle"
                >
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </span>
                  Reasoning through the differential…
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid gap-6 md:grid-cols-2"
                >
                  {/* reasoning trace */}
                  <div>
                    <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wide text-subtle">
                      Reasoning
                    </h3>
                    <ol className="space-y-2.5">
                      {result.reasoning.map((step, i) => (
                        <AnimatePresence key={i}>
                          {i < steps && (
                            <motion.li
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.45, ease: EASE }}
                              className="flex gap-2.5 text-[14px] leading-snug text-ink"
                            >
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent2" />
                              {step}
                            </motion.li>
                          )}
                        </AnimatePresence>
                      ))}
                    </ol>
                  </div>

                  {/* differentials */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: reasoningDone ? 1 : 0.25 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wide text-subtle">
                      Ranked differential
                    </h3>
                    <div className="space-y-2.5">
                      {result.differentials.map((dx, i) => (
                        <motion.div
                          key={dx.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={reasoningDone ? { opacity: 1, y: 0 } : {}}
                          transition={{ duration: 0.5, delay: 0.08 * i, ease: EASE }}
                          className={`rounded-2xl border p-3.5 ${
                            i === 0
                              ? "border-accent/40 bg-canvas shadow-glow"
                              : "border-hair bg-canvas"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold">{dx.name}</span>
                              {dx.icd10 && (
                                <span className="rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-medium text-subtle">
                                  {dx.icd10}
                                </span>
                              )}
                            </div>
                            <span className="text-[13px] tabular-nums text-subtle">
                              {Math.round(dx.confidence * 100)}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
                              initial={{ width: 0 }}
                              animate={reasoningDone ? { width: `${dx.confidence * 100}%` } : {}}
                              transition={{ duration: 0.9, delay: 0.12 * i, ease: EASE }}
                            />
                          </div>
                          {dx.discriminator && (
                            <p className="mt-2.5 text-[12.5px] leading-snug text-subtle">
                              <span className="font-medium text-ink">Key: </span>
                              {dx.discriminator}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* the money shot */}
                  <AnimatePresence>
                    {reasoningDone && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
                        className="md:col-span-2"
                      >
                        <div className="rounded-3xl border border-hair bg-canvas p-5">
                          <div className="flex flex-wrap items-center gap-3 text-[14px]">
                            <span className="text-subtle">A generic model says</span>
                            <span className="rounded-full bg-mist px-3 py-1 font-medium text-subtle line-through">
                              {result.genericModel.name}
                            </span>
                            <span className="text-subtle">→</span>
                            <span className="rounded-full bg-ink px-3 py-1 font-medium text-white">
                              {result.differentials[0].name} ✓
                            </span>
                          </div>
                          <p className="mt-3 text-[13.5px] leading-relaxed text-subtle">
                            {result.genericModel.note}
                          </p>
                          {result.redFlags.length > 0 && (
                            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-warn/10 p-3 text-[13px] text-ink">
                              <span className="mt-0.5 shrink-0 text-warn">⚠</span>
                              <span>{result.redFlags[0]}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] text-subtle">
          Demo uses curated, clinically-grounded cases. The live PsiDDx model plugs into
          the same interface once trained.
        </p>
      </div>
    </section>
  );
}
