/** Where each guided step stops to point something out. Built only from engine events. */
import type { MachineEvent } from "@/engine";
import type { PauseRule } from "./use-story-run";

function accessEnd(events: readonly MachineEvent[]) {
  for (const e of events) if (e.kind === "memory-wait-end") return e.details;
  return null;
}

/** Step 1: stop after the first trip to the warehouse and after the first desk read. */
export const inOrderPauses: PauseRule = (events, seen) => {
  const a = accessEnd(events);
  if (!a) return null;
  if (a.level !== "L1" && seen.misses === 1 && seen.hits === 0)
    return `One trip, ${a.latency} ticks — but a whole box of neighbours arrived with cell ${a.address}.`;
  if (a.level === "L1" && seen.hits === 1)
    return `Cell ${a.address} came along for free with its neighbours: no trip needed, only ${a.latency} ticks.`;
  return null;
};

/** Step 2: stop after the first two trips. */
export const jumpPauses: PauseRule = (events, seen) => {
  const a = accessEnd(events);
  if (!a || a.level === "L1") return null;
  if (seen.misses === 1) return `A whole box arrived — but the next read skips right past it.`;
  if (seen.misses === 2) return "Every read needs a new trip to the warehouse. Nothing brought back is ever reused.";
  return null;
};
