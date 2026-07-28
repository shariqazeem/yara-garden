"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 pb-24 pt-40">
      {/* soft ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-1/2 h-[560px] w-[880px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#5E5CE6,transparent)] opacity-[0.14] blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-hair bg-mist px-3 py-1 text-[12px] text-subtle"
        >
          <span className="size-1.5 rounded-full bg-good" />
          Psychiatric-enhanced differential diagnosis
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05, ease: EASE }}
          className="text-[44px] font-semibold leading-[1.03] tracking-[-0.03em] sm:text-[66px]"
        >
          Catch what <span className="gradient-text">others miss.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
          className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-subtle sm:text-[21px]"
        >
          Psychiatry is the most misdiagnosed field in medicine — starting with the
          missed highs of bipolar disorder. PsiDDx is a specialized model that flags what
          general AI overlooks, delivered not as a cold chatbot but as a gentle companion
          in a world built for healing.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.27, ease: EASE }}
          className="mt-9 flex items-center justify-center gap-3"
        >
          <a
            href="/village"
            className="rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-white shadow-card transition hover:opacity-90"
          >
            Enter your world →
          </a>
          <a
            href="#demo"
            className="rounded-full border border-hair px-6 py-3 text-[15px] font-medium transition hover:bg-mist"
          >
            See the science
          </a>
        </motion.div>
      </div>

      {/* stat strip */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
        className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-3xl border border-hair bg-hair text-center shadow-card sm:grid-cols-3"
      >
        {[
          ["69%", "of bipolar cases are initially misdiagnosed"],
          ["~6 yrs", "average delay to a correct bipolar diagnosis"],
          ["40%", "of borderline patients mislabeled as bipolar"],
        ].map(([stat, label]) => (
          <div key={stat} className="bg-canvas px-6 py-7">
            <div className="text-[28px] font-semibold tracking-tight">{stat}</div>
            <div className="mt-1 text-[13px] leading-snug text-subtle">{label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
