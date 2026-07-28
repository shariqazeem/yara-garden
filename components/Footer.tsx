export function Footer() {
  return (
    <footer className="border-t border-hair px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="size-6 rounded-[7px] bg-gradient-to-br from-accent to-accent2" />
              <span className="text-[15px] font-semibold tracking-tight">PsiDDx</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-subtle">
              Psychiatric-enhanced differential diagnosis. Built for the AutoScientist
              Challenge by Adaption Labs.
            </p>
          </div>
          <div className="flex gap-14 text-[13px]">
            <div>
              <div className="mb-3 font-medium text-ink">Project</div>
              <ul className="space-y-2 text-subtle">
                <li><a className="hover:text-ink" href="#demo">Demo</a></li>
                <li><a className="hover:text-ink" href="#why">Why it matters</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 font-medium text-ink">Release</div>
              <ul className="space-y-2 text-subtle">
                <li><span className="opacity-50">HuggingFace (soon)</span></li>
                <li><span className="opacity-50">Kaggle (soon)</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 rounded-2xl bg-mist p-4 text-[12px] leading-relaxed text-subtle">
          <strong className="text-ink">Not medical advice.</strong> PsiDDx is a research
          and educational tool that provides clinical decision support. It does not
          diagnose, and it is not a substitute for evaluation by a licensed clinician.
          If you or someone you know may be at risk of harm, seek emergency care.
        </div>
      </div>
    </footer>
  );
}
