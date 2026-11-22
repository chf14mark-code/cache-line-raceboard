import { hexAddress, lineIndexOf } from "@/engine";
import type { LaneView } from "@/lib/race";
import { BoxTitle } from "./BoxTitle";

/** The L1 cache: one row per slot with valid bit, tag (memory line) and that line's cells. */
export function CacheBox({ view }: { view: LaneView }) {
  const { snapshot } = view;
  const l1 = snapshot.levels[0];
  if (!l1) return null;
  const lineSize = snapshot.config.lineSize;
  const usedLine = view.lastAccessAddress === null ? null : lineIndexOf(view.lastAccessAddress, lineSize);

  return (
    <div className="rounded-md border border-border bg-surface-raised p-2">
      <BoxTitle note={`${l1.capacity} lines · ${l1.latency} cycles`}>{l1.name} cache</BoxTitle>
      <table className="w-full border-separate border-spacing-y-0.5 font-mono text-[11px]">
        <thead className="sr-only">
          <tr>
            <th>Slot</th>
            <th>Valid</th>
            <th>Tag (memory line)</th>
            <th>Cells</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {l1.lines.map((line, slot) => {
            const justUsed = line.valid && line.tag === usedLine;
            const first = line.tag * lineSize;
            return (
              <tr key={slot} className={line.valid ? "text-foreground" : "text-muted-foreground"}>
                <td className="w-6 text-muted-foreground">#{slot}</td>
                <td className="w-12">{line.valid ? "valid" : "empty"}</td>
                <td className="w-28 whitespace-nowrap">
                  {line.valid ? `line ${line.tag} · ${hexAddress(first)}` : "—"}
                </td>
                <td>
                  <div className="flex gap-0.5">
                    {Array.from({ length: lineSize }, (_, k) => (
                      <span
                        key={k}
                        className={`flex h-4 min-w-7 flex-1 items-center justify-center rounded-sm border tabular-nums ${
                          line.valid ? "border-accent bg-accent/15" : "border-dashed border-border"
                        }`}
                      >
                        {line.valid ? snapshot.ram[first + k] : "·"}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="w-14 whitespace-nowrap pl-1 text-primary">{justUsed ? "◀ used" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
