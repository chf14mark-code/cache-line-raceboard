import { hexAddress } from "@/engine";
import type { LaneView } from "@/lib/race";
import { CELL_STATE_LABEL, cellState, rowMarker } from "@/lib/ram-view";
import { BoxTitle } from "./BoxTitle";
import { RamCell } from "./RamCell";

/** How many cells of RAM the race view shows (0x00–0x3F). */
const VISIBLE_CELLS = 64;

/** RAM 0x00–0x3F, one row per cache line, each cell labelled by its cache state. */
export function RamGrid({ view }: { view: LaneView }) {
  const { snapshot } = view;
  const lineSize = snapshot.config.lineSize;
  const rows = VISIBLE_CELLS / lineSize;

  return (
    <div className="rounded-md border border-border bg-surface-raised p-2">
      <BoxTitle note={`${snapshot.config.ramLatency} cycles`}>
        RAM {hexAddress(0)}–{hexAddress(VISIBLE_CELLS - 1)}
      </BoxTitle>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: rows }, (_, line) => {
          const marker = rowMarker(view, line);
          return (
            <div key={line} className="flex items-center gap-1.5">
              <span className="w-8 font-mono text-[10px] text-muted-foreground">{hexAddress(line * lineSize)}</span>
              <div className="flex gap-0.5 rounded border border-border/60 p-px" role="group" aria-label={`Memory line ${line}`}>
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
                    />
                  );
                })}
              </div>
              <span className="w-16 font-mono text-[10px] text-primary">{marker ? `◀ ${marker}` : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
