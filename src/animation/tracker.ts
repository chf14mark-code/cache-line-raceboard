/**
 * Turns engine events into the marks the animation layer draws
 * (last hit, arriving line, evicted line, cells that came along for free).
 * Plain TypeScript. Reads events only; never touches the machine.
 */
import { lineIndexOf, type CacheLevelName, type MachineEvent, type MemoryLevelName } from "@/engine";

/** How a finished LOAD/STORE was served. "free-ride" = L1 hit on a cell that came along with an earlier miss. */
export type AccessKind = "miss" | "hit" | "free-ride";

export interface AccessMark {
  readonly seq: number;
  readonly cycle: number;
  readonly address: number;
  readonly line: number;
  readonly kind: AccessKind;
  readonly level: MemoryLevelName;
}

export interface SlotMark {
  readonly seq: number;
  readonly cycle: number;
  readonly line: number;
  readonly slot: number;
}

export interface HitMark {
  readonly seq: number;
  readonly cycle: number;
  readonly address: number;
}

/** Frozen view for rendering. */
export interface LaneAnimation {
  readonly lastAccess: AccessMark | null;
  readonly lastHit: HitMark | null;
  readonly lastFill: SlotMark | null;
  readonly lastEviction: SlotMark | null;
  /** Addresses brought into L1 as neighbours of a miss and not read since. */
  readonly freeCells: ReadonlySet<number>;
}

export const EMPTY_ANIMATION: LaneAnimation = {
  lastAccess: null,
  lastHit: null,
  lastFill: null,
  lastEviction: null,
  freeCells: new Set(),
};

export class AnimationTracker {
  /** Increases on every mark so CSS animations can restart (used as a React key). */
  private seq = 0;
  private lastAccess: AccessMark | null = null;
  private lastHit: HitMark | null = null;
  private lastFill: SlotMark | null = null;
  private lastEviction: SlotMark | null = null;
  private freeCells = new Set<number>();

  /** `firstLevel` is the cache closest to the CPU (L1). */
  constructor(private readonly firstLevel: CacheLevelName = "L1") {}

  /** Forget everything (used when the race restarts with cold caches). */
  reset(): void {
    this.seq = 0;
    this.lastAccess = null;
    this.lastHit = null;
    this.lastFill = null;
    this.lastEviction = null;
    this.freeCells = new Set();
  }

  /** Read one cycle's events, in the order the engine emitted them. */
  absorb(events: readonly MachineEvent[], lineSize: number): void {
    for (const e of events) {
      switch (e.kind) {
        case "hit":
          if (e.details.level === this.firstLevel) {
            this.lastHit = { seq: ++this.seq, cycle: e.cycle, address: e.details.address };
          }
          break;
        case "eviction":
          if (e.details.level === this.firstLevel) {
            this.lastEviction = { seq: ++this.seq, cycle: e.cycle, line: e.details.lineIndex, slot: e.details.slot };
            // The evicted line's cells are gone from the cache: no longer "free".
            for (let k = 0; k < lineSize; k++) this.freeCells.delete(e.details.lineIndex * lineSize + k);
          }
          break;
        case "line-fill":
          if (e.details.level === this.firstLevel) {
            this.lastFill = { seq: ++this.seq, cycle: e.cycle, line: e.details.lineIndex, slot: e.details.slot };
            // The whole line arrives; the requested cell is removed below at memory-wait-end.
            for (let k = 0; k < lineSize; k++) this.freeCells.add(e.details.lineIndex * lineSize + k);
          }
          break;
        case "memory-wait-end": {
          const address = e.details.address;
          const inL1 = e.details.level === this.firstLevel;
          const kind: AccessKind = !inL1 ? "miss" : this.freeCells.has(address) ? "free-ride" : "hit";
          this.freeCells.delete(address);
          this.lastAccess = {
            seq: ++this.seq,
            cycle: e.cycle,
            address,
            line: lineIndexOf(address, lineSize),
            kind,
            level: e.details.level,
          };
          break;
        }
        default:
          break;
      }
    }
  }

  /** Frozen copy for the UI. */
  view(): LaneAnimation {
    return {
      lastAccess: this.lastAccess,
      lastHit: this.lastHit,
      lastFill: this.lastFill,
      lastEviction: this.lastEviction,
      freeCells: new Set(this.freeCells),
    };
  }
}
