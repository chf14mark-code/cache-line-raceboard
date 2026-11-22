import type { MachineSnapshot } from "@/engine";

/** Total ticks (cycles) so far, plus a plain status line with an icon. */
export function TickCounter({ snapshot }: { snapshot: MachineSnapshot }) {
  const waiting = snapshot.inFlight?.level === "RAM";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-base text-muted-foreground">
        Total time <span className="text-sm">(cycles)</span>
      </p>
      <p className="font-mono text-4xl font-bold tabular-nums text-foreground">
        {snapshot.cycle} <span className="text-lg font-normal text-muted-foreground">ticks</span>
      </p>
      <p className="text-base text-muted-foreground">
        {snapshot.halted ? "✓ Finished" : waiting ? "⏳ CPU waiting for the warehouse…" : snapshot.cycle === 0 ? "Ready" : "▶ Working"}
      </p>
    </div>
  );
}
