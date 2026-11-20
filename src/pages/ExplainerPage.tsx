import { AppHeader } from "@/components/AppHeader";
import { Placeholder } from "@/components/Placeholder";
import { RaceLanePlaceholder } from "@/components/RaceLanePlaceholder";

/**
 * Tier 1 layout skeleton. Everything is a placeholder for now:
 * no numbers are shown until the engine (src/engine) computes them.
 */
export function ExplainerPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background bg-chip-grid lg:h-dvh lg:overflow-hidden">
      <AppHeader />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 lg:min-h-0">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">The question</p>
          <p className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
            Two programs each read 16 numbers from memory. Same instructions, one tiny difference.
            Which one finishes first?
          </p>
        </div>

        <div className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-[1fr_16rem]">
          <Placeholder label="Race lanes" hint="Tier 1" className="gap-3">
            <div className="flex flex-1 flex-col justify-center gap-3">
              <RaceLanePlaceholder
                letter="A"
                name="Read in order"
                description="address = address + 1"
                tone="a"
              />
              <RaceLanePlaceholder
                letter="B"
                name="Jump around"
                description="address = address + 4"
                tone="b"
              />
            </div>
          </Placeholder>

          <Placeholder label="Clock" hint="shared" className="items-stretch">
            <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4">
              <span className="font-mono text-4xl font-semibold text-foreground/40">—</span>
              <span className="font-mono text-xs text-muted-foreground">cycles</span>
            </div>
          </Placeholder>
        </div>

        <Placeholder label="Result" hint="computed by the simulator">
          <p className="mt-1 text-sm text-muted-foreground">
            Run the race to see how many cycles each program needs.
          </p>
        </Placeholder>
      </main>
    </div>
  );
}
