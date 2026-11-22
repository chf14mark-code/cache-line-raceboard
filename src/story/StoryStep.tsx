import { useEffect, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MachineSnapshot, Program } from "@/engine";
import { CaptionBar } from "./CaptionBar";
import { Desk } from "./Desk";
import { StoryDetails } from "./StoryDetails";
import { TickCounter } from "./TickCounter";
import { useStoryRun, type PauseRule } from "./use-story-run";
import { Warehouse } from "./Warehouse";

/** One guided run: warehouse, desk, ticks, captions, and Resume/Next controls. */
export function StoryStep({
  program,
  pauseRule,
  nextLabel,
  onDone,
}: {
  program: Program;
  pauseRule: PauseRule;
  nextLabel: string;
  onDone: (final: MachineSnapshot) => void;
}) {
  const [speed, setSpeed] = useState(1);
  const [details, setDetails] = useState(false);
  const run = useStoryRun(program, pauseRule, speed);
  const finished = run.status === "finished";

  useEffect(() => {
    if (finished) document.getElementById("story-next")?.focus();
  }, [finished]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Warehouse snapshot={run.snapshot} anim={run.anim} />
        <div className="flex flex-col gap-4">
          <TickCounter snapshot={run.snapshot} />
          <Desk snapshot={run.snapshot} anim={run.anim} />
        </div>
      </div>

      <CaptionBar captions={run.captions} note={run.note} />

      <div className="flex flex-wrap items-center gap-3">
        {run.status === "paused" ? (
          <Button size="lg" onClick={run.resume} className="text-base">
            <Play aria-hidden="true" /> Resume
          </Button>
        ) : run.status === "running" ? (
          <Button size="lg" variant="secondary" onClick={run.pause} className="text-base">
            <Pause aria-hidden="true" /> Pause
          </Button>
        ) : null}
        {!finished && (
          <Button size="lg" variant="ghost" onClick={run.finish} className="text-base">
            <SkipForward aria-hidden="true" /> Skip to the end
          </Button>
        )}
        {finished && (
          <>
            <Button id="story-next" size="lg" onClick={() => onDone(run.snapshot)} className="animate-start-pulse text-base">
              {nextLabel} →
            </Button>
            <Button size="lg" variant="ghost" onClick={run.restart} className="text-base">
              Watch again
            </Button>
          </>
        )}
        <button
          type="button"
          aria-expanded={details}
          onClick={() => setDetails((d) => !d)}
          className="ml-auto text-base text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
        >
          {details ? "Hide details" : "Show details"}
        </button>
      </div>

      {details && <StoryDetails snapshot={run.snapshot} program={program} speed={speed} onSpeed={setSpeed} />}
    </div>
  );
}
