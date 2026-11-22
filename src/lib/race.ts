/**
 * The race: programs A and B on two identical simple-mode machines that share ONE clock.
 * `advanceRace(race, n)` moves both machines forward by the same n cycles, so their
 * cycle counters are always directly comparable. Plain TypeScript, no React.
 */
import { Machine, PROGRAM_A, PROGRAM_B, simpleConfig, type MachineEvent, type MachineSnapshot, type Program } from "@/engine";

export type LaneId = "a" | "b";
export const LANE_IDS: readonly LaneId[] = ["a", "b"];

/** What the UI shows for one lane: the engine snapshot plus history read from engine events. */
export interface LaneView {
  readonly snapshot: MachineSnapshot;
  /** Address of the most recent finished LOAD/STORE, or null before the first one. */
  readonly lastAccessAddress: number | null;
  /** Memory lines copied into L1 at least once since the last reset. */
  readonly loadedLines: ReadonlySet<number>;
}

/** Mutable history for one lane, filled from engine events. */
interface LaneTrack {
  lastAccessAddress: number | null;
  loadedLines: Set<number>;
}

export interface Race {
  readonly machines: Readonly<Record<LaneId, Machine>>;
  readonly tracks: Record<LaneId, LaneTrack>;
}

/** Empty history for a lane. */
function emptyTrack(): LaneTrack {
  return { lastAccessAddress: null, loadedLines: new Set() };
}

/** Two cold machines: A ("Read in order") and B ("Jump around"), both in simple mode. */
export function createRace(programB: Program = PROGRAM_B.program): Race {
  return {
    machines: {
      a: new Machine(PROGRAM_A.program, simpleConfig()),
      b: new Machine(programB, simpleConfig()),
    },
    tracks: { a: emptyTrack(), b: emptyTrack() },
  };
}

/** Back to the starting line with cold caches, so every race starts from the same state. */
export function resetRace(race: Race): void {
  for (const id of LANE_IDS) {
    race.machines[id].flushCache();
    race.machines[id].reset();
    race.tracks[id] = emptyTrack();
  }
}

/** Remember what the UI needs from one cycle's events. */
function absorb(track: LaneTrack, events: readonly MachineEvent[]): void {
  for (const e of events) {
    if (e.kind === "memory-wait-end") track.lastAccessAddress = e.details.address;
    if (e.kind === "line-fill" && e.details.level === "L1") track.loadedLines.add(e.details.lineIndex);
  }
}

/** True once both programs have stopped. */
export function isRaceFinished(race: Race): boolean {
  return LANE_IDS.every((id) => race.machines[id].getSnapshot().halted);
}

/** What one lane produced in one shared cycle. */
export interface LaneCycle {
  readonly snapshot: MachineSnapshot;
  readonly events: readonly MachineEvent[];
}

/** Tick the shared clock once: both machines step one cycle (a finished one stays put). */
export function stepRace(race: Race): Readonly<Record<LaneId, LaneCycle>> {
  const step = (id: LaneId): LaneCycle => {
    const r = race.machines[id].stepCycle();
    absorb(race.tracks[id], r.events);
    return r;
  };
  return { a: step("a"), b: step("b") };
}

/** Tick the shared clock `cycles` times (stops early once both lanes are done). */
export function advanceRace(race: Race, cycles: number): void {
  for (let i = 0; i < cycles; i++) {
    const r = stepRace(race);
    if (r.a.snapshot.halted && r.b.snapshot.halted) return;
  }
}

/** Frozen views of both lanes for rendering. */
export function viewRace(race: Race): Readonly<Record<LaneId, LaneView>> {
  const view = (id: LaneId): LaneView => ({
    snapshot: race.machines[id].getSnapshot(),
    lastAccessAddress: race.tracks[id].lastAccessAddress,
    loadedLines: new Set(race.tracks[id].loadedLines),
  });
  return { a: view("a"), b: view("b") };
}

/** Final numbers for one lane, computed by running its program to the end. */
export interface LaneOutcome {
  readonly cycles: number;
  readonly hits: number;
  readonly misses: number;
}

/** Run a program to the end on a fresh cold simple-mode machine and report its totals. */
export function predictOutcome(program: Program): LaneOutcome {
  const s = new Machine(program, simpleConfig()).runToEnd().snapshot;
  const l1 = s.metrics.levels.L1 ?? { hits: 0, misses: 0 };
  return { cycles: s.metrics.totalCycles, hits: l1.hits, misses: l1.misses };
}

/** Outcome of a finished lane, read from its snapshot. */
export function outcomeOf(snapshot: MachineSnapshot): LaneOutcome {
  const l1 = snapshot.metrics.levels.L1 ?? { hits: 0, misses: 0 };
  return { cycles: snapshot.metrics.totalCycles, hits: l1.hits, misses: l1.misses };
}

export type Winner = "a" | "b" | "tie";

/** Which lane used fewer cycles. */
export function winnerOf(a: LaneOutcome, b: LaneOutcome): Winner {
  return a.cycles === b.cycles ? "tie" : a.cycles < b.cycles ? "a" : "b";
}

/** The result banner text, built only from computed outcomes. */
export function resultSentences(a: LaneOutcome, b: LaneOutcome): string[] {
  const out = [`Reading in order took ${a.cycles} cycles.`];
  if (b.cycles === a.cycles) out.push(`Jumping around took ${b.cycles} cycles too: no difference.`);
  else {
    const r = b.cycles / a.cycles;
    out.push(`Jumping around took ${b.cycles} cycles: ${r >= 1 ? `${r.toFixed(1)}x slower` : `${(1 / r).toFixed(1)}x faster`}.`);
  }
  const reads = a.hits + a.misses;
  out.push(
    `Only ${a.misses} of ${reads} reads went all the way to RAM in the first lane; the other ${a.hits} were already in the cache because they came along with their neighbours.`,
  );
  const bReads = b.hits + b.misses;
  out.push(
    b.hits === 0
      ? `In the second lane all ${bReads} reads went to RAM.`
      : `In the second lane ${b.misses} of ${bReads} reads went to RAM.`,
  );
  return out;
}
