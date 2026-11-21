import { describe, expect, it } from "vitest";
import { advanceRace, createRace, isRaceFinished, resetRace, viewRace } from "./race";

describe("race shared clock", () => {
  it("advances both lanes by the same number of cycles", () => {
    const race = createRace();
    advanceRace(race, 250);
    const v = viewRace(race);
    expect(v.a.snapshot.cycle).toBe(250);
    expect(v.b.snapshot.cycle).toBe(250);
  });

  it("finished lane stops while the other keeps going, ending at 503 and 1667 cycles", () => {
    const race = createRace();
    while (!isRaceFinished(race)) advanceRace(race, 7);
    const v = viewRace(race);
    expect(v.a.snapshot.cycle).toBe(503);
    expect(v.b.snapshot.cycle).toBe(1667);
  });

  it("reset gives a cold start, so a second race gives the same 503 cycles", () => {
    const race = createRace();
    advanceRace(race, 5000);
    resetRace(race);
    advanceRace(race, 5000);
    expect(viewRace(race).a.snapshot.cycle).toBe(503);
  });
});
