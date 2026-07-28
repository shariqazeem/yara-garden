import { Reveal } from "./Reveal";

const POINTS = [
  {
    k: "The problem",
    t: "Missed, not rare",
    d: "Bipolar, PTSD and borderline personality disorder hide behind depression and anxiety. The result is years of the wrong treatment — sometimes the harmful one.",
  },
  {
    k: "The approach",
    t: "Small model, deep focus",
    d: "Instead of a giant generalist, PsiDDx is a compact model trained on the differentials clinicians actually confuse, grounded in DSM-5-TR logic.",
  },
  {
    k: "The guardrail",
    t: "Support, never a verdict",
    d: "PsiDDx surfaces what to consider and what to ask next. It points people toward the right clinician faster — it never replaces one.",
  },
];

export function Why() {
  return (
    <section id="why" className="bg-mist px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mb-12 max-w-xl">
          <h2 className="text-[32px] font-semibold tracking-[-0.02em] sm:text-[40px]">
            Why a specialist beats a generalist.
          </h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-3">
          {POINTS.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.08}>
              <div className="h-full rounded-3xl border border-hair bg-canvas p-6 shadow-card">
                <div className="text-[12px] font-medium uppercase tracking-wide text-accent">
                  {p.k}
                </div>
                <h3 className="mt-2 text-[19px] font-semibold tracking-tight">{p.t}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-subtle">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
