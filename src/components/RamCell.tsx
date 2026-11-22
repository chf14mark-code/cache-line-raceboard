import type { HTMLAttributes } from "react";
import type { CellState } from "@/lib/ram-view";
import { cn } from "@/lib/utils";

/** Border + fill per state. Each state also differs in pattern (dashed / solid / hatched / filled). */
export const CELL_STYLE: Record<CellState, string> = {
  untouched: "border-dashed border-border text-muted-foreground/70",
  "in-cache": "border-accent bg-accent/15 text-foreground",
  evicted: "border-border bg-hatch text-muted-foreground",
  "just-read": "border-primary bg-primary font-bold text-primary-foreground",
};

/** One RAM cell showing its value. `mate` = same line as the hovered cell. */
export function RamCell({
  state,
  value,
  label,
  mate = false,
  pointed = false,
  className,
  ...rest
}: {
  state: CellState;
  value: number;
  label?: string;
  mate?: boolean;
  pointed?: boolean;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "flex h-4 w-8 cursor-pointer items-center justify-center rounded-sm border font-mono text-[10px] tabular-nums",
        CELL_STYLE[state],
        mate && "ring-1 ring-foreground/70",
        pointed && "ring-2 ring-foreground",
        className,
      )}
      {...rest}
    >
      {value}
    </span>
  );
}
