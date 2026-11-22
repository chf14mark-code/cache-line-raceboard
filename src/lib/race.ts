/**
 * The race: programs A and B on two identical simple-mode machines that share ONE clock.
 * `advanceRace(race, n)` moves both machines forward by the same n cycles, so their
 * cycle counters are always directly comparable. Plain TypeScript, no React.
 */
import { Machine, PROGRAM_A, PROGRAM_B, simpleConfig, type MachineEvent, type MachineSnapshot } from "@/engine";

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
export function createRace(): Race {
  return {
    machines: {
      a: new Machine(PROGRAM_A.program, simpleConfig()),
      b: new Machine(PROGRAM_B.program, simpleConfig()),
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
