/** Plain-English sentence under the cache, built from the snapshot and animation marks. */
import { hexAddress, type MachineSnapshot } from "@/engine";
import type { LaneAnimation } from "./tracker";

export function cacheCaption(snapshot: MachineSnapshot, anim: LaneAnimation): string {
  const lineSize = snapshot.config.lineSize;
  const first = snapshot.levels[0]?.name ?? "L1";
  const f = snapshot.inFlight;
  if (f) {
    if (f.level === first) return `Hit: ${hexAddress(f.address)} is already in ${first} — ${f.latency} cycles.`;
    const start = f.lineIndex * lineSize;
    return `Miss: ${hexAddress(f.address)} is not in ${first}. Fetching its whole line (${hexAddress(start)}–${hexAddress(start + lineSize - 1)}) from ${f.level}: ${f.latency} cycles.`;
  }
  const last = anim.lastAccess;
  if (!last) return "Empty. The first read of each line has to go to RAM.";
  if (last.kind === "miss") {
    const ev = anim.lastEviction && anim.lastEviction.cycle === last.cycle ? anim.lastEviction : null;
    const evicted = ev ? ` Line ${ev.line} was evicted (least recently used).` : "";
    return `Line ${last.line} arrived as one block: ${hexAddress(last.address)} was asked for, ${lineSize - 1} cells came along for free.${evicted}`;
  }
  if (last.kind === "free-ride") {
    return `Free ride: ${hexAddress(last.address)} was already here — it came along with an earlier miss.`;
  }
  return `Hit: ${hexAddress(last.address)} read from ${first}.`;
}
