import { useCallback, useEffect, useRef, useState } from "react";
import { narrate, type Caption } from "@/animation/narration";
import { classifyCycle, laneCycleMs } from "@/animation/pacing";
import { AnimationTracker, type LaneAnimation } from "@/animation/tracker";
import { Machine, simpleConfig, type MachineEvent, type MachineSnapshot, type Program } from "@/engine";

export type RunStatus = "running" | "paused" | "finished";

/** Decides, from one cycle's events, whether the story should stop and point something out. */
export type PauseRule = (events: readonly MachineEvent[], seen: { misses: number; hits: number }) => string | null;

const MAX_FRAME_MS = 100;

/** Runs ONE machine with the compressed pacing, narrating events and pausing where the rule says. */
export function useStoryRun(program: Program, pauseRule: PauseRule, speed: number) {
  const make = () => ({ machine: new Machine(program, simpleConfig()), tracker: new AnimationTracker() });
  const ref = useRef<ReturnType<typeof make> | null>(null);
  const progRef = useRef<Program | null>(null);
  if (ref.current === null || progRef.current !== program) {
    ref.current = make();
    progRef.current = program;
  }
  const run = ref.current;
  const lineSize = run.machine.getSnapshot().config.lineSize;

  const [snapshot, setSnapshot] = useState<MachineSnapshot>(() => run.machine.getSnapshot());
  const [anim, setAnim] = useState<LaneAnimation>(() => run.tracker.view());
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [status, setStatus] = useState<RunStatus>("running");
  const [note, setNote] = useState<string | null>(null);
  const seen = useRef({ misses: 0, hits: 0 });
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // New program: start over.
  useEffect(() => {
    seen.current = { misses: 0, hits: 0 };
    setSnapshot(run.machine.getSnapshot());
    setAnim(run.tracker.view());
    setCaptions([]);
    setNote(null);
    setStatus("running");
  }, [run]);

  /** Advance one cycle; returns a pause note if the rule fired. */
  const stepOnce = useCallback(() => {
    const r = run.machine.stepCycle();
    run.tracker.absorb(r.events, lineSize);
    for (const e of r.events) {
      if (e.kind === "memory-wait-end") {
        if (e.details.level === "L1") seen.current.hits++;
        else seen.current.misses++;
      }
    }
    const said = narrate(r.events, lineSize);
    return { r, said, pause: pauseRule(r.events, seen.current) };
  }, [run, lineSize, pauseRule]);

  useEffect(() => {
    if (status !== "running") return;
    let frame = 0;
    let last: number | null = null;
    let budget = 0;
    let pending: number | null = null;
    const tick = (now: number) => {
      if (last !== null) budget += Math.min(now - last, MAX_FRAME_MS) * speedRef.current;
      last = now;
      const newCaps: Caption[] = [];
      let stepped = false;
      let pauseNote: string | null = null;
      for (let g = 0; g < 5000 && !run.machine.getSnapshot().halted; g++) {
        if (pending === null) {
          const { r, said, pause } = stepOnce();
          stepped = true;
          newCaps.push(...said);
          pending = laneCycleMs(classifyCycle(r.events, r.snapshot), "compressed");
          if (pause) {
            pauseNote = pause;
            break;
          }
        }
        if (budget < pending) break;
        budget -= pending;
        pending = null;
      }
      if (stepped) {
        setSnapshot(run.machine.getSnapshot());
        setAnim(run.tracker.view());
        if (newCaps.length) setCaptions((c) => [...c, ...newCaps].slice(-6));
      }
      if (pauseNote) {
        setNote(pauseNote);
        setStatus("paused");
        return;
      }
      if (run.machine.getSnapshot().halted) {
        setStatus("finished");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, run, stepOnce]);

  const resume = useCallback(() => {
    setNote(null);
    setStatus((s) => (s === "paused" ? "running" : s));
  }, []);
  const pause = useCallback(() => setStatus((s) => (s === "running" ? "paused" : s)), []);

  /** Jump to the end instantly (no more pauses). */
  const finish = useCallback(() => {
    const caps: Caption[] = [];
    while (!run.machine.getSnapshot().halted) caps.push(...stepOnce().said);
    setSnapshot(run.machine.getSnapshot());
    setAnim(run.tracker.view());
    setCaptions((c) => [...c, ...caps].slice(-6));
    setNote(null);
    setStatus("finished");
  }, [run, stepOnce]);

  const restart = useCallback(() => {
    ref.current = make();
    progRef.current = program;
    // Force the reset effect by updating state through a fresh run object.
    seen.current = { misses: 0, hits: 0 };
    setSnapshot(ref.current.machine.getSnapshot());
    setAnim(ref.current.tracker.view());
    setCaptions([]);
    setNote(null);
    setStatus("running");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program]);

  return { snapshot, anim, captions, status, note, resume, pause, finish, restart };
}
