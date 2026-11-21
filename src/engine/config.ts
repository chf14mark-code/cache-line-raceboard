/**
 * Ready-made machine configurations from SPEC.md.
 */
import type { LineSize, MachineConfig } from "./types";

/** The line sizes the UI may offer. */
export const LINE_SIZES: readonly LineSize[] = [2, 4, 8, 16];

/** Shared defaults: 256 memory cells, RAM costs 100 cycles, safety stop at 100000 cycles. */
const MEMORY_SIZE = 256;
const RAM_LATENCY = 100;
const MAX_CYCLES = 100_000;

/** Simple mode: one small L1 cache (4 lines, 3 cycles) in front of RAM. */
export function simpleConfig(lineSize: LineSize = 4): MachineConfig {
  return {
    mode: "simple",
    lineSize,
    levels: [{ name: "L1", lines: 4, latency: 3 }],
    ramLatency: RAM_LATENCY,
    memorySize: MEMORY_SIZE,
    maxCycles: MAX_CYCLES,
  };
}

/** Full mode: L1 (8 lines, 3 cycles), L2 (16 lines, 10), L3 (32 lines, 30), then RAM. */
export function fullConfig(lineSize: LineSize = 4): MachineConfig {
  return {
    mode: "full",
    lineSize,
    levels: [
      { name: "L1", lines: 8, latency: 3 },
      { name: "L2", lines: 16, latency: 10 },
      { name: "L3", lines: 32, latency: 30 },
    ],
    ramLatency: RAM_LATENCY,
    memorySize: MEMORY_SIZE,
    maxCycles: MAX_CYCLES,
  };
}

/** Line index for an address: which group of `lineSize` cells the address belongs to. */
export function lineIndexOf(address: number, lineSize: number): number {
  return Math.floor(address / lineSize);
}
