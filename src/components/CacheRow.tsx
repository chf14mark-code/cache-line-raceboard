import type { CSSProperties } from "react";
import { animStyle } from "@/animation/css";
import { ARRIVAL_GLOW_MS, EVICTION_MS, accessDurationMs } from "@/animation/pacing";
import type { AccessMark, SlotMark } from "@/animation/tracker";
import type { CacheLineState } from "@/engine";
import { cn } from "@/lib/utils";

/** Column layout shared by the cache rows and the eviction ghost. */
export const CACHE_ROW_GRID = "grid grid-cols-[1.25rem_2.5rem_2.75rem_minmax(0,1fr)_3.5rem] items-center gap-1";

interface Tag {
  start: number;
  span: number;
  text: string;
  tone: string;
}

/** Second-line labels under the cells: "asked for", "free ride", and runs of cells that came along for free. */
function cellTags(free: boolean[], asked: number | null, hit: number | null, freeRide: boolean): Tag[] {
  const tags: Tag[] = [];
  if (asked !== null) tags.push({ start: asked, span: 1, text: "asked", tone: "text-primary" });
  if (hit !== null) tags.push({ start: hit, span: 1, text: freeRide ? "free ride!" : "hit", tone: "font-semibold text-hit" });
  let i = 0;
  while (i < free.length) {
    if (!free[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < free.length && free[j]) j++;
    const span = j - i;
    tags.push({ start: i, span, text: span >= 3 ? "came along for free" : "free", tone: "text-accent" });
    i = j;
  }
  return tags;
}

/** One L1 slot: valid bit, tag, the line's cells (with tags) and a note. */
export function CacheRow({
  slot,
  line,
  lineSize,
  ram,
  last,
  freeCells,
  eviction,
  hitLatency,
  speed,
  reduced,
}: {
  slot: number;
  line: CacheLineState;
  lineSize: number;
  ram: readonly number[];
  last: AccessMark | null;
  freeCells: ReadonlySet<number>;
  /** Set when this slot's previous line was evicted by the latest access. */
  eviction: SlotMark | null;
  hitLatency: number;
  speed: number;
  reduced: boolean;
}) {
  const first = line.tag * lineSize;
  const isLast = line.valid && last !== null && last.line === line.tag;
  const arrived = isLast && last.kind === "miss";
  const used = isLast && last.kind !== "miss";
  const offset = last ? last.address - first : -1;
  const free = Array.from({ length: lineSize }, (_, k) => line.valid && freeCells.has(first + k));
  const tags = line.valid ? cellTags(free, arrived ? offset : null, used ? offset : null, used && last.kind === "free-ride") : [];
  const cols = { gridTemplateColumns: `repeat(${lineSize}, minmax(0, 1fr))` };

  return (
    <div role="row" className={cn("relative", CACHE_ROW_GRID, line.valid ? "text-foreground" : "text-muted-foreground")}>
      <span role="cell" className="text-muted-foreground">#{slot}</span>
      <span role="cell">{line.valid ? "valid" : "empty"}</span>
      <span role="cell" className="whitespace-nowrap">{line.valid ? `tag ${line.tag}` : "—"}</span>
      <div role="cell" className="min-w-0">
        <div
          key={arrived ? `arrive-${last.seq}` : "steady"}
          className={cn("grid gap-x-0.5 rounded-sm", arrived && "ring-1 ring-primary", arrived && !reduced && "anim-line-glow")}
          style={{ ...cols, ...(animStyle(ARRIVAL_GLOW_MS, speed) as CSSProperties) }}
        >
          {Array.from({ length: lineSize }, (_, k) => {
            const isHit = used && k === offset;
            return (
              <span
                key={isHit ? `hit-${last.seq}` : k}
                style={{ gridRow: 1, gridColumn: k + 1, ...(animStyle(accessDurationMs(hitLatency), speed) as CSSProperties) }}
                className={cn(
                  "flex h-4 items-center justify-center rounded-sm border tabular-nums",
                  line.valid ? "border-accent bg-accent/15" : "border-dashed border-border",
                  isHit && "border-hit ring-1 ring-hit",
                  isHit && !reduced && "anim-cell-flash",
                )}
              >
                {line.valid ? ram[first + k] : "·"}
              </span>
            );
          })}
          {tags.map((t) => (
            <span
              key={`${t.text}-${t.start}`}
              style={{ gridRow: 2, gridColumn: `${t.start + 1} / span ${t.span}` }}
              className={cn("h-3 whitespace-nowrap text-center font-sans text-[9px] leading-3", t.tone)}
            >
              {t.text}
            </span>
          ))}
          {tags.length === 0 && <span style={{ gridRow: 2 }} className="h-3" aria-hidden="true" />}
        </div>
      </div>
      <span role="cell" className="whitespace-nowrap text-primary">{arrived ? "◀ new" : used ? "◀ used" : ""}</span>

      {eviction && !reduced && (
        <div
          key={eviction.seq}
          aria-hidden="true"
          className={cn("anim-evict-out pointer-events-none absolute inset-0 z-10 rounded-sm bg-surface-raised text-muted-foreground", CACHE_ROW_GRID)}
          style={animStyle(EVICTION_MS, speed) as CSSProperties}
        >
          <span>#{slot}</span>
          <span className="text-miss">out</span>
          <span className="whitespace-nowrap">tag {eviction.line}</span>
          <div className="grid gap-x-0.5" style={cols}>
            {Array.from({ length: lineSize }, (_, k) => (
              <span key={k} className="flex h-4 items-center justify-center rounded-sm border border-border bg-hatch tabular-nums">
                {ram[eviction.line * lineSize + k]}
              </span>
            ))}
          </div>
          <span className="whitespace-nowrap text-miss">LRU ▶</span>
        </div>
      )}
    </div>
  );
}
