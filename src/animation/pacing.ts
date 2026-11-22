/**
 * Presentation pacing: how long each simulated cycle stays on screen.
 *
 * It only reads what the engine reports for a cycle (events + snapshot) and never
 * changes the simulation. The cycle counter always counts every real cycle; pacing
 * only decides how much wall-clock time a cycle gets.
 */
import type { MachineEvent, MachineSnapshot } from "@/engine";

export type TimeMode = "compressed" | "proportional";

/** Reference points of the compressed scale, at 1x speed. */
export const HIT_LATENCY_REF = 3;
export const HIT_ACCESS_MS = 150;
export const RAM_LATENCY_REF = 100;
export const RAM_ACCESS_MS = 900;

/** Proportional mode: every cycle gets the same time. */
export const PROPORTIONAL_CYCLE_MS = 80;

/** A one-cycle instruction (MOV/ADD/SUB/JNZ) is shown at the pace of one cycle of an L1 hit. */
export const INSTRUCTION_CYCLE_MS = HIT_ACCESS_MS / HIT_LATENCY_REF;

/** Generic visual effect lengths at 1x (not tied to any scenario). */
export const ARRIVAL_GLOW_MS = 600;
export const EVICTION_MS = 600;

/**
 * Wall-clock time for a whole memory access of `latency` cycles (compressed mode).
 * Log scale through (3 cycles → 150 ms) and (100 cycles → 900 ms);
 * at or below 3 cycles it is linear so tiny latencies never get negative time.
 */
export function accessDurationMs(latency: number): number {
  if (latency <= HIT_LATENCY_REF) return INSTRUCTION_CYCLE_MS * latency;
  const t = Math.log(latency / HIT_LATENCY_REF) / Math.log(RAM_LATENCY_REF / HIT_LATENCY_REF);
  return HIT_ACCESS_MS + (RAM_ACCESS_MS - HIT_ACCESS_MS) * t;
}

/** What one lane did during one cycle, as far as pacing cares. */
export type CycleActivity =
  | { readonly kind: "idle" } // lane already finished
  | { readonly kind: "instruction" } // a 1-cycle instruction
  | { readonly kind: "memory"; readonly latency: number }; // part of a LOAD/STORE

/** Classify one lane's cycle from the events it produced and the snapshot after it. */
export function classifyCycle(events: readonly MachineEvent[], snapshot: MachineSnapshot): CycleActivity {
  for (const e of events) {
    if (e.kind === "memory-wait-start" || e.kind === "memory-wait-end") {
      return { kind: "memory", latency: e.details.latency };
    }
  }
  if (snapshot.inFlight) return { kind: "memory", latency: snapshot.inFlight.latency };
  if (events.some((e) => e.kind === "instruction-start")) return { kind: "instruction" };
  return { kind: "idle" };
}

/** How long this lane would like the cycle to last. */
export function laneCycleMs(activity: CycleActivity, mode: TimeMode): number {
  if (activity.kind === "idle") return 0;
  if (mode === "proportional") return PROPORTIONAL_CYCLE_MS;
  if (activity.kind === "instruction") return INSTRUCTION_CYCLE_MS;
  return accessDurationMs(activity.latency) / activity.latency;
}

/**
 * One shared clock for all lanes: a cycle lasts as long as the lane that needs the
 * most time for it, so no lane's hit or miss is ever rushed. Returns 0 when every
 * lane has finished.
 */
export function sharedCycleMs(activities: readonly CycleActivity[], mode: TimeMode): number {
  return activities.reduce((max, a) => Math.max(max, laneCycleMs(a, mode)), 0);
}
