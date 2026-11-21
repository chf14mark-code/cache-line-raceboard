import { describe, expect, it } from "vitest";
import { Machine, PROGRAM_A, PROGRAM_B, fullConfig, parseProgram, runSelfTests, simpleConfig } from "@/engine";

// Reference results from SPEC.md (and the team's request). One test per rule.
describe("engine reference results", () => {
  it("A, simple mode, cold: 503 cycles, 4 misses, 12 hits", () => {
    const s = new Machine(PROGRAM_A.program, simpleConfig()).runToEnd().snapshot;
    expect(s.metrics.totalCycles).toBe(503);
    expect(s.metrics.levels.L1).toEqual({ hits: 12, misses: 4 });
  });

  it("B, simple mode, cold: 1667 cycles, 16 misses, 0 hits", () => {
    const s = new Machine(PROGRAM_B.program, simpleConfig()).runToEnd().snapshot;
    expect(s.metrics.totalCycles).toBe(1667);
    expect(s.metrics.levels.L1).toEqual({ hits: 0, misses: 16 });
  });

  it("A run again without flush: 115 cycles", () => {
    const m = new Machine(PROGRAM_A.program, simpleConfig());
    m.runToEnd();
    m.reset();
    expect(m.runToEnd().snapshot.metrics.totalCycles).toBe(115);
  });

  it("B, full mode, run again without flush: 227 cycles, all L2 hits", () => {
    const m = new Machine(PROGRAM_B.program, fullConfig());
    m.runToEnd();
    m.reset();
    const s = m.runToEnd().snapshot;
    expect(s.metrics.totalCycles).toBe(227);
    expect(s.metrics.levels.L2?.hits).toBe(16);
  });

  it("flushCache() makes A cold again: 503 cycles", () => {
    const m = new Machine(PROGRAM_A.program, simpleConfig());
    m.runToEnd();
    m.reset();
    m.flushCache();
    expect(m.runToEnd().snapshot.metrics.totalCycles).toBe(503);
  });

  it("parser reports the line of an unknown instruction", () => {
    const r = parseProgram("MOV R0, 1\nBAD R1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.line).toBe(2);
  });

  it("registers wrap at 16 bits", () => {
    const parsed = parseProgram("MOV R0, 0\nSUB R0, 1\nMOV R1, 65535\nADD R1, 1");
    if (!parsed.ok) throw new Error(parsed.error.message);
    const s = new Machine(parsed.program, simpleConfig()).runToEnd().snapshot;
    expect(s.registers[0]).toBe(65535);
    expect(s.registers[1]).toBe(0);
  });

  it("every self-test on the /selftest page passes", () => {
    for (const r of runSelfTests()) expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
  });
});
