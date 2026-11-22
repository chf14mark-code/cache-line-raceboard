import { CELL_STATE_LABEL, type CellState } from "@/lib/ram-view";
import { cn } from "@/lib/utils";
import { CELL_STYLE } from "./RamCell";

const ORDER: CellState[] = ["untouched", "in-cache", "just-read", "evicted"];

/** Text legend for RAM cell states, so the colors are never the only clue. */
export function RamLegend({ className }: { className?: string }) {
  return (
    <ul aria-label="RAM cell legend: what each cell style means" className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] text-muted-foreground", className)}>
      {ORDER.map((state) => (
        <li key={state} className="flex items-center gap-1">
          <span aria-hidden="true" className={`h-3 w-4 rounded-sm border ${CELL_STYLE[state]}`} />
          {CELL_STATE_LABEL[state]}
        </li>
      ))}
    </ul>
  );
}
