import { CacheLineLogo } from "./CacheLineLogo";

/** Top bar: title, one-line hook, and the (not yet active) tier switches. */
export function AppHeader() {
  return (
    <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <CacheLineLogo className="mt-1 h-5 w-16 shrink-0 text-primary" />
        <div>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            The Cache Line
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your CPU never reads one byte. It grabs a whole row. See why that makes some programs
            several times faster.
          </p>
        </div>
      </div>

      <nav aria-label="Views" className="flex gap-2">
        <TierButton label="Race" active />
        <TierButton label="Deep Dive" />
        <TierButton label="Sandbox" />
      </nav>
    </header>
  );
}

/** Tier switch placeholder. Only "Race" exists for now; the others are marked as coming soon. */
function TierButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={!active}
      title={active ? undefined : "Coming soon"}
      className={
        active
          ? "rounded-md border border-primary bg-primary/15 px-3 py-1.5 font-mono text-xs font-medium text-primary"
          : "cursor-not-allowed rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-muted-foreground opacity-70"
      }
    >
      {label}
      {!active && <span className="sr-only"> (coming soon)</span>}
    </button>
  );
}
