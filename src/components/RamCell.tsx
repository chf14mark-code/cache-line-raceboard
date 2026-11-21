import type { CellState } from "@/lib/ram-view";

/** Border + fill per state. Each state also differs in pattern (dashed / solid / hatched / filled). */
export const CELL_STYLE: Record<CellState, string> = {
  untouched: "border-dashed border-border text-muted-foreground/70",
  "in-cache": "border-accent bg-accent/15 text-foreground",
  evicted: "border-border bg-hatch text-muted-foreground",
  "just-read": "border-primary bg-primary font-bold text-primary-foreground",
};

/** One RAM cell showing its value. */
export function RamCell({ state, value, label }: { state: CellState; value: number; label?: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex h-4 w-8 items-center justify-center rounded-sm border font-mono text-[10px] tabular-nums ${CELL_STYLE[state]}`}
    >
      {value}
    </span>
  );
}
