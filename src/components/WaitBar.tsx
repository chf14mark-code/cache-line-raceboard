import type { MachineSnapshot } from "@/engine";

/** "Waiting for memory" bar: fills while the current LOAD/STORE is in flight. */
export function WaitBar({ snapshot }: { snapshot: MachineSnapshot }) {
  const f = snapshot.inFlight;
  const percent = f ? (f.elapsed / f.latency) * 100 : 0;
  const source = f ? (f.level === "RAM" ? "RAM" : `${f.level} cache`) : null;
  const label = f ? `Waiting for ${source}: ${f.elapsed} / ${f.latency} cycles` : "Not waiting for memory";
  const fill = f?.level === "RAM" ? "bg-miss" : "bg-hit";

  return (
    <div className="rounded-md border border-border bg-surface-raised p-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[11px]">
        <span className={`truncate ${f ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
        <span className="shrink-0 whitespace-nowrap text-muted-foreground">total {snapshot.metrics.memoryWaitCycles}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Waiting for memory"
        aria-valuemin={0}
        aria-valuemax={f?.latency ?? 0}
        aria-valuenow={f?.elapsed ?? 0}
        aria-valuetext={label}
        className="h-2.5 overflow-hidden rounded-sm bg-track"
      >
        <div className={`h-full ${fill}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
