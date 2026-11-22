/**
 * Shared types for the cache-line simulator.
 *
 * This file only describes the *shape* of the data. It contains no logic.
 * Everything here is plain TypeScript: no React, no browser APIs.
 */

// ---------------------------------------------------------------------------
// Registers and instructions
// ---------------------------------------------------------------------------

/** Index of a general-purpose register: 0 = R0, 1 = R1, 2 = R2, 3 = R3. */
export type RegisterIndex = 0 | 1 | 2 | 3;

/** An operand is either a register (R0–R3) or a literal number ("immediate"). */
export type Operand =
  | { readonly kind: "reg"; readonly reg: RegisterIndex }
  | { readonly kind: "imm"; readonly value: number };

/** The six instruction names our tiny CPU understands. */
export type Opcode = "MOV" | "LOAD" | "STORE" | "ADD" | "SUB" | "JNZ";

/**
 * One parsed instruction.
 * `sourceLine` is the 1-based line in the original text, so the UI can point at it.
 */
export type Instruction =
  | { readonly op: "MOV"; readonly rd: RegisterIndex; readonly src: Operand; readonly sourceLine: number; readonly text: string }
  | { readonly op: "ADD"; readonly rd: RegisterIndex; readonly src: Operand; readonly sourceLine: number; readonly text: string }
  | { readonly op: "SUB"; readonly rd: RegisterIndex; readonly src: Operand; readonly sourceLine: number; readonly text: string }
  /** LOAD rd, [addr]  →  rd = mem[addr] */
  | { readonly op: "LOAD"; readonly rd: RegisterIndex; readonly addr: Operand; readonly sourceLine: number; readonly text: string }
  /** STORE rs, [addr]  →  mem[addr] = rs */
  | { readonly op: "STORE"; readonly rs: RegisterIndex; readonly addr: Operand; readonly sourceLine: number; readonly text: string }
  /** JNZ rs, target  →  if rs != 0 jump to instruction `target` (0-based) */
  | { readonly op: "JNZ"; readonly rs: RegisterIndex; readonly target: number; readonly sourceLine: number; readonly text: string };

/** A program is just a list of instructions. Instruction 0 runs first. */
export type Program = readonly Instruction[];

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Names of the memory levels, from fastest to slowest. */
export type CacheLevelName = "L1" | "L2" | "L3";
export type MemoryLevelName = CacheLevelName | "RAM";

/** Allowed cache line sizes in bytes (cells). */
export type LineSize = 2 | 4 | 8 | 16;

/** Size and speed of one cache level. */
export interface CacheLevelConfig {
  readonly name: CacheLevelName;
  /** How many cache lines this level can hold. */
  readonly lines: number;
  /** Cycles a LOAD/STORE costs when the data is found in this level. */
  readonly latency: number;
}

/** Full description of a machine. Build one with `simpleConfig()` or `fullConfig()`. */
export interface MachineConfig {
  /** Human-readable label, e.g. "simple" or "full". */
  readonly mode: "simple" | "full" | "custom";
  /** Cells per cache line. */
  readonly lineSize: LineSize;
  /** Cache levels ordered fastest first (L1, then L2, then L3). */
  readonly levels: readonly CacheLevelConfig[];
  /** Cycles a LOAD/STORE costs when no cache has the data. */
  readonly ramLatency: number;
  /** Number of memory cells (addresses 0 .. memorySize-1). */
  readonly memorySize: number;
  /** Safety stop: the machine halts after this many cycles. */
  readonly maxCycles: number;
}

// ---------------------------------------------------------------------------
// Snapshots (what the UI reads)
// ---------------------------------------------------------------------------

/** One slot inside a cache level. */
export interface CacheLineState {
  /** Does this slot hold real data? Empty slots are invalid. */
  readonly valid: boolean;
  /** Which memory line is stored here: tag = floor(address / lineSize). */
  readonly tag: number;
  /**
   * When this slot was last used, as a "memory access number" (1 = first LOAD/STORE
   * this cache ever served). Bigger = more recent. LRU evicts the smallest value.
   * We count accesses instead of cycles so the order stays correct even after
   * `reset()` restarts the cycle counter while the cache stays warm.
   */
  readonly lastUsed: number;
}

/** A snapshot of one cache level. */
export interface CacheLevelState {
  readonly name: CacheLevelName;
  readonly latency: number;
  readonly capacity: number;
  readonly lines: readonly CacheLineState[];
}

/** Hit and miss counters for one cache level. */
export interface LevelCounters {
  readonly hits: number;
  readonly misses: number;
}

/** All the numbers the explainer can show. Every one is counted by the engine. */
export interface Metrics {
  /** Clock cycles elapsed since the last reset. */
  readonly totalCycles: number;
  /** Cycles spent waiting on LOAD/STORE (sum of their latencies). */
  readonly memoryWaitCycles: number;
  /** Number of ADD/SUB instructions executed (each takes 1 cycle). */
  readonly aluBusyCycles: number;
  /** Instructions that finished executing. */
  readonly instructionsExecuted: number;
  /** Hits and misses per cache level, keyed by level name. */
  readonly levels: Readonly<Partial<Record<CacheLevelName, LevelCounters>>>;
  /** LOAD/STOREs that had to go all the way to RAM. */
  readonly ramAccesses: number;
  /** memoryWaitCycles / totalCycles, as a percentage 0–100 (0 when no cycles ran). */
  readonly waitPercent: number;
}

/** A LOAD or STORE that started but has not finished its latency yet. */
export interface InFlightMemoryOp {
  readonly instructionIndex: number;
  readonly op: "LOAD" | "STORE";
  readonly address: number;
  readonly lineIndex: number;
  /** The level that will answer (where the data was found). */
  readonly level: MemoryLevelName;
  /** Total cycles this access costs. */
  readonly latency: number;
  /** Cycles already spent (1 .. latency). */
  readonly elapsed: number;
}

/** Why the machine stopped. */
export type HaltReason =
  | "end-of-program" // PC moved past the last instruction
  | "cycle-limit" // safety stop reached
  | "runtime-error"; // e.g. address outside memory

/** A frozen picture of the whole machine at one moment. */
export interface MachineSnapshot {
  /** Cycles completed so far (0 before the first step). */
  readonly cycle: number;
  /** Index of the instruction being executed, or the next one to start. */
  readonly pc: number;
  /** R0..R3, each 0..65535. */
  readonly registers: readonly [number, number, number, number];
  /** Instruction register: text of the instruction fetched last ("" before the first fetch). */
  readonly ir: string;
  /** True when the CPU is waiting on memory and will keep waiting next cycle. */
  readonly stalling: boolean;
  /** The LOAD/STORE in progress, if any. */
  readonly inFlight: InFlightMemoryOp | null;
  readonly halted: boolean;
  readonly haltReason: HaltReason | null;
  /** Human-readable error when haltReason is "runtime-error". */
  readonly errorMessage: string | null;
  /** Cache contents, fastest level first. */
  readonly levels: readonly CacheLevelState[];
  /** Every memory cell value (index = address). */
  readonly ram: readonly number[];
  readonly metrics: Metrics;
  readonly config: MachineConfig;
}

// ---------------------------------------------------------------------------
// Events (what the UI animates)
// ---------------------------------------------------------------------------

/** Every event carries the cycle (1-based) in which it happened. */
interface EventBase {
  readonly cycle: number;
}

export type MachineEvent =
  | (EventBase & { readonly kind: "instruction-start"; readonly details: { readonly pc: number; readonly text: string } })
  | (EventBase & { readonly kind: "cache-lookup"; readonly details: { readonly level: CacheLevelName; readonly address: number; readonly lineIndex: number } })
  | (EventBase & { readonly kind: "hit"; readonly details: { readonly level: MemoryLevelName; readonly address: number; readonly lineIndex: number } })
  | (EventBase & { readonly kind: "miss"; readonly details: { readonly level: CacheLevelName; readonly address: number; readonly lineIndex: number } })
  | (EventBase & { readonly kind: "line-fill"; readonly details: { readonly level: CacheLevelName; readonly lineIndex: number; readonly slot: number } })
  | (EventBase & { readonly kind: "eviction"; readonly details: { readonly level: CacheLevelName; readonly lineIndex: number; readonly slot: number } })
  /** ADD or SUB used the ALU (these are the "ALU-busy" cycles). */
  | (EventBase & { readonly kind: "alu-op"; readonly details: { readonly op: "ADD" | "SUB"; readonly rd: RegisterIndex; readonly before: number; readonly after: number } })
  /** MOV copied a value into a register (no ALU work, but still 1 cycle). */
  | (EventBase & { readonly kind: "register-write"; readonly details: { readonly rd: RegisterIndex; readonly before: number; readonly after: number } })
  | (EventBase & { readonly kind: "memory-wait-start"; readonly details: { readonly op: "LOAD" | "STORE"; readonly level: MemoryLevelName; readonly latency: number; readonly address: number } })
  | (EventBase & { readonly kind: "memory-wait-end"; readonly details: { readonly op: "LOAD" | "STORE"; readonly level: MemoryLevelName; readonly latency: number; readonly address: number; readonly value: number } })
  | (EventBase & { readonly kind: "jump"; readonly details: { readonly from: number; readonly to: number; readonly taken: boolean } })
  | (EventBase & { readonly kind: "program-end"; readonly details: { readonly reason: HaltReason; readonly message: string | null } })
  | PhaseEvent;

/** Which unit an instruction is decoded for. */
export type ExecUnit = "ALU" | "LSU" | "CU";

/** Structured EXECUTE details, one shape per unit. */
export type ExecuteDetails =
  | { readonly unit: "ALU"; readonly op: "ADD" | "SUB"; readonly a: number; readonly b: number; readonly result: number; readonly detail: string }
  /** LSU: emitted at the first cycle (stage "start", level = first level searched) and the last cycle (stage "end", level that answered). */
  | { readonly unit: "LSU"; readonly op: "LOAD" | "STORE"; readonly address: number; readonly level: MemoryLevelName; readonly stage: "start" | "end"; readonly detail: string }
  | { readonly unit: "CU"; readonly op: "MOV"; readonly detail: string }
  | { readonly unit: "CU"; readonly op: "JNZ"; readonly detail: string; readonly registerValue: number; readonly taken: boolean };

/** Structured WRITE-BACK details. */
export type WritebackDetails =
  | { readonly target: "register"; readonly name: string; readonly oldValue: number; readonly newValue: number }
  | { readonly target: "memory"; readonly address: number; readonly oldValue: number; readonly newValue: number }
  | { readonly target: "none" };

/** Instruction-cycle phase events (display sub-steps; they never add cycles). */
export type PhaseEvent =
  | (EventBase & { readonly kind: "fetch"; readonly details: { readonly pc: number; readonly text: string } })
  | (EventBase & { readonly kind: "pc-update"; readonly details: { readonly from: number; readonly to: number; readonly reason: "sequential" | "jump-taken" | "jump-not-taken" } })
  | (EventBase & { readonly kind: "decode"; readonly details: { readonly opcode: Opcode; readonly operands: readonly string[]; readonly unit: ExecUnit } })
  | (EventBase & { readonly kind: "execute"; readonly details: ExecuteDetails })
  | (EventBase & { readonly kind: "writeback"; readonly details: WritebackDetails });

export type MachineEventKind = MachineEvent["kind"];

/** What every step function returns: the new frozen state plus what happened. */
export interface StepResult {
  readonly snapshot: MachineSnapshot;
  readonly events: readonly MachineEvent[];
}
