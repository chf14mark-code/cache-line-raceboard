import { Term } from "./Term";
import type { MachineSnapshot } from "@/engine";

/** This lane's clock: cycles used so far, plus a "finished" mark once the program ends. */
export function CycleCounter({ snapshot }: { snapshot: MachineSnapshot }) {
  return (
    <div className="text-right" aria-live="off">
      <div className="flex items-baseline justify-end gap-1.5">
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{snapshot.cycle}</span>
        <span className="font-mono text-xs text-muted-foreground"><Term k="cycle">cycles</Term></span>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {snapshot.halted ? <span className="text-hit">✓ finished</span> : snapshot.cycle === 0 ? "at the start" : "running…"}
      </p>
    </div>
  );
}
