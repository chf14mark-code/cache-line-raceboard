import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPEEDS, type RaceStatus, type Speed } from "@/hooks/use-race";
import { Switch } from "@/components/ui/switch";

const START_LABEL: Record<RaceStatus, string> = {
  ready: "Start race",
  running: "Racing…",
  paused: "Resume",
  finished: "Race again",
};

/** Start / Pause / Reset, the speed selector and the shared clock. */
export function RaceControls({
  status,
  speed,
  clock,
  onStart,
  onPause,
  onReset,
  onSpeed,
  proportional,
  onProportional,
}: {
  status: RaceStatus;
  speed: Speed;
  /** Cycles on the shared clock (read from the engine snapshots). */
  clock: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeed: (s: Speed) => void;
  proportional: boolean;
  onProportional: (on: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2">
        <Button size="lg" className="px-5 font-semibold" onClick={onStart} disabled={status === "running"}>
          <Play aria-hidden="true" />
          {START_LABEL[status]}
        </Button>
        <Button variant="secondary" onClick={onPause} disabled={status !== "running"}>
          <Pause aria-hidden="true" />
          Pause
        </Button>
        <Button variant="outline" onClick={onReset} disabled={status === "ready"}>
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
      </div>

      <div role="group" aria-label="Speed" className="flex items-center gap-1">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === speed}
            onClick={() => onSpeed(s)}
            className={`rounded px-1.5 py-1 font-mono text-xs ${
              s === speed ? "bg-primary/20 font-semibold text-primary ring-1 ring-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="flex items-baseline gap-1.5 font-mono" aria-label={`Shared clock: ${clock} cycles`}>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Clock</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">{clock}</span>
        <span className="text-xs text-muted-foreground">cycles</span>
      </div>

      <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-muted-foreground lg:ml-auto">
        <Switch checked={proportional} onCheckedChange={onProportional} />
        Proportional time (80ms per cycle)
      </label>
    </div>
  );
}
