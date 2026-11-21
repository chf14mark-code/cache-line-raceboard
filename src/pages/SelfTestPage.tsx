import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { runSelfTests, type CheckRow, type SelfTestResult } from "@/engine";
import { cn } from "@/lib/utils";

/** Results of one run of the self-tests, plus how long it took in this browser. */
interface RunState {
  results: SelfTestResult[];
  ms: number;
}

/**
 * Engine self-test page. Runs every check from src/engine/selftest.ts in the
 * browser (after the page loads) and shows expected vs actual for each one.
 */
export function SelfTestPage() {
  const [run, setRun] = useState<RunState | null>(null);

  const runAll = useCallback(() => {
    const t0 = performance.now();
    const results = runSelfTests();
    setRun({ results, ms: performance.now() - t0 });
  }, []);

  // Run only in the browser, never during server rendering.
  useEffect(() => {
    runAll();
  }, [runAll]);

  const requested = run?.results.filter((r) => r.requested) ?? [];
  const extra = run?.results.filter((r) => !r.requested) ?? [];
  const failed = run?.results.filter((r) => !r.pass).length ?? 0;

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">Engine self-test</h1>
          <p className="text-sm text-muted-foreground">
            Runs the simulator in your browser and compares it with the numbers in SPEC.md.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runAll}
            className="rounded-md border border-primary bg-primary/15 px-3 py-1.5 font-mono text-xs font-medium text-primary hover:bg-primary/25"
          >
            Run again
          </button>
          <Link
            to="/"
            className="rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Back to the race
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:px-6">
        {run === null ? (
          <p className="font-mono text-sm text-muted-foreground" role="status">
            Running checks…
          </p>
        ) : (
          <>
            <Summary
              passedRequested={requested.filter((r) => r.pass).length}
              totalRequested={requested.length}
              passedExtra={extra.filter((r) => r.pass).length}
              totalExtra={extra.length}
              failed={failed}
              ms={run.ms}
            />
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Requested checks</h2>
            {requested.map((r) => (
              <TestCard key={r.id} result={r} />
            ))}
            <h2 className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Extra checks added by the engine
            </h2>
            {extra.map((r) => (
              <TestCard key={r.id} result={r} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}

/** Top banner with the overall verdict. */
function Summary(props: {
  passedRequested: number;
  totalRequested: number;
  passedExtra: number;
  totalExtra: number;
  failed: number;
  ms: number;
}) {
  const ok = props.failed === 0;
  return (
    <section
      role="status"
      aria-label="Summary"
      className={cn("rounded-lg border-2 p-3", ok ? "border-hit bg-hit/10" : "border-miss bg-miss/10")}
    >
      <p className="font-mono text-base font-semibold text-foreground">
        <StatusBadge pass={ok} /> {ok ? "All checks pass" : `${props.failed} check${props.failed === 1 ? "" : "s"} failed`}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Requested: {props.passedRequested}/{props.totalRequested} pass · Extra: {props.passedExtra}/{props.totalExtra}{" "}
        pass · ran in {props.ms.toFixed(1)} ms
      </p>
    </section>
  );
}

/** "✓ PASS" / "✗ FAIL" — icon and word, so meaning never depends on color alone. */
function StatusBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs font-bold",
        pass ? "bg-hit/20 text-hit" : "bg-miss/20 text-miss",
      )}
    >
      <span aria-hidden="true">{pass ? "✓" : "✗"}</span>
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

/** Show a value; booleans become yes/no. */
function show(v: CheckRow["expected"]): string {
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

/** Difference column: actual − expected for numbers that disagree. */
function difference(r: CheckRow): string {
  if (r.pass) return "";
  if (typeof r.expected === "number" && typeof r.actual === "number") {
    const d = r.actual - r.expected;
    return `${d > 0 ? "+" : ""}${d}`;
  }
  return "differs";
}

/** One test: title, expected-vs-actual table, and the engine's explanation. */
function TestCard({ result }: { result: SelfTestResult }) {
  return (
    <section
      aria-label={`Check ${result.id}`}
      className={cn("rounded-lg border bg-card p-3", result.pass ? "border-border" : "border-miss")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge pass={result.pass} />
        <h3 className="font-mono text-sm font-semibold text-foreground">
          {result.id}. {result.title}
        </h3>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left font-mono text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">Check</th>
              <th className="py-1 pr-3 font-medium">Expected</th>
              <th className="py-1 pr-3 font-medium">Actual (engine)</th>
              <th className="py-1 pr-3 font-medium">Difference</th>
              <th className="py-1 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={r.label} className="border-t border-border/60 align-top">
                <td className="py-1 pr-3 text-foreground">{r.label}</td>
                <td className="max-w-[16rem] break-all py-1 pr-3 text-foreground">{show(r.expected)}</td>
                <td className="max-w-[16rem] break-all py-1 pr-3 text-foreground">{show(r.actual)}</td>
                <td className="py-1 pr-3 text-miss">{difference(r)}</td>
                <td className="py-1">
                  <StatusBadge pass={r.pass} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{result.explanation}</p>
      {!result.pass && (
        <p className="mt-1 text-sm text-miss">
          The engine disagrees with the expected value. The numbers were not adjusted: the explanation above shows how
          the engine counted, so the spec or the engine can be corrected on purpose.
        </p>
      )}
    </section>
  );
}
