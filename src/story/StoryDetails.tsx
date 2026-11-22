import { CpuBox } from "@/components/CpuBox";
import { ProgramListing } from "@/components/ProgramListing";
import type { MachineSnapshot, Program } from "@/engine";

export const STORY_SPEEDS = [0.25, 0.5, 1, 2, 5, 10] as const;

/** Everything technical, hidden behind "Show details". */
export function StoryDetails({
  snapshot,
  program,
  speed,
  onSpeed,
}: {
  snapshot: MachineSnapshot;
  program: Program;
  speed: number;
  onSpeed: (s: number) => void;
}) {
  const l1 = snapshot.metrics.levels.L1 ?? { hits: 0, misses: 0 };
  const reads = l1.hits + l1.misses;
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-3">
      <div className="space-y-2">
        <CpuBox snapshot={snapshot} program={program} />
        <p className="text-base text-foreground">
          Desk hits: {l1.hits} · trips to warehouse (misses): {l1.misses}
          {reads > 0 && <> · hit rate {Math.round((l1.hits / reads) * 100)}%</>}
        </p>
        <div role="group" aria-label="Speed" className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-base text-muted-foreground">Speed</span>
          {STORY_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === speed}
              onClick={() => onSpeed(s)}
              className={`rounded px-2 py-1 font-mono text-sm ${s === speed ? "bg-primary/20 font-semibold text-primary ring-1 ring-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <ProgramListing id="story-program" program={program} snapshot={snapshot} differs={new Set()} />
      </div>
    </div>
  );
}
