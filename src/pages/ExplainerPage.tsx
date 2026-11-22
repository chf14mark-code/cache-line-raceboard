import { AppHeader } from "@/components/AppHeader";
import { RaceControls } from "@/components/RaceControls";
import { RaceLane } from "@/components/RaceLane";
import { RaceResults } from "@/components/RaceResults";
import { PROGRAM_A, PROGRAM_B, type Program } from "@/engine";
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
  return `next address = address + ${n} (${n === 1 ? "the neighbouring cell" : `skip ${n - 1} cells`})`;
}

const DIFFERS = differingLines(PROGRAM_A.program, PROGRAM_B.program);

/** Tier 1: two machines race on one shared clock; every number comes from the engine. */
export function ExplainerPage() {
  const race = useRace();
  const reduced = useReducedMotion();
  const { a, b } = race.view;
  const clock = Math.max(a.snapshot.cycle, b.snapshot.cycle);

  return (
    <div className="flex min-h-dvh flex-col bg-background bg-chip-grid">
      <AppHeader />

      <main className="flex flex-1 flex-col gap-3 px-4 py-3 sm:px-6">
        <RaceControls
          status={race.status}
          speed={race.speed}
          clock={clock}
          onStart={race.start}
          onPause={race.pause}
          onReset={race.reset}
          onSpeed={race.setSpeed}
          proportional={race.proportional}
          onProportional={race.setProportional}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <RaceLane lane={PROGRAM_A} tone="a" summary={strideText(PROGRAM_A.program)} view={a} anim={race.anim.a} speed={race.speed} reduced={reduced} differs={DIFFERS} />
          <RaceLane lane={PROGRAM_B} tone="b" summary={strideText(PROGRAM_B.program)} view={b} anim={race.anim.b} speed={race.speed} reduced={reduced} differs={DIFFERS} />
        </div>

        <RaceResults
          a={{ program: PROGRAM_A, tone: "a", view: a }}
          b={{ program: PROGRAM_B, tone: "b", view: b }}
          status={race.status}
        />
      </main>
    </div>
  );
}
