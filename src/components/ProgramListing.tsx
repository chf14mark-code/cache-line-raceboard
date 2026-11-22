import { describeInstruction, type MachineSnapshot, type Program } from "@/engine";

/** Assembly listing with a plain-English line for every instruction. */
export function ProgramListing({
  id,
  program,
  snapshot,
  differs,
}: {
  id: string;
  program: Program;
  snapshot: MachineSnapshot;
  /** Instruction indexes that differ from the other lane's program. */
  differs: ReadonlySet<number>;
}) {
  return (
    <ol id={id} className="flex flex-col gap-0.5 rounded-md border border-border bg-surface-raised p-1.5">
      {program.map((ins, i) => {
        const current = !snapshot.halted && snapshot.pc === i;
        return (
          <li
            key={i}
            aria-current={current ? "step" : undefined}
            className={`grid grid-cols-[1rem_1rem_9rem_1fr] items-baseline gap-1 rounded px-1 text-[11px] ${current ? "bg-primary/15" : ""}`}
          >
            <span className="font-mono text-primary">{current ? "▶" : ""}</span>
            <span className="font-mono text-muted-foreground">{i}</span>
            <code className="font-mono text-foreground">{ins.text}</code>
            <span className="text-muted-foreground">
              {describeInstruction(ins, i)}
              {differs.has(i) && <strong className="ml-1 font-medium text-primary">← the only difference</strong>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
