/**
 * Self-tests: run the reference programs and compare the engine with SPEC.md.
 *
 * Expected values below are TEST ASSERTIONS written down from the spec. The
 * "actual" values always come from running the engine. When they disagree we do
 * not touch either side: the result is marked FAIL and the explanation shows how
 * the engine arrived at its number, so a human can decide who is right.
 */
import { fullConfig, simpleConfig } from "./config";
import { Machine } from "./machine";
import { parseOrThrow, parseProgram } from "./parser";
import { PROGRAM_A, PROGRAM_B, type ReferenceProgram } from "./programs";
import type { MachineConfig, MachineEventKind, MachineSnapshot, StepResult } from "./types";

/** One expected-vs-actual comparison. */
export interface CheckRow {
  readonly label: string;
  readonly expected: number | string | boolean;
  readonly actual: number | string | boolean;
  readonly pass: boolean;
}

/** One numbered self-test. */
export interface SelfTestResult {
  readonly id: number;
  readonly title: string;
  /** True for checks the team asked for; false for extra checks added by the engine. */
  readonly requested: boolean;
  readonly rows: readonly CheckRow[];
  readonly pass: boolean;
  /** Plain-English explanation of how the engine got its numbers. */
  readonly explanation: string;
}

/** Build a row and decide PASS/FAIL by strict equality. */
function row(label: string, expected: number | string | boolean, actual: number | string | boolean): CheckRow {
  return { label, expected, actual, pass: expected === actual };
}

/** Bundle rows into a result. The test passes only if every row passes. */
function result(id: number, title: string, requested: boolean, rows: CheckRow[], explanation: string): SelfTestResult {
  return { id, title, requested, rows, pass: rows.every((r) => r.pass), explanation };
}

/**
 * Explain a run's cycle count from its own counters:
 * one-cycle instructions + (answers per level × that level's latency).
 */
function explainCycles(s: MachineSnapshot): string {
  const m = s.metrics;
  const parts: string[] = [];
  let memOps = 0;
  for (const level of s.levels) {
    const hits = m.levels[level.name]?.hits ?? 0;
    memOps += hits;
    if (hits > 0) parts.push(`${hits} ${level.name} hit${hits === 1 ? "" : "s"} × ${level.latency}`);
  }
  memOps += m.ramAccesses;
  if (m.ramAccesses > 0) parts.push(`${m.ramAccesses} RAM fetch${m.ramAccesses === 1 ? "" : "es"} × ${s.config.ramLatency}`);
  const oneCycle = m.instructionsExecuted - memOps;
  return `Engine: ${oneCycle} one-cycle instructions + ${parts.join(" + ") || "no memory accesses"} = ${m.totalCycles} cycles.`;
}

/** Expected sum of the first `count` cells read with a given stride, from the rule "cell i holds i + 1". */
function expectedSum(count: number, stride: number): number {
  let total = 0;
  for (let k = 0; k < count; k++) total += k * stride + 1;
  return total & 0xffff;
}

/** Run a fresh machine (cold cache) to the end. */
function runCold(p: ReferenceProgram, config: MachineConfig): { machine: Machine; run: StepResult } {
  const machine = new Machine(p.program, config);
  return { machine, run: machine.runToEnd() };
}

/** Hits and misses of one level in a snapshot. */
function counters(s: MachineSnapshot, level: "L1" | "L2" | "L3"): { hits: number; misses: number } {
  return s.metrics.levels[level] ?? { hits: 0, misses: 0 };
}

/** Test 1: program A, simple mode, cold cache. */
function test1(): SelfTestResult {
  const s = runCold(PROGRAM_A, simpleConfig()).run.snapshot;
  return result(
    1,
    "Program A (read in order), simple mode, cold cache",
    true,
    [
      row("Total cycles", 503, s.metrics.totalCycles),
      row("L1 misses", 4, counters(s, "L1").misses),
      row("L1 hits", 12, counters(s, "L1").hits),
      row("R3 (sum of the 16 values read)", expectedSum(16, 1), s.registers[3]),
    ],
    `${explainCycles(s)} Each miss brings in a 4-cell line, so the next 3 reads are hits.`,
  );
}

/** Test 2: program B, simple mode, cold cache. */
function test2(): SelfTestResult {
  const s = runCold(PROGRAM_B, simpleConfig()).run.snapshot;
  return result(
    2,
    "Program B (jump around), simple mode, cold cache",
    true,
    [
      row("Total cycles", 1667, s.metrics.totalCycles),
      row("L1 misses", 16, counters(s, "L1").misses),
      row("L1 hits", 0, counters(s, "L1").hits),
      row("R3 (sum of the 16 values read)", expectedSum(16, 4), s.registers[3]),
    ],
    `${explainCycles(s)} A stride of 4 lands on a new line every read, so nothing fetched is ever reused.`,
  );
}

/** Test 3: program A twice without flushing; the second run finds everything in L1. */
function test3(): SelfTestResult {
  const { machine } = runCold(PROGRAM_A, simpleConfig());
  machine.reset(); // keeps the cache warm
  const s = machine.runToEnd().snapshot;
  return result(
    3,
    "Program A run twice without flush (second run)",
    true,
    [
      row("Second-run cycles", 115, s.metrics.totalCycles),
      row("Second-run L1 hits", 16, counters(s, "L1").hits),
      row("Second-run L1 misses", 0, counters(s, "L1").misses),
    ],
    `${explainCycles(s)} Program A touches only 4 lines and L1 holds 4, so all of them are still there.`,
  );
}

/** Test 4: program B in full mode twice without flushing; every read is an L2 hit. */
function test4(): SelfTestResult {
  const { machine } = runCold(PROGRAM_B, fullConfig());
  machine.reset();
  const s = machine.runToEnd().snapshot;
  return result(
    4,
    "Program B, full mode, run twice without flush (second run)",
    true,
    [
      row("Second-run cycles", 227, s.metrics.totalCycles),
      row("Second-run L2 hits", 16, counters(s, "L2").hits),
      row("Second-run L1 hits", 0, counters(s, "L1").hits),
      row("Second-run RAM fetches", 0, s.metrics.ramAccesses),
    ],
    `${explainCycles(s)} B touches 16 lines but L1 holds only 8. LRU always evicts the line that is needed next, so L1 never hits, while L2 (16 lines) holds them all.`,
  );
}

/** Step a fresh machine one cycle at a time until it halts. */
function runByCycles(p: ReferenceProgram, config: MachineConfig): StepResult {
  const machine = new Machine(p.program, config);
  const events = [];
  let snapshot = machine.getSnapshot();
  while (!snapshot.halted) {
    const step = machine.stepCycle();
    events.push(...step.events);
    snapshot = step.snapshot;
  }
  return { snapshot, events };
}

/** Test 5: stepping cycle by cycle must give exactly the same totals as runToEnd(). */
function test5(): SelfTestResult {
  const rows: CheckRow[] = [];
  const cases: [ReferenceProgram, MachineConfig][] = [
    [PROGRAM_A, simpleConfig()],
    [PROGRAM_B, simpleConfig()],
    [PROGRAM_A, fullConfig()],
    [PROGRAM_B, fullConfig()],
  ];
  for (const [p, config] of cases) {
    const fast = runCold(p, config).run;
    const slow = runByCycles(p, config);
    const tag = `${p.id} ${config.mode}`;
    const a = fast.snapshot.metrics;
    const b = slow.snapshot.metrics;
    rows.push(row(`${tag}: total cycles`, a.totalCycles, b.totalCycles));
    rows.push(row(`${tag}: memory-wait cycles`, a.memoryWaitCycles, b.memoryWaitCycles));
    rows.push(row(`${tag}: hits/misses per level`, JSON.stringify(a.levels), JSON.stringify(b.levels)));
    rows.push(row(`${tag}: registers`, fast.snapshot.registers.join(","), slow.snapshot.registers.join(",")));
    rows.push(row(`${tag}: event list identical`, true, JSON.stringify(fast.events) === JSON.stringify(slow.events)));
  }
  return result(
    5,
    "stepCycle() until finished = runToEnd()",
    true,
    rows,
    "Expected = runToEnd() on a fresh machine; actual = calling stepCycle() in a loop on another fresh machine.",
  );
}

/** Test 6: the parser rejects an unknown instruction and names the line. */
function test6(): SelfTestResult {
  const source = "MOV R0, 1\nMOV R1, 2\nFOO R2, 3\nADD R0, 1";
  const parsed = parseProgram(source);
  const line = parsed.ok ? "none" : parsed.error.line;
  const message = parsed.ok ? "(accepted)" : parsed.error.message;
  return result(
    6,
    "Parser rejects an unknown instruction and reports the line",
    true,
    [
      row("Program rejected", true, !parsed.ok),
      row("Reported line", 3, line),
      row('Message names "FOO"', true, message.includes("FOO")),
    ],
    `Input: 4 lines with "FOO R2, 3" on line 3. Parser said: ${message}`,
  );
}

/** Test 7 (extra): a RAM LOAD keeps the CPU stalled for the full 100 cycles. */
function test7(): SelfTestResult {
  const machine = new Machine(parseOrThrow("LOAD R1, [0]"), simpleConfig());
  let stalledCycles = 0;
  let startCycle = -1;
  let endCycle = -1;
  let snapshot = machine.getSnapshot();
  while (!snapshot.halted) {
    const step = machine.stepCycle();
    snapshot = step.snapshot;
    if (snapshot.stalling) stalledCycles += 1;
    for (const e of step.events) {
      if (e.kind === "memory-wait-start") startCycle = e.cycle;
      if (e.kind === "memory-wait-end") endCycle = e.cycle;
    }
  }
  const ram = simpleConfig().ramLatency;
  return result(
    7,
    "Extra: a RAM LOAD stalls the CPU cycle by cycle",
    false,
    [
      row("Total cycles", ram, snapshot.metrics.totalCycles),
      row("Cycles reported as stalling", ram - 1, stalledCycles),
      row("memory-wait-start cycle", 1, startCycle),
      row("memory-wait-end cycle", ram, endCycle),
      row("R1 = mem[0] (cell 0 holds 1)", 1, snapshot.registers[1]),
    ],
    "Program: LOAD R1, [0] on a cold cache. After each of the first 99 cycles the machine says it is still waiting; the data arrives in cycle 100.",
  );
}

/** Test 8 (extra): every event kind the UI needs shows up, in clock order. */
function test8(): SelfTestResult {
  const run = runCold(PROGRAM_B, fullConfig()).run;
  const needed: MachineEventKind[] = [
    "instruction-start",
    "cache-lookup",
    "hit",
    "miss",
    "line-fill",
    "eviction",
    "alu-op",
    "memory-wait-start",
    "memory-wait-end",
    "jump",
    "program-end",
  ];
  const seen = new Set(run.events.map((e) => e.kind));
  const rows = needed.map((k) => row(`"${k}" event emitted`, true, seen.has(k)));
  let ordered = true;
  for (let i = 1; i < run.events.length; i++) {
    const prev = run.events[i - 1];
    const cur = run.events[i];
    if (prev && cur && cur.cycle < prev.cycle) ordered = false;
  }
  rows.push(row("Event cycles never go backwards", true, ordered));
  const last = run.events[run.events.length - 1];
  rows.push(row("program-end is in the last cycle", run.snapshot.metrics.totalCycles, last?.kind === "program-end" ? last.cycle : -1));
  return result(
    8,
    "Extra: all event kinds are emitted with cycle numbers",
    false,
    rows,
    `Program B in full mode, cold cache, produced ${run.events.length} events over ${run.snapshot.metrics.totalCycles} cycles.`,
  );
}

/** Run every self-test and return the results in order. Deterministic: same output every time. */
export function runSelfTests(): SelfTestResult[] {
  return [test1(), test2(), test3(), test4(), test5(), test6(), test7(), test8()];
}
