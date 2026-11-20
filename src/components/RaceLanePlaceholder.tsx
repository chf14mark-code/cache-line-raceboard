/** Empty race lane: name, program description and an empty track. Cycle counts come from the engine later. */
export function RaceLanePlaceholder({
  letter,
  name,
  description,
  tone,
}: {
  letter: "A" | "B";
  name: string;
  description: string;
  tone: "a" | "b";
}) {
  const badge = tone === "a" ? "border-lane-a text-lane-a" : "border-lane-b text-lane-b";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border font-mono text-sm font-bold ${badge}`}
          aria-hidden="true"
        >
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            <span className="sr-only">Lane {letter}: </span>
            {name}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">— cycles</span>
      </div>
      <div className="h-8 rounded bg-track bg-chip-grid" aria-hidden="true" />
    </div>
  );
}
