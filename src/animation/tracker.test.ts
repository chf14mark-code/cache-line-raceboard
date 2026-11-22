import { describe, expect, it } from "vitest";
import { Machine, PROGRAM_A, PROGRAM_B, simpleConfig } from "@/engine";
import { AnimationTracker } from "./tracker";

/** Step a machine until `n` LOADs have finished, feeding every event to the tracker. */
function runLoads(program: typeof PROGRAM_A, n: number) {
  const m = new Machine(program.program, simpleConfig());
  const t = new AnimationTracker();
  let done = 0;
  while (done < n) {
    const r = m.stepCycle();
    t.absorb(r.events, 4);
    if (r.events.some((e) => e.kind === "memory-wait-end")) done += 1;
  }
  return t.view();
}

describe("animation marks from engine events", () => {
  it("a miss brings the 3 neighbouring cells along for free", () => {
    const v = runLoads(PROGRAM_A, 1);
    expect(v.lastAccess?.kind).toBe("miss");
    expect([...v.freeCells].sort()).toEqual([1, 2, 3]);
  });

  it("reading a cell that came along is a free ride", () => {
    const v = runLoads(PROGRAM_A, 2);
    expect(v.lastAccess).toMatchObject({ kind: "free-ride", address: 1 });
    expect(v.freeCells.has(1)).toBe(false);
  });

  it("evicting the LRU line removes its free cells", () => {
    const v = runLoads(PROGRAM_B, 5); // 5th miss evicts line 0 from a 4-line L1
    expect(v.lastEviction?.line).toBe(0);
    expect(v.freeCells.has(1)).toBe(false);
    expect(v.freeCells.has(17)).toBe(true);
  });
});
