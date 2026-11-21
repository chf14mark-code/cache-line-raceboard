import { useCallback, useEffect, useRef, useState } from "react";
import { advanceRace, createRace, isRaceFinished, resetRace, viewRace, type Race } from "@/lib/race";

export type RaceStatus = "ready" | "running" | "paused" | "finished";

/** Speed multipliers offered in the UI. */
export const SPEEDS = [0.25, 0.5, 1, 2, 5, 10] as const;
export type Speed = (typeof SPEEDS)[number];

/** Clock rate at 1x: simulated cycles per real second. */
const CYCLES_PER_SECOND = 60;
/** Ignore long gaps (e.g. a background tab) so the race never jumps ahead. */
const MAX_FRAME_MS = 100;

/**
 * Runs the race on one animation-frame loop. Every frame works out how many cycles
 * are due at the current speed and advances BOTH machines by exactly that many.
 */
export function useRace() {
  const raceRef = useRef<Race | null>(null);
  if (raceRef.current === null) raceRef.current = createRace();
  const race = raceRef.current;

  const [view, setView] = useState(() => viewRace(race));
  const [status, setStatus] = useState<RaceStatus>("ready");
  const [speed, setSpeed] = useState<Speed>(1);
  const speedRef = useRef<Speed>(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (status !== "running") return;
    let frame = 0;
    let last: number | null = null;
    let owed = 0; // fractional cycles carried to the next frame
    const tick = (now: number) => {
      if (last !== null) {
        owed += (Math.min(now - last, MAX_FRAME_MS) / 1000) * CYCLES_PER_SECOND * speedRef.current;
        const due = Math.floor(owed);
        if (due > 0) {
          owed -= due;
          advanceRace(race, due);
          setView(viewRace(race));
        }
      }
      last = now;
      if (isRaceFinished(race)) {
        setStatus("finished");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, race]);

  const start = useCallback(() => {
    if (status === "finished") {
      resetRace(race);
      setView(viewRace(race));
    }
    setStatus("running");
  }, [status, race]);

  const pause = useCallback(() => {
    setStatus((s) => (s === "running" ? "paused" : s));
  }, []);

  const reset = useCallback(() => {
    resetRace(race);
    setView(viewRace(race));
    setStatus("ready");
  }, [race]);

  return { view, status, speed, setSpeed, start, pause, reset };
}
