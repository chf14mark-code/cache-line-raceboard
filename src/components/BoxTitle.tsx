import type { ReactNode } from "react";

/** Small uppercase heading used inside lane boxes, with an optional right-hand note. */
export function BoxTitle({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {children}
      </h3>
      {note !== undefined && <span className="truncate font-mono text-[11px] text-muted-foreground">{note}</span>}
    </div>
  );
}
