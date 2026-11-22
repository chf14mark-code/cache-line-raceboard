import type { LaneId } from "@/lib/race";

/** "Predict first": the user picks a lane before the race. Kept only in memory. */
export function PredictPrompt({
  prediction,
  onPredict,
  disabled,
}: {
  prediction: LaneId | null;
  onPredict: (id: LaneId) => void;
  disabled: boolean;
}) {
  const choice = (id: LaneId, label: string) => (
    <button
      type="button"
      aria-pressed={prediction === id}
      disabled={disabled}
      onClick={() => onPredict(id)}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
        prediction === id ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground hover:border-primary"
      }`}
    >
      {prediction === id ? "✓ " : ""}
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Your prediction" className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-foreground">Which lane will finish first?</span>
      {choice("a", "Read in order")}
      {choice("b", "Jump around")}
    </div>
  );
}
