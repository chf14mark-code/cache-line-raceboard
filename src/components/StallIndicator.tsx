import { CircleCheck, Cpu, Hourglass, Pause } from "lucide-react";
import type { MachineSnapshot } from "@/engine";

/** Lane footer status: icon + text, so the stalled state never depends on color alone. */
export function StallIndicator({ snapshot }: { snapshot: MachineSnapshot }) {
  const f = snapshot.inFlight;
  if (snapshot.halted) {
    return (
      <p className="flex items-center gap-1.5 font-mono text-xs text-hit">
        <CircleCheck className="h-4 w-4" aria-hidden="true" />
        Finished
      </p>
    );
  }
  if (f) {
    return (
      <p className="flex items-center gap-1.5 font-mono text-xs text-foreground">
        <span className="flex items-center gap-1 rounded border border-miss px-1 py-px text-[10px] font-semibold uppercase tracking-wider text-miss">
          <Hourglass className="h-3 w-3 motion-safe:animate-pulse" aria-hidden="true" />
          Stalled
        </span>
        CPU waiting… for {f.level} ({f.elapsed}/{f.latency})
      </p>
    );
  }
  if (snapshot.cycle === 0) {
    return (
      <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Pause className="h-4 w-4" aria-hidden="true" />
        Ready
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
      <Cpu className="h-4 w-4" aria-hidden="true" />
      CPU working
    </p>
  );
}
