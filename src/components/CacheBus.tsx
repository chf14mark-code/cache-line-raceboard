import type { CSSProperties } from "react";
import { accessDurationMs } from "@/animation/pacing";
import { animStyle } from "@/animation/css";
import type { LaneAnimation } from "@/animation/tracker";
import type { MachineSnapshot } from "@/engine";

/** The wire between CPU and cache. Pulses on every L1 hit; the label says what is happening. */
export function CacheBus({
  snapshot,
  anim,
  speed,
  reduced,
}: {
  snapshot: MachineSnapshot;
  anim: LaneAnimation;
  speed: number;
  reduced: boolean;
}) {
  const f = snapshot.inFlight;
  const first = snapshot.levels[0];
  const hitNow = f !== null && f.level === first?.name;
  const label = f === null ? "" : hitNow ? "⚡ already in the cache (hit)" : `not in the cache (miss) → fetching from ${f.level}`;
  const pulseMs = accessDurationMs(first?.latency ?? 1);

  return (
    <div className="relative flex h-4 items-center pl-8" aria-hidden="true">
      <span className={`absolute inset-y-0 left-4 w-1.5 rounded-sm ${hitNow ? "bg-hit" : "bg-track"}`} />
      {anim.lastHit && !reduced && (
        <span
          key={anim.lastHit.seq}
          className="anim-bus-pulse absolute inset-y-0 left-4 w-1.5 rounded-sm bg-track"
          style={animStyle(pulseMs, speed) as CSSProperties}
        />
      )}
      <span className={`font-mono text-[10px] ${hitNow ? "text-hit" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}
