import { describe, expect, it } from "vitest";
import { Machine, PROGRAM_B, simpleConfig } from "@/engine";
import { accessDurationMs, classifyCycle, sharedCycleMs } from "./pacing";

describe("animation pacing", () => {
  it("an L1 hit (3 cycles) takes 150 ms at 1x", () => {
    expect(accessDurationMs(3)).toBeCloseTo(150);
  });

  it("a RAM miss (100 cycles) takes 900 ms at 1x", () => {
    expect(accessDurationMs(100)).toBeCloseTo(900);
  });

  it("proportional mode gives every cycle 80 ms", () => {
    expect(sharedCycleMs([{ kind: "memory", latency: 100 }], "proportional")).toBe(80);
    expect(sharedCycleMs([{ kind: "instruction" }], "proportional")).toBe(80);
  });

  it("the counter steps through all 100 real cycles of a RAM miss, and they add up to 900 ms", () => {
    const m = new Machine(PROGRAM_B.program, simpleConfig());
    for (let i = 0; i < 3; i++) m.stepCycle(); // three MOVs
    let ms = 0;
    let cycles = 0;
    do {
      const r = m.stepCycle();
      ms += sharedCycleMs([classifyCycle(r.events, r.snapshot)], "compressed");
      cycles += 1;
      if (r.snapshot.inFlight === null) break;
    } while (cycles < 1000);
    expect(cycles).toBe(100);
    expect(ms).toBeCloseTo(900);
  });

  it("shared clock: a cycle lasts as long as the slowest-paced lane needs", () => {
    const hitCycle = sharedCycleMs([{ kind: "memory", latency: 3 }], "compressed");
    const both = sharedCycleMs([{ kind: "memory", latency: 3 }, { kind: "memory", latency: 100 }], "compressed");
    expect(both).toBe(hitCycle);
  });
});
