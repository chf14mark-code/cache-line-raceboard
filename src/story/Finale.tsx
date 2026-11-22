import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_JUMP_STEP, MIN_JUMP_STEP, PROGRAM_A, makeJumpProgram } from "@/engine";
import { predictOutcome, type LaneOutcome } from "@/lib/race";
import { Slider } from "@/components/ui/slider";

/** "3.3x slower" / "just as fast", from two computed totals. */
export function comparison(a: LaneOutcome, b: LaneOutcome): string {
  if (a.cycles === b.cycles) return "Same amount of data, just as fast.";
  const r = b.cycles / a.cycles;
  return r > 1 ? `Same amount of data, ${r.toFixed(1)}x slower.` : `Same amount of data, ${(1 / r).toFixed(1)}x faster.`;
}

function Total({ label, o, mark }: { label: string; o: LaneOutcome; mark: string }) {
  return (
    <div className="flex-1 rounded-lg border-2 border-border bg-card p-4">
      <p className="text-lg text-muted-foreground">
        {mark} {label}
      </p>
      <p className="font-mono text-5xl font-bold tabular-nums text-foreground">
        {o.cycles} <span className="text-xl font-normal text-muted-foreground">ticks</span>
      </p>
      <p className="text-base text-muted-foreground">
        {o.misses} trips to the warehouse · {o.hits} reads from the desk
      </p>
    </div>
  );
}

/** Step 3: both totals, one computed sentence, then the ways to go further. */
export function Finale({ a, b, onRace }: { a: LaneOutcome; b: LaneOutcome; onRace: () => void }) {
  const [tryStep, setTryStep] = useState(false);
  const [step, setStep] = useState(MAX_JUMP_STEP);
  const tried = useMemo(() => predictOutcome(makeJumpProgram(step).program), [step]);
  const base = useMemo(() => predictOutcome(PROGRAM_A.program), []);
  const lineSize = 4;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Total label="In order (0, 1, 2, 3, …)" o={a} mark="①" />
        <Total label="Jumping (0, 4, 8, 12, …)" o={b} mark="②" />
      </div>
      <div className="rounded-lg border-2 border-primary/50 bg-card px-5 py-4">
        <p className="text-2xl font-semibold text-foreground">
          In order: {a.cycles} ticks. Jumping: {b.cycles} ticks. {comparison(a, b)}
        </p>
        <p className="mt-1 text-lg text-foreground">
          Each trip to the warehouse brings a whole box of {lineSize} cells, so reading neighbours is nearly free.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={onRace} className="text-base">
          Race both at once
        </Button>
        <Button size="lg" variant="secondary" aria-expanded={tryStep} onClick={() => setTryStep((v) => !v)} className="text-base">
          Try a different step size (1–4)
        </Button>
        <button type="button" disabled className="inline-flex items-center gap-1 text-base text-muted-foreground opacity-70">
          Explore deeper <ArrowRight className="h-4 w-4" aria-hidden="true" /> (coming soon)
        </button>
      </div>

      {tryStep && (
        <div className="max-w-xl space-y-3 rounded-lg border border-border bg-card p-4">
          <label htmlFor="try-step" className="flex items-baseline justify-between text-lg text-foreground">
            <span>Read every {step === 1 ? "cell" : `${step}th cell`}</span>
            <span className="font-mono font-semibold">step {step}</span>
          </label>
          <Slider id="try-step" min={MIN_JUMP_STEP} max={MAX_JUMP_STEP} step={1} value={[step]} onValueChange={(v) => setStep(v[0] ?? step)} />
          <p className="text-lg text-foreground">
            {tried.cycles} ticks, {tried.misses} trips to the warehouse. {comparison(base, tried)}
          </p>
        </div>
      )}
    </div>
  );
}
