/**
 * How a RAM cell / RAM row should be labelled, derived only from engine snapshots and events.
 */
import { lineIndexOf } from "@/engine";
import type { LaneView } from "./race";

export type CellState = "just-read" | "in-cache" | "evicted" | "untouched";

/** Human labels for each state (shown in the legend and read by screen readers). */
export const CELL_STATE_LABEL: Record<CellState, string> = {
  untouched: "Untouched",
  "in-cache": "In cache",
  "just-read": "Just read",
  evicted: "Evicted from cache",
};

/** Is memory line `line` currently held by the first cache level? */
export function lineInL1(view: LaneView, line: number): boolean {
  const l1 = view.snapshot.levels[0];
  return l1 !== undefined && l1.lines.some((l) => l.valid && l.tag === line);
}

/** State of the RAM cell at `address`. */
export function cellState(view: LaneView, address: number): CellState {
  if (view.lastAccessAddress === address) return "just-read";
  const line = lineIndexOf(address, view.snapshot.config.lineSize);
  if (lineInL1(view, line)) return "in-cache";
  if (view.loadedLines.has(line)) return "evicted";
  return "untouched";
}

/** Short text next to a RAM row: what is happening to that line right now, if anything. */
export function rowMarker(view: LaneView, line: number): string | null {
  const f = view.snapshot.inFlight;
  if (f && f.lineIndex === line) return f.level === "RAM" ? "fetching" : "cache hit";
  const last = view.lastAccessAddress;
  if (last !== null && lineIndexOf(last, view.snapshot.config.lineSize) === line) return "read";
  return null;
}
