import { AppHeader } from "@/components/AppHeader";
import { RaceControls } from "@/components/RaceControls";
import { RaceLane } from "@/components/RaceLane";
import { useMemo, useState } from "react";
import { PredictPrompt } from "@/components/PredictPrompt";
import { ResultBanner } from "@/components/ResultBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PROGRAM_A, PROGRAM_B, makeJumpProgram, type Program } from "@/engine";
import { outcomeOf, type LaneId } from "@/lib/race";
import { useRace } from "@/hooks/use-race";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Indexes of instructions whose text differs between two programs. */
function differingLines(p: Program, q: Program): ReadonlySet<number> {
  const out = new Set<number>();
  for (let i = 0; i < Math.max(p.length, q.length); i++) {
    if (p[i]?.text !== q[i]?.text) out.add(i);
  }
  return out;
}

/** How far the address register R2 moves each loop, read from the program itself. */
function strideText(program: Program): string {
  const step = program.find((ins) => ins.op === "ADD" && ins.rd === 2 && ins.src.kind === "imm");
  if (!step || step.op !== "ADD" || step.src.kind !== "imm") return "";
  const n = step.src.value;
  return n === 1 ? "reads the next cell each time" : `skips ahead ${n} cells each time`;
}


/** Tier 1: two machines race on one shared clock; every number comes from the engine. */
export function ExplainerPage({ onBack }: { onBack?: () => void } = {}) {
  const [step, setStep] = useState(4);
  const jump = useMemo(() => (step === 4 ? PROGRAM_B : makeJumpProgram(step)), [step]);
  const differs = useMemo(() => differingLines(PROGRAM_A.program, PROGRAM_B.program), []);
  const [prediction, setPrediction] = useState<LaneId | null>(null);
  const race = useRace(jump.program);
  const reduced = useReducedMotion();
  const { a, b } = race.view;
  const clock = Math.max(a.snapshot.cycle, b.snapshot.cycle);

  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex min-h-dvh flex-col bg-background bg-chip-grid">
      <AppHeader />
      {onBack && (
        <button type="button" onClick={onBack} className="self-start px-6 pt-2 text-base text-muted-foreground underline underline-offset-4 hover:text-foreground">
          ← Back to the story
        </button>
      )}

      <main className="flex flex-1 flex-col gap-3 px-4 py-3 sm:px-6">
        {race.status !== "finished" && <RaceControls
          status={race.status}
          speed={race.speed}
          clock={clock}
          onStart={race.start}
          onPause={race.pause}
          onReset={race.reset}
          onSpeed={race.setSpeed}
          proportional={race.proportional}
          onProportional={race.setProportional}
          canStart={prediction !== null}
        >
          {race.status === "ready" && <PredictPrompt prediction={prediction} onPredict={setPrediction} disabled={false} />}
        </RaceControls>}

        <div className="grid gap-3 lg:grid-cols-2">
          <RaceLane lane={PROGRAM_A} tone="a" summary={strideText(PROGRAM_A.program)} view={a} anim={race.anim.a} speed={race.speed} reduced={reduced} differs={differs} />
          <RaceLane lane={jump} tone="b" summary={strideText(jump.program)} view={b} anim={race.anim.b} speed={race.speed} reduced={reduced} differs={differs} />
        </div>

        {race.status === "finished" && (
          <ResultBanner
            a={outcomeOf(a.snapshot)}
            b={outcomeOf(b.snapshot)}
            prediction={prediction}
            step={step}
            lineSize={a.snapshot.config.lineSize}
            onStep={setStep}
            onRaceAgain={race.start}
          />
        )}
      </main>
    </div>
    </TooltipProvider>
  );
}
