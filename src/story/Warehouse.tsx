import type { LaneAnimation } from "@/animation/tracker";
import { type MachineSnapshot } from "@/engine";
import { cn } from "@/lib/utils";

const VISIBLE_CELLS = 64;

/** The Warehouse (RAM): 16 boxes of 4 cells. The box being fetched or just arrived is marked with text too. */
export function Warehouse({ snapshot, anim }: { snapshot: MachineSnapshot; anim: LaneAnimation }) {
  const lineSize = snapshot.config.lineSize;
  const rows = VISIBLE_CELLS / lineSize;
  const desk = new Set((snapshot.levels[0]?.lines ?? []).filter((l) => l.valid).map((l) => l.tag));
  const f = snapshot.inFlight;
  const last = anim.lastAccess;
  return (
    <section aria-label="Warehouse (RAM)" className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-foreground">
        Warehouse <span className="font-normal text-muted-foreground">(RAM) · {snapshot.config.ramLatency} ticks per trip</span>
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {Array.from({ length: rows }, (_, line) => {
          const fetching = f !== null && f.level !== "L1" && f.lineIndex === line;
          const arrived = last?.kind === "miss" && last.line === line && !f;
          const onDesk = desk.has(line);
          return (
            <div
              key={arrived ? `a-${last.seq}` : line}
              className={cn(
                "flex items-center gap-1 rounded-md border-2 p-1",
                fetching ? "border-miss bg-miss/10" : arrived ? "anim-line-glow border-primary" : "border-border",
              )}
            >
              {Array.from({ length: lineSize }, (_, k) => {
                const addr = line * lineSize + k;
                const wanted = (f?.address ?? last?.address) === addr && (fetching || arrived);
                return (
                  <span
                    key={k}
                    className={cn(
                      "flex h-7 w-9 items-center justify-center rounded font-mono text-base tabular-nums",
                      wanted ? "bg-primary font-bold text-primary-foreground" : onDesk ? "bg-hit/20 text-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {addr}
                  </span>
                );
              })}
              <span className="ml-1 w-20 text-sm text-muted-foreground">
                {fetching ? "⏳ fetching" : onDesk ? "✓ on desk" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
