/**
 * The machine: a tiny CPU (PC + R0–R3) connected to a cache hierarchy and RAM.
 *
 * It is cycle-accurate: `stepCycle()` moves the clock forward by exactly one tick.
 *   - MOV / ADD / SUB / JNZ finish in the cycle they start.
 *   - LOAD / STORE take `latency` cycles (3 for an L1 hit, 100 for RAM, ...).
 *     In the first cycle the caches are searched; in the last cycle the line
 *     arrives, gets copied into the upper levels and the register/memory is updated.
 *     Every cycle in between, the CPU is "stalling" — waiting on memory.
 *
 * Rules come from SPEC.md. The class keeps its state private and only hands out
 * frozen snapshots, so the UI can never change the simulation by accident.
 */
import { CacheLevel } from "./cache";
import { LINE_SIZES, lineIndexOf } from "./config";
import type {
  CacheLevelName,
  HaltReason,
  Instruction,
  LevelCounters,
  MachineConfig,
  MachineEvent,
  MachineSnapshot,
  MemoryLevelName,
  Metrics,
  Operand,
  Program,
  StepResult,
} from "./types";

/** Registers are 16 bits: every result is masked with this to wrap around. */
const MASK_16 = 0xffff;

/** A LOAD/STORE in progress (mutable, private version of InFlightMemoryOp). */
interface InFlight {
  instructionIndex: number;
  op: "LOAD" | "STORE";
  address: number;
  lineIndex: number;
  /** Index into `levels` where the line was found, or -1 for RAM. */
  foundLevel: number;
  latency: number;
  elapsed: number;
}

/** Throw if a config breaks the rules in SPEC.md (bad line size, empty level, ...). */
function validateConfig(config: MachineConfig): void {
  if (!LINE_SIZES.includes(config.lineSize)) {
    throw new Error(`Line size must be one of ${LINE_SIZES.join(", ")}.`);
  }
  if (config.memorySize % config.lineSize !== 0) {
    throw new Error("Memory size must be a multiple of the line size.");
  }
  for (const level of config.levels) {
    if (level.lines < 1 || level.latency < 1) {
      throw new Error(`${level.name} needs at least 1 line and a latency of at least 1 cycle.`);
    }
  }
}

/** Initial RAM contents from SPEC.md: cell i holds i + 1. */
function initialRam(size: number): number[] {
  return Array.from({ length: size }, (_, i) => (i + 1) & MASK_16);
}

export class Machine {
  private readonly config: MachineConfig;
  private program: Program;
  private readonly levels: CacheLevel[];

  // --- CPU state (cleared by reset) ---
  private cycle = 0;
  private pc = 0;
  private regs: [number, number, number, number] = [0, 0, 0, 0];
  private ram: number[];
  private inFlight: InFlight | null = null;
  private halted = false;
  private haltReason: HaltReason | null = null;
  private errorMessage: string | null = null;

  // --- Counters (cleared by reset) ---
  private memoryWaitCycles = 0;
  private aluBusyCycles = 0;
  private instructionsExecuted = 0;
  private ramAccesses = 0;
  private levelCounters: Map<CacheLevelName, { hits: number; misses: number }> = new Map();

  /**
   * LRU clock: counts every LOAD/STORE this machine has served.
   * It is NOT cleared by reset(), so a warm cache keeps a correct LRU order
   * across runs.
   */
  private accessStamp = 0;

  /** Build a machine with cold (empty) caches and load `program`. */
  constructor(program: Program, config: MachineConfig) {
    validateConfig(config);
    this.config = config;
    this.program = program;
    this.levels = config.levels.map((l) => new CacheLevel(l));
    this.ram = initialRam(config.memorySize);
    this.reset();
  }

  // -------------------------------------------------------------------------
  // Public controls
  // -------------------------------------------------------------------------

  /**
   * Restart the program: PC, registers, RAM, clock and counters go back to the start.
   * The caches are kept as they are ("warm"), so running again shows the cache effect.
   * Call flushCache() too if you want a cold start.
   */
  reset(): MachineSnapshot {
    this.cycle = 0;
    this.pc = 0;
    this.regs = [0, 0, 0, 0];
    this.ram = initialRam(this.config.memorySize);
    this.inFlight = null;
    this.halted = false;
    this.haltReason = null;
    this.errorMessage = null;
    this.memoryWaitCycles = 0;
    this.aluBusyCycles = 0;
    this.instructionsExecuted = 0;
    this.ramAccesses = 0;
    this.levelCounters = new Map(this.levels.map((l) => [l.name, { hits: 0, misses: 0 }]));
    // An empty program is finished before it starts.
    if (this.program.length === 0) {
      this.halted = true;
      this.haltReason = "end-of-program";
    }
    return this.getSnapshot();
  }

  /** Empty every cache level. CPU state and counters are left alone. */
  flushCache(): MachineSnapshot {
    for (const level of this.levels) level.flush();
    return this.getSnapshot();
  }

  /** Swap in a new program and reset the CPU. Caches stay warm (flush them yourself). */
  loadProgram(program: Program): MachineSnapshot {
    this.program = program;
    return this.reset();
  }

  /** Advance the clock by exactly one cycle. Does nothing once the machine has halted. */
  stepCycle(): StepResult {
    const events: MachineEvent[] = [];
    if (this.halted) return { snapshot: this.getSnapshot(), events };

    this.cycle += 1;

    // Nothing running yet? Start the instruction at PC.
    if (this.inFlight === null) this.startInstruction(events);

    // A LOAD/STORE in progress spends this cycle waiting on memory.
    if (this.inFlight !== null && !this.halted) {
      this.inFlight.elapsed += 1;
      this.memoryWaitCycles += 1;
      if (this.inFlight.elapsed >= this.inFlight.latency) this.finishMemoryOp(events);
    }

    // Did PC just move past the last line?
    if (!this.halted && this.inFlight === null && this.pc >= this.program.length) {
      this.halt("end-of-program", null, events);
    }
    // Safety stop for programs that loop forever.
    if (!this.halted && this.cycle >= this.config.maxCycles) {
      this.halt("cycle-limit", `Stopped after ${this.config.maxCycles} cycles (safety limit).`, events);
    }

    return { snapshot: this.getSnapshot(), events: Object.freeze(events) };
  }

  /**
   * Run cycles until the current instruction finishes (or, if none is running,
   * until the next one finishes). Returns all events from those cycles.
   */
  stepInstruction(): StepResult {
    const events: MachineEvent[] = [];
    do {
      events.push(...this.stepCycle().events);
    } while (!this.halted && this.inFlight !== null);
    return { snapshot: this.getSnapshot(), events: Object.freeze(events) };
  }

  /** Run until the program ends (or hits the safety stop). Returns every event. */
  runToEnd(): StepResult {
    const events: MachineEvent[] = [];
    while (!this.halted) events.push(...this.stepCycle().events);
    return { snapshot: this.getSnapshot(), events: Object.freeze(events) };
  }

  /** Frozen picture of the current state. Safe to keep: later steps never change it. */
  getSnapshot(): MachineSnapshot {
    const levelMetrics: Partial<Record<CacheLevelName, LevelCounters>> = {};
    for (const [name, c] of this.levelCounters) levelMetrics[name] = Object.freeze({ ...c });

    const metrics: Metrics = Object.freeze({
      totalCycles: this.cycle,
      memoryWaitCycles: this.memoryWaitCycles,
      aluBusyCycles: this.aluBusyCycles,
      instructionsExecuted: this.instructionsExecuted,
      levels: Object.freeze(levelMetrics),
      ramAccesses: this.ramAccesses,
      waitPercent: this.cycle === 0 ? 0 : (this.memoryWaitCycles / this.cycle) * 100,
    });

    const f = this.inFlight;
    return Object.freeze({
      cycle: this.cycle,
      pc: this.pc,
      registers: Object.freeze([...this.regs]) as unknown as readonly [number, number, number, number],
      stalling: f !== null && f.elapsed < f.latency,
      inFlight:
        f === null
          ? null
          : Object.freeze({
              instructionIndex: f.instructionIndex,
              op: f.op,
              address: f.address,
              lineIndex: f.lineIndex,
              level: this.levelName(f.foundLevel),
              latency: f.latency,
              elapsed: f.elapsed,
            }),
      halted: this.halted,
      haltReason: this.haltReason,
      errorMessage: this.errorMessage,
      levels: Object.freeze(this.levels.map((l) => l.snapshot())),
      ram: Object.freeze([...this.ram]),
      metrics,
      config: this.config,
    });
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /** Name of a level index, where -1 means RAM. */
  private levelName(index: number): MemoryLevelName {
    return index === -1 ? "RAM" : (this.levels[index]?.name ?? "RAM");
  }

  /** The value of an operand: a register's contents or the immediate number. */
  private valueOf(operand: Operand): number {
    return operand.kind === "reg" ? this.regs[operand.reg] : operand.value;
  }

  /** Stop the machine and emit a program-end event. */
  private halt(reason: HaltReason, message: string | null, events: MachineEvent[]): void {
    this.halted = true;
    this.haltReason = reason;
    this.errorMessage = reason === "runtime-error" ? message : null;
    this.inFlight = null;
    events.push(Object.freeze({ cycle: this.cycle, kind: "program-end", details: Object.freeze({ reason, message }) }));
  }

  /**
   * Begin the instruction at PC during the current cycle.
   * One-cycle instructions are executed completely here.
   * LOAD/STORE only search the caches here and then wait (see finishMemoryOp).
   */
  private startInstruction(events: MachineEvent[]): void {
    const ins = this.program[this.pc];
    if (ins === undefined) return; // PC already past the end; stepCycle will halt
    const c = this.cycle;
    events.push(Object.freeze({ cycle: c, kind: "instruction-start", details: Object.freeze({ pc: this.pc, text: ins.text }) }));

    switch (ins.op) {
      case "MOV": {
        const before = this.regs[ins.rd];
        const after = this.valueOf(ins.src) & MASK_16;
        this.regs[ins.rd] = after;
        events.push(Object.freeze({ cycle: c, kind: "register-write", details: Object.freeze({ rd: ins.rd, before, after }) }));
        this.completeSimple();
        return;
      }
      case "ADD":
      case "SUB": {
        const before = this.regs[ins.rd];
        const value = this.valueOf(ins.src);
        // "& 0xFFFF" wraps around like a real 16-bit register (65535 + 1 = 0, 0 - 1 = 65535).
        const after = (ins.op === "ADD" ? before + value : before - value) & MASK_16;
        this.regs[ins.rd] = after;
        this.aluBusyCycles += 1;
        events.push(Object.freeze({ cycle: c, kind: "alu-op", details: Object.freeze({ op: ins.op, rd: ins.rd, before, after }) }));
        this.completeSimple();
        return;
      }
      case "JNZ": {
        const from = this.pc;
        const taken = this.regs[ins.rs] !== 0;
        const to = taken ? ins.target : from + 1;
        events.push(Object.freeze({ cycle: c, kind: "jump", details: Object.freeze({ from, to, taken }) }));
        this.instructionsExecuted += 1;
        this.pc = to;
        return;
      }
      case "LOAD":
      case "STORE":
        this.startMemoryOp(ins, events);
        return;
    }
  }

  /** Finish a one-cycle instruction: count it and move to the next line. */
  private completeSimple(): void {
    this.instructionsExecuted += 1;
    this.pc += 1;
  }

  /**
   * First cycle of a LOAD/STORE: search L1 → L2 → L3, stop at the first hit,
   * otherwise go to RAM. The cost is the latency of the level that answered
   * (NOT the sum of all levels searched — a documented simplification).
   */
  private startMemoryOp(ins: Extract<Instruction, { op: "LOAD" | "STORE" }>, events: MachineEvent[]): void {
    const c = this.cycle;
    const address = this.valueOf(ins.addr);
    if (address >= this.config.memorySize) {
      this.halt(
        "runtime-error",
        `Line ${ins.sourceLine}: address ${address} is outside memory (0–${this.config.memorySize - 1}).`,
        events,
      );
      return;
    }
    const lineIndex = lineIndexOf(address, this.config.lineSize);

    let foundLevel = -1;
    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      if (!level) continue;
      const counters = this.levelCounters.get(level.name);
      events.push(Object.freeze({ cycle: c, kind: "cache-lookup", details: Object.freeze({ level: level.name, address, lineIndex }) }));
      if (level.find(lineIndex) !== -1) {
        if (counters) counters.hits += 1;
        events.push(Object.freeze({ cycle: c, kind: "hit", details: Object.freeze({ level: level.name, address, lineIndex }) }));
        foundLevel = i;
        break;
      }
      if (counters) counters.misses += 1;
      events.push(Object.freeze({ cycle: c, kind: "miss", details: Object.freeze({ level: level.name, address, lineIndex }) }));
    }
    if (foundLevel === -1) {
      // No cache had it: RAM always has the data.
      this.ramAccesses += 1;
      events.push(Object.freeze({ cycle: c, kind: "hit", details: Object.freeze({ level: "RAM" as const, address, lineIndex }) }));
    }

    const latency = foundLevel === -1 ? this.config.ramLatency : (this.levels[foundLevel]?.latency ?? this.config.ramLatency);
    const levelName = this.levelName(foundLevel);
    events.push(Object.freeze({ cycle: c, kind: "memory-wait-start", details: Object.freeze({ op: ins.op, level: levelName, latency, address }) }));

    this.inFlight = { instructionIndex: this.pc, op: ins.op, address, lineIndex, foundLevel, latency, elapsed: 0 };
  }

  /**
   * Last cycle of a LOAD/STORE: the line has arrived.
   *   1. Mark it as used in the level that answered.
   *   2. Copy the whole line into every faster level, from the closest one upward
   *      (e.g. RAM → L3 → L2 → L1), evicting the LRU line where a level is full.
   *   3. LOAD writes the register; STORE writes RAM (write-through + write-allocate).
   */
  private finishMemoryOp(events: MachineEvent[]): void {
    const f = this.inFlight;
    if (f === null) return;
    const c = this.cycle;
    this.accessStamp += 1;
    const stamp = this.accessStamp;

    // 1. Refresh LRU in the level that had the line (if it is still there after a flush).
    const source = f.foundLevel === -1 ? undefined : this.levels[f.foundLevel];
    if (source) {
      const slot = source.find(f.lineIndex);
      if (slot !== -1) source.touch(slot, stamp);
    }

    // 2. Fill the faster levels. With foundLevel = -1 (RAM) every level is filled.
    const firstToFill = f.foundLevel === -1 ? this.levels.length - 1 : f.foundLevel - 1;
    for (let i = firstToFill; i >= 0; i--) {
      const level = this.levels[i];
      if (!level) continue;
      const { slot, evictedTag } = level.insert(f.lineIndex, stamp);
      if (evictedTag !== null) {
        events.push(Object.freeze({ cycle: c, kind: "eviction", details: Object.freeze({ level: level.name, lineIndex: evictedTag, slot }) }));
      }
      events.push(Object.freeze({ cycle: c, kind: "line-fill", details: Object.freeze({ level: level.name, lineIndex: f.lineIndex, slot }) }));
    }

    // 3. Move the data.
    const ins = this.program[f.instructionIndex];
    let value = 0;
    if (ins?.op === "LOAD") {
      value = this.ram[f.address] ?? 0;
      this.regs[ins.rd] = value;
    } else if (ins?.op === "STORE") {
      value = this.regs[ins.rs];
      this.ram[f.address] = value;
    }
    events.push(
      Object.freeze({
        cycle: c,
        kind: "memory-wait-end",
        details: Object.freeze({ op: f.op, level: this.levelName(f.foundLevel), latency: f.latency, address: f.address, value }),
      }),
    );

    this.inFlight = null;
    this.instructionsExecuted += 1;
    this.pc += 1;
  }
}
