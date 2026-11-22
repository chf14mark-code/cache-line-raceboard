import { useCallback, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LaneAnimation } from "@/animation/tracker";
import type { ReferenceProgram } from "@/engine";
import type { LaneView } from "@/lib/race";
import { CacheBox } from "./CacheBox";
import { CacheBus } from "./CacheBus";
import { CpuBox } from "./CpuBox";
import { CycleCounter } from "./CycleCounter";
import { LaneBadge } from "./LaneBadge";
import { LinePacket } from "./LinePacket";
import { ProgramListing } from "./ProgramListing";
import { RamGrid } from "./RamGrid";
import { RamLegend } from "./RamLegend";
import { StallIndicator } from "./StallIndicator";
import { WaitBar } from "./WaitBar";

/** One race lane: a complete machine (CPU, L1 cache, RAM) running one program. */
export function RaceLane({
  lane,
  tone,
  summary,
  view,
  anim,
  speed,
  reduced,
  differs,
}: {
  lane: ReferenceProgram;
  tone: "a" | "b";
  summary: string;
  view: LaneView;
  anim: LaneAnimation;
  speed: number;
  reduced: boolean;
  differs: ReadonlySet<number>;
}) {
  const headingId = `lane-${lane.id}-title`;
  const listingId = `lane-${lane.id}-program`;
  const [showProgram, setShowProgram] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<HTMLDivElement>(null);
  const rowEls = useRef(new Map<number, HTMLElement>());
  const setRowEl = useCallback((line: number, el: HTMLDivElement | null) => {
    if (el) rowEls.current.set(line, el);
    else rowEls.current.delete(line);
  }, []);
  const getRowEl = useCallback((line: number) => rowEls.current.get(line) ?? null, []);

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

      <div ref={bodyRef} className="relative grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-1">
          <CpuBox snapshot={view.snapshot} program={lane.program} />
          <CacheBus snapshot={view.snapshot} anim={anim} speed={speed} reduced={reduced} />
          <CacheBox view={view} anim={anim} speed={speed} reduced={reduced} targetRef={cacheRef} />
          <WaitBar snapshot={view.snapshot} />
          <RamLegend className="mt-auto pt-1" />
        </div>
        <RamGrid view={view} anim={anim} speed={speed} reduced={reduced} rowRef={setRowEl} />
        {!reduced && <LinePacket snapshot={view.snapshot} containerRef={bodyRef} targetRef={cacheRef} getRowEl={getRowEl} />}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <StallIndicator snapshot={view.snapshot} />
        <button
          type="button"
          aria-expanded={showProgram}
          aria-controls={listingId}
          onClick={() => setShowProgram((v) => !v)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          {showProgram ? "Hide the program" : `Show the program (${lane.program.length} lines)`}
          <ChevronDown className={`h-3.5 w-3.5 ${showProgram ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </footer>
      {showProgram && <ProgramListing id={listingId} program={lane.program} snapshot={view.snapshot} differs={differs} />}
    </section>
  );
}
