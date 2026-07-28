export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="glass border-b border-hair/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="size-6 rounded-[7px] bg-gradient-to-br from-accent to-accent2 shadow-sm" />
            <span className="text-[15px] font-semibold tracking-tight">PsiDDx</span>
          </a>
          <nav className="flex items-center gap-6 text-[13px] text-subtle">
            <a href="#demo" className="hidden transition-colors hover:text-ink sm:inline">
              Demo
            </a>
            <a href="#why" className="hidden transition-colors hover:text-ink sm:inline">
              Why it matters
            </a>
            <a
              href="#demo"
              className="rounded-full bg-ink px-4 py-1.5 font-medium text-white transition hover:opacity-90"
            >
              Try it
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
