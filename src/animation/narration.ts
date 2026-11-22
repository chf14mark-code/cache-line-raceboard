/**
 * Plain-English captions built from engine events (presentation only).
 * Everyday words with the technical term in brackets: desk (cache), warehouse (RAM), tick (cycle).
 */
import type { MachineEvent } from "@/engine";

export interface Caption {
  readonly cycle: number;
  readonly text: string;
  /** What the caption is about, so the UI can choose an icon/label (never color alone). */
  readonly tone: "miss" | "hit" | "box" | "evict" | "done";
}

/** "cells 4, 5, 6, 7" for one box (cache line). */
export function boxCells(line: number, lineSize: number): string {
  return Array.from({ length: lineSize }, (_, k) => line * lineSize + k).join(", ");
}

/** Turn one cycle's events into captions, in engine order. */
export function narrate(events: readonly MachineEvent[], lineSize: number, firstLevel = "L1"): Caption[] {
  const out: Caption[] = [];
  for (const e of events) {
    switch (e.kind) {
      case "memory-wait-start": {
        const { address, level, latency } = e.details;
        out.push(
          level === firstLevel
            ? { cycle: e.cycle, tone: "hit", text: `The CPU wants cell ${address}. Already on the desk! Only ${latency} ticks.` }
            : {
                cycle: e.cycle,
                tone: "miss",
                text: `The CPU wants cell ${address}. Is it on the desk? No. Walk to the warehouse (${latency} ticks).`,
              },
        );
        break;
      }
      case "eviction":
        if (e.details.level === firstLevel)
          out.push({
            cycle: e.cycle,
            tone: "evict",
            text: `The desk is full, so the box with cells ${boxCells(e.details.lineIndex, lineSize)} goes back (the one unused the longest).`,
          });
        break;
      case "line-fill":
        if (e.details.level === firstLevel)
          out.push({
            cycle: e.cycle,
            tone: "box",
            text: `It brings back the WHOLE box: cells ${boxCells(e.details.lineIndex, lineSize)} at once.`,
          });
        break;
      case "program-end":
        out.push({ cycle: e.cycle, tone: "done", text: `Done! All reads finished after ${e.cycle} ticks.` });
        break;
      default:
        break;
    }
  }
  return out;
}
