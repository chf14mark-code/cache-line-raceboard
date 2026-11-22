import type { LaneAnimation } from "@/animation/tracker";
import type { MachineSnapshot } from "@/engine";
import { cn } from "@/lib/utils";

/** The Desk (cache): a few slots, each holding one whole box. */
export function Desk({ snapshot, anim }: { snapshot: MachineSnapshot; anim: LaneAnimation }) {
  const l1 = snapshot.levels[0];
  if (!l1) return null;
  const lineSize = snapshot.config.lineSize;
  const last = anim.lastAccess;
  const busy = snapshot.inFlight !== null;
  return (
    <section aria-label="Desk (cache)" className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-foreground">
        Desk <span className="font-normal text-muted-foreground">(cache) · {l1.latency} ticks per read</span>
      </h2>
      <div className="flex flex-col gap-2">
        {l1.lines.map((line, slot) => {
          const justArrived = !busy && last?.kind === "miss" && line.valid && line.tag === last.line;
          const justRead = !busy && last !== null && last.kind !== "miss" && line.valid && line.tag === last.line;
          return (
            <div
              key={justArrived ? `a-${last.seq}` : slot}
              className={cn(
                "rounded-md border-2 p-2",
                justArrived ? "anim-line-glow border-primary" : justRead ? "border-hit" : "border-border",
                !line.valid && "border-dashed",
              )}
            >
              {line.valid ? (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: lineSize }, (_, k) => {
                    const addr = line.tag * lineSize + k;
                    const asked = (justArrived || justRead) && last?.address === addr;
                    const free = anim.freeCells.has(addr);
                    return (
                      <span key={k} className="flex flex-col items-center">
                        <span
                          className={cn(
                            "flex h-8 w-24 items-center justify-center rounded font-mono text-base tabular-nums",
                            asked ? "bg-primary font-bold text-primary-foreground" : "bg-hit/20 text-foreground",
                          )}
                        >
                          {addr}
                        </span>
                        <span className="h-9 w-24 text-center text-sm leading-[18px] text-muted-foreground">
                          {asked ? (justRead ? (last?.kind === "free-ride" ? "free ride!" : "read") : "asked") : justArrived && free ? "came along for free" : ""}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="py-2 text-base text-muted-foreground">Empty slot</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
