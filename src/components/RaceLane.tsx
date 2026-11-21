import type { ReferenceProgram } from "@/engine";
import type { LaneView } from "@/lib/race";
import { CacheBox } from "./CacheBox";
import { CpuBox } from "./CpuBox";
import { CycleCounter } from "./CycleCounter";
import { LaneBadge } from "./LaneBadge";
import { ProgramListing } from "./ProgramListing";
import { RamGrid } from "./RamGrid";
import { WaitBar } from "./WaitBar";

/** One race lane: a complete machine (CPU, L1 cache, RAM) running one program. */
export function RaceLane({
  lane,
  tone,
  summary,
  view,
  differs,
}: {
  lane: ReferenceProgram;
  tone: "a" | "b";
  summary: string;
  view: LaneView;
  differs: ReadonlySet<number>;
}) {
  const headingId = `lane-${lane.id}-title`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <header className="flex items-center gap-3">
        <LaneBadge letter={lane.id} tone={tone} />
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-sm font-semibold text-foreground">
            <span className="sr-only">Lane {lane.id}: </span>
            {lane.name}
          </h2>
          <p className="truncate font-mono text-xs text-muted-foreground">{summary}</p>
        </div>
        <CycleCounter snapshot={view.snapshot} />
      </header>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-2">
          <CpuBox snapshot={view.snapshot} program={lane.program} />
          <CacheBox view={view} />
          <WaitBar snapshot={view.snapshot} />
        </div>
        <RamGrid view={view} />
      </div>

      <ProgramListing program={lane.program} snapshot={view.snapshot} differs={differs} />
    </section>
  );
}
