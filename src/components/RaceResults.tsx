import type { ReferenceProgram } from "@/engine";
import type { RaceStatus } from "@/hooks/use-race";
import type { LaneView } from "@/lib/race";
import { LaneBadge } from "./LaneBadge";

interface Lane {
  program: ReferenceProgram;
  tone: "a" | "b";
  view: LaneView;
}

/** L1 hit/miss counters of a lane (0/0 if the level is missing). */
function l1(view: LaneView) {
  return view.snapshot.metrics.levels.L1 ?? { hits: 0, misses: 0 };
}

/** Headline sentence(s) for the race so far, built from the snapshots. */
function verdict(a: Lane, b: Lane, status: RaceStatus): { title: string; detail: string } {
  const ca = a.view.snapshot.cycle;
  const cb = b.view.snapshot.cycle;
  const doneA = a.view.snapshot.halted;
  const doneB = b.view.snapshot.halted;

  if (doneA && doneB) {
    if (ca === cb) return { title: `A tie: both took ${ca} cycles.`, detail: "" };
    const [fast, slow] = ca < cb ? [a, b] : [b, a];
    const fc = fast.view.snapshot.cycle;
    const sc = slow.view.snapshot.cycle;
    const lineSize = fast.view.snapshot.config.lineSize;
    const reads = (l: Lane) => `${l1(l.view).hits} of ${l1(l.view).hits + l1(l.view).misses}`;
    return {
      title: `${fast.program.name} wins: ${fc} vs ${sc} cycles — ${(sc / fc).toFixed(1)}× faster.`,
      detail: `Every trip to RAM brings back a whole ${lineSize}-cell line. ${a.program.name} found ${reads(a)} reads already in the cache; ${b.program.name} found ${reads(b)}.`,
    };
  }
  if (doneA || doneB) {
    const [done, other] = doneA ? [a, b] : [b, a];
    return {
      title: `${done.program.name} finished at ${done.view.snapshot.cycle} cycles.`,
      detail: `${other.program.name} is still going — watch its "waiting for memory" bar.`,
    };
  }
  if (status === "ready") {
    return {
      title: "Press Start race.",
      detail: "Both programs run on the same clock, so their cycle counts can be compared directly.",
    };
  }
  return { title: "Racing…", detail: 'Watch the "waiting for memory" bars: that is where the time goes.' };
}

/** One lane's numbers: cycles, share of time waiting for memory, cache hits and misses. */
function LaneStats({ lane }: { lane: Lane }) {
  const m = lane.view.snapshot.metrics;
  const c = l1(lane.view);
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2">
      <LaneBadge letter={lane.program.id} tone={lane.tone} />
      <dl className="grid grid-cols-3 gap-x-4 font-mono">
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Cycles</dt>
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Waiting</dt>
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Hits / misses</dt>
        <dd className="text-base font-semibold tabular-nums text-foreground">{m.totalCycles}</dd>
        <dd className="text-base font-semibold tabular-nums text-foreground">{Math.round(m.waitPercent)}%</dd>
        <dd className="text-base font-semibold tabular-nums text-foreground">
          {c.hits} / {c.misses}
        </dd>
      </dl>
      <span className="sr-only">
        {lane.program.name}: {m.totalCycles} cycles, {Math.round(m.waitPercent)}% waiting for memory, {c.hits} cache hits, {c.misses} misses.
      </span>
    </div>
  );
}

/** Results strip: the verdict sentence plus each lane's numbers. */
export function RaceResults({ a, b, status }: { a: Lane; b: Lane; status: RaceStatus }) {
  const v = verdict(a, b, status);
  return (
    <section aria-label="Results" className="grid gap-3 rounded-lg border border-border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
      <div aria-live="polite" className="min-w-0">
        <p className="font-semibold text-foreground">{v.title}</p>
        {v.detail && <p className="text-sm text-muted-foreground">{v.detail}</p>}
      </div>
      <LaneStats lane={a} />
      <LaneStats lane={b} />
    </section>
  );
}
