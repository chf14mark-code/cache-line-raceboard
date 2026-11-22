import { useCallback, useEffect, useRef, useState } from "react";
import { classifyCycle, sharedCycleMs, type TimeMode } from "@/animation/pacing";
import { AnimationTracker, type LaneAnimation } from "@/animation/tracker";
import type { Program } from "@/engine";
import { advanceRace, createRace, isRaceFinished, resetRace, stepRace, viewRace, type LaneId, type Race } from "@/lib/race";

export type RaceStatus = "ready" | "running" | "paused" | "finished";

/** Speed multipliers offered in the UI. */
export const SPEEDS = [0.25, 0.5, 1, 2, 5, 10] as const;
export type Speed = (typeof SPEEDS)[number];

/** Ignore long gaps (e.g. a background tab) so the race never jumps ahead. */
const MAX_FRAME_MS = 100;
/** Safety cap on cycles computed in one animation frame. */
const MAX_STEPS_PER_FRAME = 5000;

type Trackers = Record<LaneId, AnimationTracker>;

/** Frozen animation marks for both lanes. */
function viewAnimations(t: Trackers): Readonly<Record<LaneId, LaneAnimation>> {
  return { a: t.a.view(), b: t.b.view() };
}

/**
 * Runs the race on one animation-frame loop with ONE shared clock.
 * Each step advances both machines by exactly one cycle, then waits as long as
 * the pacing rule says that cycle should stay on screen (scaled by speed).
 */
export function useRace(programB: Program) {
  const raceRef = useRef<Race | null>(null);
  const programRef = useRef<Program>(programB);
  if (raceRef.current === null || programRef.current !== programB) {
    // A new jump step: rebuild the race from scratch (cold caches, cycle 0).
    raceRef.current = createRace(programB);
    programRef.current = programB;
  }
  const race = raceRef.current;

  const trackersRef = useRef<Trackers | null>(null);
  if (trackersRef.current === null) trackersRef.current = { a: new AnimationTracker(), b: new AnimationTracker() };
  const trackers = trackersRef.current;

  /** Wall-clock budget (ms at 1x) and how long the cycle on screen still needs. */
  const clockRef = useRef<{ budget: number; pendingMs: number | null }>({ budget: 0, pendingMs: null });

  const [view, setView] = useState(() => viewRace(race));
  const [anim, setAnim] = useState(() => viewAnimations(trackers));
  const [status, setStatus] = useState<RaceStatus>("ready");
  const [speed, setSpeed] = useState<Speed>(1);
  const [proportional, setProportional] = useState(false);

  const speedRef = useRef<Speed>(speed);
  const modeRef = useRef<TimeMode>("compressed");
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    modeRef.current = proportional ? "proportional" : "compressed";
  }, [proportional]);

  useEffect(() => {
    if (status !== "running") return;
    const clock = clockRef.current;
    let frame = 0;
    let last: number | null = null;

    const tick = (now: number) => {
      if (last !== null) clock.budget += Math.min(now - last, MAX_FRAME_MS) * speedRef.current;
      last = now;

      let stepped = false;
      for (let guard = 0; guard < MAX_STEPS_PER_FRAME; guard++) {
        if (clock.pendingMs === null) {
          if (isRaceFinished(race)) break;
          const r = stepRace(race);
          stepped = true;
          trackers.a.absorb(r.a.events, r.a.snapshot.config.lineSize);
          trackers.b.absorb(r.b.events, r.b.snapshot.config.lineSize);
          clock.pendingMs = sharedCycleMs(
            [classifyCycle(r.a.events, r.a.snapshot), classifyCycle(r.b.events, r.b.snapshot)],
            modeRef.current,
          );
        }
        if (clock.budget < clock.pendingMs) break;
        clock.budget -= clock.pendingMs;
        clock.pendingMs = null;
      }

      if (stepped) {
        setView(viewRace(race));
        setAnim(viewAnimations(trackers));
      }
      if (isRaceFinished(race)) {
        setStatus("finished");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, race, trackers]);

  /** Cold caches, cycle 0, no marks. */
  // When the program changes, show the fresh race and go back to the start line.
  // If a race had already finished, run the new one straight to the end so the
  // result updates live; otherwise go back to the start line.
  const statusRef = useRef<RaceStatus>("ready");
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const firstRace = useRef(race);
  useEffect(() => {
    if (firstRace.current === race) return;
    firstRace.current = race;
    trackers.a.reset();
    trackers.b.reset();
    clockRef.current = { budget: 0, pendingMs: null };
    const finished = statusRef.current === "finished";
    if (finished) advanceRace(race, Number.MAX_SAFE_INTEGER);
    setView(viewRace(race));
    setAnim(viewAnimations(trackers));
    setStatus(finished ? "finished" : "ready");
  }, [race, trackers]);

  const restart = useCallback(() => {
    resetRace(race);
    trackers.a.reset();
    trackers.b.reset();
    clockRef.current = { budget: 0, pendingMs: null };
    setView(viewRace(race));
    setAnim(viewAnimations(trackers));
  }, [race, trackers]);

  const start = useCallback(() => {
    if (status === "finished") restart();
    setStatus("running");
  }, [status, restart]);

  const pause = useCallback(() => {
    setStatus((s) => (s === "running" ? "paused" : s));
  }, []);

  const reset = useCallback(() => {
    restart();
    setStatus("ready");
  }, [restart]);

  return { view, anim, status, speed, setSpeed, proportional, setProportional, start, pause, reset };
}
