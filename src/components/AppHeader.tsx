import { CacheLineLogo } from "./CacheLineLogo";

/** Top bar: title and the hook question the race answers. */
export function AppHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 sm:px-6">
      <CacheLineLogo className="h-5 w-16 shrink-0 text-primary" />
      <div className="min-w-0">
        <h1 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">The Cache Line</h1>
        <p className="text-base font-semibold text-foreground sm:text-lg">
          Two programs add up the same 16 numbers. One reads memory in order, the other jumps around.
          Which one wins — and by how much?
        </p>
      </div>
    </header>
  );
}
