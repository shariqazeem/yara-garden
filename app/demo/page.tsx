"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

type Showcase = {
  id: string;
  chip: string;
  vignette: string;
  highlight: string; // the exact phrase in the vignette that flips the diagnosis
  generic: { dx: string; confidence: number; note: string };
  psiddx: {
    dx: string;
    icd10: string;
    confidence: number;
    explanation: string;
    mustNotMiss?: string;
    nextStep: string;
  };
};

const CASES: Showcase[] = [
  {
    id: "porphyria",
    chip: "Porphyria vs Anxiety",
    vignette:
      "22-year-old woman presents with acute anxiety, abdominal pain and recent sleep disturbance. She mentions her urine darkened to a reddish-brown after being left standing in the light.",
    highlight: "her urine darkened to a reddish-brown after being left standing in the light",
    generic: {
      dx: "Generalized Anxiety Disorder",
      confidence: 0.95,
      note: "Anchors on the anxiety and somatic abdominal pain — the common, available answer — and never asks why the urine changed colour.",
    },
    psiddx: {
      dx: "Acute Intermittent Porphyria",
      icd10: "E80.21",
      confidence: 0.81,
      explanation:
        "Reddish-brown urine on standing, with neuro-visceral abdominal pain and psychiatric symptoms, is the classic tell of acute porphyria — not anxiety.",
      mustNotMiss:
        "Many common drugs are porphyrinogenic and can trigger a life-threatening attack — confirm before prescribing.",
      nextStep: "Spot urinary PBG/ALA during the attack (Watson–Schwartz).",
    },
  },
  {
    id: "wilsons",
    chip: "Wilson's vs Psychiatric",
    vignette:
      "19-year-old man, six months of personality change, irritability and a fine tremor, dismissed as a psychiatric breakdown. Exam notes mild jaundice and brown-green rings at the edge of both corneas.",
    highlight: "brown-green rings at the edge of both corneas",
    generic: {
      dx: "Primary psychiatric disorder",
      confidence: 0.92,
      note: "Sees a young man with personality change and a tremor and reaches for a primary psychiatric label — missing the rings and the liver.",
    },
    psiddx: {
      dx: "Wilson's disease",
      icd10: "E83.01",
      confidence: 0.84,
      explanation:
        "Neuropsychiatric change with a tremor AND Kayser–Fleischer rings in someone under 40 is Wilson's disease until proven otherwise.",
      mustNotMiss:
        "Untreated Wilson's is fatal but treatable — and first-degree relatives must be screened.",
      nextStep: "Serum ceruloplasmin, 24-h urinary copper, slit-lamp exam.",
    },
  },
  {
    id: "pheo",
    chip: "Pheochromocytoma vs Panic",
    vignette:
      "41-year-old woman with recurrent panic attacks — pounding heart, sweating and a sense of doom. During one episode in clinic, her blood pressure spiked to 215/120 and normalised minutes later.",
    highlight: "her blood pressure spiked to 215/120 and normalised minutes later",
    generic: {
      dx: "Panic Disorder",
      confidence: 0.94,
      note: "The palpitations, sweating and dread read as textbook panic — so it stops there, ignoring the paroxysmal blood-pressure spike.",
    },
    psiddx: {
      dx: "Pheochromocytoma",
      icd10: "D35.00",
      confidence: 0.8,
      explanation:
        "Episodic palpitations and sweating with paroxysmal, extreme blood-pressure spikes point to a catecholamine-secreting tumour, not panic.",
      mustNotMiss:
        "Non-selective beta-blockade before alpha-blockade can precipitate a hypertensive crisis.",
      nextStep: "Plasma free metanephrines, then adrenal imaging.",
    },
  },
];

function useTypewriter(text: string, speed: number, start: boolean) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!start) {
      setOut("");
      return;
    }
    let i = 0;
    setOut("");
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, start]);
  return out;
}

function Caret({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <span className="ml-0.5 inline-block h-[0.95em] w-[2px] -translate-y-[1px] animate-pulse bg-current align-middle" />
  );
}

function Spotlight({ text, phrase }: { text: string; phrase: string }) {
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded-md bg-accent/15 px-1 font-medium text-accent">
        {text.slice(idx, idx + phrase.length)}
      </span>
      {text.slice(idx + phrase.length)}
    </>
  );
}

export default function DemoPage() {
  const [caseIdx, setCaseIdx] = useState(0);
  const c = CASES[caseIdx];
  const [vignette, setVignette] = useState(c.vignette);
  const [phase, setPhase] = useState<"idle" | "loading" | "revealed">("idle");
  const [rightOn, setRightOn] = useState(false);
  const [climax, setClimax] = useState(false);

  function selectCase(i: number) {
    setCaseIdx(i);
    setVignette(CASES[i].vignette);
    setPhase("idle");
  }

  function run() {
    setPhase("loading");
    setTimeout(() => setPhase("revealed"), 750);
  }

  useEffect(() => {
    if (phase !== "revealed") {
      setRightOn(false);
      setClimax(false);
      return;
    }
    const t1 = setTimeout(() => setRightOn(true), 600);
    const t2 = setTimeout(() => setClimax(true), 1750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  const revealed = phase === "revealed";
  const genericDx = useTypewriter(c.generic.dx, 42, revealed);
  const psiddxDx = useTypewriter(c.psiddx.dx, 22, rightOn);
  const psiddxDone = rightOn && psiddxDx.length >= c.psiddx.dx.length;

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="mx-auto max-w-5xl px-6 pb-8 pt-16 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-hair bg-mist/60 px-3.5 py-1.5 text-[12px] font-medium text-subtle">
          <span className="size-1.5 rounded-full bg-good" /> PsiDDx · live demo
        </div>
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[46px]">
          The rare disease hiding
          <br className="hidden sm:block" /> behind a common label.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-subtle">
          A generic model reaches for the obvious answer. PsiDDx catches the
          life-threatening &ldquo;zebra&rdquo; that a single feature gives away.
        </p>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-24">
        {/* case selector */}
        <div className="no-scrollbar -mx-6 mb-5 flex gap-2.5 overflow-x-auto px-6 sm:justify-center">
          {CASES.map((cc, i) => {
            const active = i === caseIdx;
            return (
              <button
                key={cc.id}
                onClick={() => selectCase(i)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-hair bg-canvas text-subtle hover:bg-mist"
                }`}
              >
                {cc.chip}
              </button>
            );
          })}
        </div>

        {/* input */}
        <div className="overflow-hidden rounded-4xl border border-hair bg-canvas shadow-card">
          <div className="p-5 sm:p-6">
            <label className="mb-2 block text-[12px] font-medium uppercase tracking-wide text-subtle">
              Patient presentation
            </label>
            <textarea
              value={vignette}
              onChange={(e) => setVignette(e.target.value)}
              rows={3}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[12px] text-subtle">Decision support — not a diagnosis.</span>
              <button
                onClick={run}
                disabled={phase === "loading"}
                className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white shadow-glow transition hover:opacity-90 disabled:opacity-60"
              >
                {phase === "loading"
                  ? "Analyzing…"
                  : phase === "revealed"
                    ? "Run again"
                    : "Run diagnostic analysis"}
              </button>
            </div>
          </div>
        </div>

        {/* results */}
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 flex items-center justify-center gap-3 rounded-4xl border border-hair bg-mist/40 py-14 text-[14px] text-subtle"
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
              Scanning for the discriminating feature…
            </motion.div>
          )}

          {phase === "revealed" && (
            <motion.div key={"rev-" + c.id} initial="hidden" animate="show" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* generic — muted */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
                  className="rounded-4xl border border-hair bg-mist/50 p-6"
                >
                  <div className="mb-4 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-subtle">
                    <span className="size-1.5 rounded-full bg-subtle" /> Generic LLM
                  </div>
                  <div className="text-[20px] font-semibold text-subtle">
                    {genericDx}
                    <Caret on={revealed && genericDx.length < c.generic.dx.length} />
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between text-[12px] text-subtle">
                      <span>Confidence</span>
                      <span className="tabular-nums">{Math.round(c.generic.confidence * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hair">
                      <motion.div
                        className="h-full rounded-full bg-subtle/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${c.generic.confidence * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
                      />
                    </div>
                  </div>
                  <p className="mt-5 text-[13.5px] leading-relaxed text-subtle">{c.generic.note}</p>
                </motion.div>

                {/* psiddx — crisp, glowing */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: EASE, delay: 0.5 }}
                  className="relative rounded-4xl border border-accent/30 bg-canvas p-6 shadow-glow"
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-accent">
                      <span className="size-1.5 rounded-full bg-accent" /> PsiDDx
                    </div>
                    <AnimatePresence>
                      {rightOn && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 420, damping: 18 }}
                          className="rounded-full bg-warn/12 px-2.5 py-1 text-[11px] font-semibold text-warn"
                        >
                          ⚠ Critical zebra detected
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="text-[20px] font-semibold text-ink">
                    {psiddxDx}
                    <Caret on={rightOn && psiddxDx.length < c.psiddx.dx.length} />
                    {psiddxDone && (
                      <span className="ml-2 rounded-md bg-mist px-1.5 py-0.5 align-middle text-[11px] font-medium text-subtle">
                        {c.psiddx.icd10}
                      </span>
                    )}
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between text-[12px] text-subtle">
                      <span>Confidence</span>
                      <span className="tabular-nums">{Math.round(c.psiddx.confidence * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
                        initial={{ width: 0 }}
                        animate={rightOn ? { width: `${c.psiddx.confidence * 100}%` } : {}}
                        transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
                      />
                    </div>
                  </div>
                  <p className="mt-5 text-[13.5px] leading-relaxed text-ink/80">
                    {c.psiddx.explanation}
                  </p>
                </motion.div>
              </div>

              {/* the discriminator — the climax */}
              <AnimatePresence>
                {climax && (
                  <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="mt-4 rounded-4xl border border-hair bg-canvas p-6 shadow-card"
                  >
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-accent">
                      <span>◆</span> The discriminator
                    </div>
                    <p className="text-[15.5px] leading-relaxed text-ink">
                      <Spotlight text={vignette} phrase={c.highlight} />
                    </p>
                    <p className="mt-4 text-[14px] leading-relaxed text-subtle">
                      <span className="font-medium text-ink">This single feature flips the diagnosis. </span>
                      {c.psiddx.explanation}
                    </p>
                    {c.psiddx.mustNotMiss && (
                      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-warn/10 p-3.5 text-[13px] leading-snug text-ink">
                        <span className="mt-0.5 shrink-0 text-warn">⚠</span>
                        <span>
                          <span className="font-medium">Must not miss — </span>
                          {c.psiddx.mustNotMiss}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 flex items-start gap-2 rounded-2xl bg-mist p-3.5 text-[13px] leading-snug text-subtle">
                      <span className="mt-0.5 shrink-0 text-accent">→</span>
                      <span>
                        <span className="font-medium text-ink">Next step — </span>
                        {c.psiddx.nextStep}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mx-auto max-w-5xl px-6 pb-16 text-center">
        <p className="mx-auto max-w-xl text-[12px] leading-relaxed text-subtle">
          PsiDDx is for research and educational decision support only — not for direct clinical use.
          Demo responses are illustrative; the trained PsiDDx model plugs into this same interface.
        </p>
      </footer>
    </main>
  );
}
