import { Term } from "./Term";
import type { Ref } from "react";
import { cacheCaption } from "@/animation/captions";
import type { LaneAnimation } from "@/animation/tracker";
import type { LaneView } from "@/lib/race";
import { BoxTitle } from "./BoxTitle";
import { CacheRow } from "./CacheRow";

/** The L1 cache: one row per slot, plus a sentence explaining the latest access. */
export function CacheBox({
  view,
  anim,
  speed,
  reduced,
  targetRef,
}: {
  view: LaneView;
  anim: LaneAnimation;
  speed: number;
  reduced: boolean;
  /** Where arriving line packets fly to. */
  targetRef: Ref<HTMLDivElement>;
}) {
  const { snapshot } = view;
  const l1 = snapshot.levels[0];
  if (!l1) return null;
  const last = anim.lastAccess;
  const ev = anim.lastEviction && last && anim.lastEviction.cycle === last.cycle ? anim.lastEviction : null;

  return (
    <div className="rounded-md border border-border bg-surface-raised p-2">
      <BoxTitle note={`${l1.capacity} groups · ${l1.latency} cycles`}>
        <Term k="cache">Cache</Term> (small, fast)
      </BoxTitle>
      <div ref={targetRef} role="table" aria-label={`${l1.name} cache contents`} className="flex flex-col gap-0.5 font-mono text-[11px]">
        {l1.lines.map((line, slot) => (
          <CacheRow
            key={slot}
            slot={slot}
            line={line}
            lineSize={snapshot.config.lineSize}
            ram={snapshot.ram}
            last={last}
            freeCells={anim.freeCells}
            eviction={ev && ev.slot === slot ? ev : null}
            hitLatency={l1.latency}
            speed={speed}
            reduced={reduced}
          />
        ))}
      </div>
      <p className="mt-1 min-h-8 text-[11px] leading-snug text-muted-foreground">{cacheCaption(snapshot, anim)}</p>
    </div>
  );
}
