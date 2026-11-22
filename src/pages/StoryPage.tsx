import { useState } from "react";
import { PROGRAM_A, PROGRAM_B, type MachineSnapshot } from "@/engine";
import { outcomeOf, type LaneOutcome } from "@/lib/race";
import { Finale } from "@/story/Finale";
import { StoryStep } from "@/story/StoryStep";
import { inOrderPauses, jumpPauses } from "@/story/pause-rules";
import { ExplainerPage } from "./ExplainerPage";

type Step = 1 | 2 | 3;

const INTRO: Record<Step, string> = {
  1: "Watch what happens when we read cells 0, 1, 2, 3, … in order.",
  2: "Now read every 4th cell: 0, 4, 8, 12, …",
  3: "Same 16 reads, two very different totals.",
};

/** Default view: a guided 3-step story, one lane at a time. The old race stays one click away. */
export function StoryPage() {
  const [step, setStep] = useState<Step>(1);
  const [a, setA] = useState<LaneOutcome | null>(null);
  const [b, setB] = useState<LaneOutcome | null>(null);
  const [racing, setRacing] = useState(false);

  if (racing) return <ExplainerPage onBack={() => setRacing(false)} />;

  return (
    <div className="min-h-dvh bg-background bg-chip-grid">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Reading memory in order vs jumping around - why is one faster?
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <ol className="flex gap-1" aria-label="Progress">
              {([1, 2, 3] as const).map((n) => (
                <li
                  key={n}
                  aria-current={n === step ? "step" : undefined}
                  className={`rounded-full border px-3 py-0.5 text-sm ${n === step ? "border-primary font-semibold text-primary" : "border-border text-muted-foreground"}`}
                >
                  {n < step ? "✓ " : ""}Step {n}
                </li>
              ))}
            </ol>
            <p className="text-lg text-foreground">{INTRO[step]}</p>
          </div>
        </header>

        {step === 1 && (
          <StoryStep
            key="a"
            program={PROGRAM_A.program}
            pauseRule={inOrderPauses}
            nextLabel="Next"
            onDone={(s: MachineSnapshot) => {
              setA(outcomeOf(s));
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StoryStep
            key="b"
            program={PROGRAM_B.program}
            pauseRule={jumpPauses}
            nextLabel="Compare"
            onDone={(s: MachineSnapshot) => {
              setB(outcomeOf(s));
              setStep(3);
            }}
          />
        )}
        {step === 3 && a && b && <Finale a={a} b={b} onRace={() => setRacing(true)} />}

        {step === 3 && <p className="text-base text-muted-foreground">
          Words used: desk = cache, warehouse = RAM, tick = one CPU cycle.
        </p>}
      </main>
    </div>
  );
}
