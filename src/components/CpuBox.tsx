import type { MachineSnapshot, Program } from "@/engine";
import { BoxTitle } from "./BoxTitle";

/** One-line description of what the CPU is doing in this snapshot. */
function cpuStatus(s: MachineSnapshot): string {
  if (s.halted) return s.haltReason === "end-of-program" ? "Finished" : (s.errorMessage ?? "Stopped");
  if (s.inFlight) return s.inFlight.level === "RAM" ? "Stalled: waiting for RAM" : `Reading from ${s.inFlight.level} cache`;
  return s.cycle === 0 ? "Ready" : "Running";
}

/** The CPU: program counter, current instruction, registers R0–R3 and status. */
export function CpuBox({ snapshot, program }: { snapshot: MachineSnapshot; program: Program }) {
  const ins = program[snapshot.pc];
  return (
    <div className="rounded-md border border-border bg-surface-raised p-2">
      <BoxTitle note={cpuStatus(snapshot)}>CPU</BoxTitle>
      <div className="flex items-baseline gap-2 font-mono text-xs">
        <span className="text-muted-foreground">PC</span>
        <span className="w-5 font-semibold tabular-nums text-foreground">{snapshot.pc}</span>
        <span className="truncate text-foreground/80">{snapshot.halted || !ins ? "— end of program —" : ins.text}</span>
      </div>
      <dl className="mt-1 grid grid-cols-4 gap-1 font-mono text-xs">
        {snapshot.registers.map((value, r) => (
          <div key={r} className="flex items-baseline justify-between rounded bg-background/60 px-1.5 py-0.5">
            <dt className="text-muted-foreground">R{r}</dt>
            <dd className="tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
