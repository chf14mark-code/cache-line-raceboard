import { useLayoutEffect, useRef, type RefObject } from "react";
import type { MachineSnapshot } from "@/engine";

/**
 * A whole cache line travelling from its RAM row up to the cache during a miss.
 * Its position is the engine's own progress (elapsed / latency of the access),
 * so it moves exactly as fast as the cycle counter.
 */
export function LinePacket({
  snapshot,
  containerRef,
  targetRef,
  getRowEl,
}: {
  snapshot: MachineSnapshot;
  containerRef: RefObject<HTMLDivElement | null>;
  targetRef: RefObject<HTMLDivElement | null>;
  getRowEl: (line: number) => HTMLElement | null;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const f = snapshot.inFlight;
  const active = f !== null && f.level !== snapshot.levels[0]?.name;

  useLayoutEffect(() => {
    const el = elRef.current;
    const box = containerRef.current;
    const target = targetRef.current;
    if (!el || !box || !target || !f || !active) return;
    const from = getRowEl(f.lineIndex)?.getBoundingClientRect();
    if (!from) return;
    const base = box.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const p = Math.min(1, f.elapsed / f.latency);
    const x0 = from.left - base.left;
    const y0 = from.top - base.top;
    const x1 = to.left + to.width / 2 - el.offsetWidth / 2 - base.left;
    const y1 = to.top + to.height / 2 - el.offsetHeight / 2 - base.top;
    el.style.transform = `translate(${x0 + (x1 - x0) * p}px, ${y0 + (y1 - y0) * p}px)`;
    el.style.opacity = "1";
  });

  if (!active || !f) return null;
  const lineSize = snapshot.config.lineSize;
  const start = f.lineIndex * lineSize;

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-30 opacity-0"
    >
      <div className="mb-0.5 whitespace-nowrap font-mono text-[9px] text-primary">line {f.lineIndex} · {lineSize} cells</div>
      <div className="flex gap-0.5 rounded border-2 border-primary bg-card p-px shadow-[0_0_14px_2px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
        {Array.from({ length: lineSize }, (_, k) => (
          <span key={k} className="flex h-4 w-8 items-center justify-center rounded-sm bg-primary/25 font-mono text-[10px] font-semibold tabular-nums text-foreground">
            {snapshot.ram[start + k]}
          </span>
        ))}
      </div>
    </div>
  );
}
