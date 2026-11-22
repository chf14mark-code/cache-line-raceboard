import { describe, expect, it } from "vitest";
import { Machine, PROGRAM_A, PROGRAM_B, simpleConfig } from "@/engine";
import { narrate } from "./narration";

function captions(program = PROGRAM_A.program) {
  const m = new Machine(program, simpleConfig());
  const out: string[] = [];
  while (!m.getSnapshot().halted) out.push(...narrate(m.stepCycle().events, 4).map((c) => c.text));
  return out;
}

describe("narration from engine events", () => {
  it("first read of A walks to the warehouse for 100 ticks and brings cells 0-3", () => {
    const c = captions();
    expect(c[0]).toBe("The CPU wants cell 0. Is it on the desk? No. Walk to the warehouse (100 ticks).");
    expect(c[1]).toBe("It brings back the WHOLE box: cells 0, 1, 2, 3 at once.");
    expect(c[2]).toBe("The CPU wants cell 1. Already on the desk! Only 3 ticks.");
  });
  it("B never reads from the desk", () => {
    expect(captions(PROGRAM_B.program).some((t) => t.includes("Already on the desk"))).toBe(false);
  });
  it("ends with the real total", () => {
    expect(captions().at(-1)).toBe("Done! All reads finished after 503 ticks.");
  });
});
