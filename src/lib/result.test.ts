import { describe, expect, it } from "vitest";
import { PROGRAM_A, PROGRAM_B, makeJumpProgram } from "@/engine";
import { predictOutcome, resultSentences, winnerOf } from "@/lib/race";

describe("result banner and step slider", () => {
  it("step 4 is exactly program B (1667 cycles)", () => {
    expect(predictOutcome(makeJumpProgram(4).program).cycles).toBe(predictOutcome(PROGRAM_B.program).cycles);
  });
  it("step 1 ties with reading in order", () => {
    expect(winnerOf(predictOutcome(PROGRAM_A.program), predictOutcome(makeJumpProgram(1).program))).toBe("tie");
  });
  it("cost grows as the step approaches the line size", () => {
    const c = [1, 2, 3, 4].map((s) => predictOutcome(makeJumpProgram(s).program).cycles);
    expect(c[0]! < c[1]! && c[1]! < c[2]! && c[2]! <= c[3]!).toBe(true);
  });
  it("banner text uses computed numbers", () => {
    const t = resultSentences(predictOutcome(PROGRAM_A.program), predictOutcome(PROGRAM_B.program)).join(" ");
    expect(t).toContain("503 cycles");
    expect(t).toContain("1667 cycles: 3.3x slower");
    expect(t).toContain("Only 4 of 16 reads");
  });
});
