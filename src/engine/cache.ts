/**
 * One cache level: fully associative with LRU replacement.
 *
 * "Fully associative" means any memory line may sit in any slot, so finding a
 * line means checking every slot. "LRU" (least recently used) means that when
 * the level is full we throw out the line that was used longest ago.
 *
 * The cache only remembers WHICH lines it holds (the tag). The actual values
 * always live in RAM — that is fine because our STORE is write-through.
 */
import type { CacheLevelConfig, CacheLevelName, CacheLevelState, CacheLineState } from "./types";

/** A mutable slot, used only inside this class. */
interface Slot {
  valid: boolean;
  tag: number;
  lastUsed: number;
}

/** Result of putting a line into the cache. */
export interface InsertResult {
  /** Which slot (0-based) now holds the new line. */
  readonly slot: number;
  /** The line that was thrown out to make room, or null if a slot was empty. */
  readonly evictedTag: number | null;
}

export class CacheLevel {
  readonly name: CacheLevelName;
  readonly latency: number;
  readonly capacity: number;
  private slots: Slot[];

  /** Create an empty cache level with `config.lines` slots. */
  constructor(config: CacheLevelConfig) {
    this.name = config.name;
    this.latency = config.latency;
    this.capacity = config.lines;
    this.slots = CacheLevel.emptySlots(config.lines);
  }

  /** Build `count` invalid (empty) slots. */
  private static emptySlots(count: number): Slot[] {
    return Array.from({ length: count }, () => ({ valid: false, tag: 0, lastUsed: 0 }));
  }

  /** Return the slot that holds `tag`, or -1 if this level does not have it. */
  find(tag: number): number {
    return this.slots.findIndex((s) => s.valid && s.tag === tag);
  }

  /** Mark a slot as just used, so LRU will keep it longer. */
  touch(slot: number, stamp: number): void {
    const s = this.slots[slot];
    if (s) s.lastUsed = stamp;
  }

  /**
   * Choose where a new line goes: the first empty slot if there is one,
   * otherwise the slot with the smallest `lastUsed` (the least recently used).
   * Ties go to the lowest slot number, so the result is always deterministic.
   */
  private victimSlot(): number {
    const empty = this.slots.findIndex((s) => !s.valid);
    if (empty !== -1) return empty;
    let best = 0;
    for (let i = 1; i < this.slots.length; i++) {
      const cur = this.slots[i];
      const bestSlot = this.slots[best];
      if (cur && bestSlot && cur.lastUsed < bestSlot.lastUsed) best = i;
    }
    return best;
  }

  /**
   * Copy memory line `tag` into this level, evicting the LRU line if the level is full.
   * If the line is already present it is just touched (no duplicate copies).
   */
  insert(tag: number, stamp: number): InsertResult {
    const existing = this.find(tag);
    if (existing !== -1) {
      this.touch(existing, stamp);
      return { slot: existing, evictedTag: null };
    }
    const slot = this.victimSlot();
    const old = this.slots[slot];
    const evictedTag = old && old.valid ? old.tag : null;
    this.slots[slot] = { valid: true, tag, lastUsed: stamp };
    return { slot, evictedTag };
  }

  /** Empty every slot (a "cold" cache). */
  flush(): void {
    this.slots = CacheLevel.emptySlots(this.capacity);
  }

  /** Frozen copy of this level for the UI. Changing it cannot affect the cache. */
  snapshot(): CacheLevelState {
    const lines: CacheLineState[] = this.slots.map((s) =>
      Object.freeze({ valid: s.valid, tag: s.tag, lastUsed: s.lastUsed }),
    );
    return Object.freeze({
      name: this.name,
      latency: this.latency,
      capacity: this.capacity,
      lines: Object.freeze(lines),
    });
  }
}
