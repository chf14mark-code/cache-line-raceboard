import { Term } from "./Term";
import { useState, type CSSProperties } from "react";
import { animStyle } from "@/animation/css";
import { ARRIVAL_GLOW_MS } from "@/animation/pacing";
import type { LaneAnimation } from "@/animation/tracker";
import { hexAddress, lineIndexOf } from "@/engine";
import type { LaneView } from "@/lib/race";
import { CELL_STATE_LABEL, cellState, rowMarker } from "@/lib/ram-view";
import { cn } from "@/lib/utils";
import { BoxTitle } from "./BoxTitle";
import { RamCell } from "./RamCell";

/** How many cells of RAM the race view shows (0x00–0x3F). */
const VISIBLE_CELLS = 64;

/**
 * RAM 0x00–0x3F, one row per cache line. Hovering or tapping a cell highlights
 * the cells that share its line.
 */
export function RamGrid({
  view,
  anim,
  speed,
  reduced,
  rowRef,
}: {
  view: LaneView;
  anim: LaneAnimation;
  speed: number;
  reduced: boolean;
  /** Registers each row element so the packet knows where to start. */
  rowRef: (line: number, el: HTMLDivElement | null) => void;
}) {
  const { snapshot } = view;
  const lineSize = snapshot.config.lineSize;
  const rows = VISIBLE_CELLS / lineSize;
  const [pointed, setPointed] = useState<number | null>(null);
  const pointedLine = pointed === null ? null : lineIndexOf(pointed, lineSize);
  const last = anim.lastAccess;
  const f = snapshot.inFlight;

  return (
    <div className="rounded-md border border-border bg-surface-raised p-2" onPointerLeave={() => setPointed(null)}>
      <BoxTitle note={`${snapshot.config.ramLatency} cycles`}>
        <Term k="RAM">RAM</Term> {hexAddress(0)}–{hexAddress(VISIBLE_CELLS - 1)}
      </BoxTitle>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: rows }, (_, line) => {
          const marker = rowMarker(view, last, line);
          const fetching = f !== null && f.lineIndex === line && f.level !== snapshot.levels[0]?.name;
          const arrived = last !== null && last.kind === "miss" && last.line === line;
          return (
            <div key={line} className="relative flex items-center gap-1.5">
              <span className="w-8 font-mono text-[10px] text-muted-foreground">{hexAddress(line * lineSize)}</span>
              <div
                key={arrived ? `arrive-${last.seq}` : "steady"}
                ref={(el) => rowRef(line, el)}
                role="group"
                tabIndex={0}
                aria-label={`Memory line ${line}, cells ${hexAddress(line * lineSize)} to ${hexAddress(line * lineSize + lineSize - 1)}`}
                onFocus={() => setPointed(line * lineSize)}
                onBlur={() => setPointed(null)}
                className={cn(
                  "flex gap-0.5 rounded border border-border/60 p-px",
                  fetching && "border-dashed border-primary",
                  arrived && "ring-1 ring-primary",
                  arrived && !reduced && "anim-line-glow",
                )}
                style={animStyle(ARRIVAL_GLOW_MS, speed) as CSSProperties}
              >
                {Array.from({ length: lineSize }, (_, k) => {
                  const address = line * lineSize + k;
                  const state = cellState(view, address);
                  const value = snapshot.ram[address] ?? 0;
                  return (
                    <RamCell
                      key={k}
                      state={state}
                      value={value}
                      label={`${hexAddress(address)} = ${value}, ${CELL_STATE_LABEL[state]}`}
                      pointed={pointed === address}
                      mate={pointedLine === line && pointed !== address}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse") setPointed(address);
                      }}
                      onClick={() => setPointed((p) => (p === address ? null : address))}
                    />
                  );
                })}
              </div>
              <span className="w-[4.5rem] whitespace-nowrap font-mono text-[10px] text-primary">{marker ? `◀ ${marker}` : ""}</span>
              {pointedLine === line && (
                <span
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute left-9 z-20 whitespace-nowrap rounded border border-border bg-popover px-1.5 py-0.5 text-[10px] text-popover-foreground shadow-lg",
                    line === 0 ? "top-full mt-0.5" : "bottom-full mb-0.5",
                  )}
                >
                  These {lineSize} cells always travel together.
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
