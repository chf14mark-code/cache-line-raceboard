/** Square letter badge (A / B) so a lane is identified by text, not only by its color. */
export function LaneBadge({ letter, tone }: { letter: "A" | "B"; tone: "a" | "b" }) {
  const style = tone === "a" ? "border-lane-a text-lane-a" : "border-lane-b text-lane-b";
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 font-mono text-sm font-bold ${style}`}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
