import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_JUMP_STEP, MIN_JUMP_STEP } from "@/engine";
import { resultSentences, winnerOf, type LaneId, type LaneOutcome } from "@/lib/race";
import { Term } from "./Term";
import { Slider } from "@/components/ui/slider";

const NAMES: Record<LaneId, string> = { a: "Read in order", b: "Jump around" };

/** Did the user's pick match the computed winner? */
function predictionText(prediction: LaneId | null, a: LaneOutcome, b: LaneOutcome): string | null {
  if (!prediction) return null;
  const w = winnerOf(a, b);
  if (w === "tie") return `You picked "${NAMES[prediction]}". At this step it's a tie.`;
  return w === prediction
    ? `✓ You were right: "${NAMES[w]}" finished first.`
    : `✗ Not this time: you picked "${NAMES[prediction]}", but "${NAMES[w]}" finished first.`;
}

/** Shown after both lanes finish: the computed story, the step slider and the one-line idea. */
export function ResultBanner({
  a,
  b,
  prediction,
  step,
  lineSize,
  onStep,
  onRaceAgain,
}: {
  a: LaneOutcome;
  b: LaneOutcome;
  prediction: LaneId | null;
  step: number;
  lineSize: number;
  onStep: (s: number) => void;
  onRaceAgain: () => void;
}) {
  const [first, second, ...rest] = resultSentences(a, b);
  const verdict = predictionText(prediction, a, b);
  return (
    <section aria-label="Result" aria-live="polite" className="grid gap-2 rounded-lg border border-primary/40 bg-card p-3 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {verdict && <p className="text-sm font-semibold text-primary">{verdict}</p>}
          <Button size="sm" variant="outline" onClick={onRaceAgain}>
            <RotateCcw aria-hidden="true" />
            Race again
          </Button>
        </div>
        <p className="font-semibold text-foreground">
          {first} {second}
        </p>
        <p className="text-sm text-muted-foreground">
          {rest.join(" ")} (<Term k="hit">hits</Term> / <Term k="miss">misses</Term>: {a.hits}/{a.misses} vs {b.hits}/{b.misses})
        </p>
        <div className="flex flex-wrap items-baseline gap-x-4">
        <p className="text-sm text-foreground">A cache line is the group of cells the CPU fetches together.</p>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground opacity-70"
        >
          Explore deeper <ArrowRight className="h-3 w-3" aria-hidden="true" /> <span>(coming soon)</span>
        </button>
        </div>
      </div>
      <div className="space-y-2 rounded-md border border-border bg-surface-raised p-2.5">
        <label htmlFor="jump-step" className="flex items-baseline justify-between text-sm text-foreground">
          <span>Jump step</span>
          <span className="font-mono font-semibold tabular-nums">{step}</span>
        </label>
        <Slider
          id="jump-step"
          min={MIN_JUMP_STEP}
          max={MAX_JUMP_STEP}
          step={1}
          value={[step]}
          onValueChange={(v) => onStep(v[0] ?? step)}
          aria-label="Jump step for the jumping lane"
        />
        <p className="text-xs text-muted-foreground">
          The jumping lane skips ahead {step} cell{step === 1 ? "" : "s"} each read. Groups are {lineSize} cells wide. Drag to see the cost grow.
        </p>
      </div>
    </section>
  );
}
