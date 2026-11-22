/**
 * Reference programs A and B from SPEC.md.
 *
 * Both sum 16 memory cells into R3. The only difference is line 5:
 *   A steps the address by 1 (neighbouring cells, same cache line),
 *   B steps it by 4 (a new cache line every time, with the default line size).
 */
import { parseOrThrow } from "./parser";
import type { Program } from "./types";

/** Source text of program A — "Read in order". */
export const PROGRAM_A_SOURCE = `0 MOV R0, 16      ; R0 = how many cells are left to read
1 MOV R2, 0       ; R2 = address of the next cell
2 MOV R3, 0       ; R3 = running total
3 LOAD R1, [R2]   ; R1 = mem[R2]
4 ADD R3, R1      ; total += R1
5 ADD R2, 1       ; next address: one cell further
6 SUB R0, 1       ; one fewer cell left
7 JNZ R0, 3       ; loop while cells are left`;

/** Source text of program B — "Jump around". Identical except line 5 adds 4. */
export const PROGRAM_B_SOURCE = PROGRAM_A_SOURCE.replace(
  "5 ADD R2, 1       ; next address: one cell further",
  "5 ADD R2, 4       ; next address: four cells further",
);

/** A reference program with a display name. */
export interface ReferenceProgram {
  readonly id: "A" | "B";
  readonly name: string;
  readonly source: string;
  readonly program: Program;
}

/** Program A, parsed and ready to run. */
export const PROGRAM_A: ReferenceProgram = {
  id: "A",
  name: "Read in order",
  source: PROGRAM_A_SOURCE,
  program: parseOrThrow(PROGRAM_A_SOURCE),
};

/** Program B, parsed and ready to run. */
export const PROGRAM_B: ReferenceProgram = {
  id: "B",
  name: "Jump around",
  source: PROGRAM_B_SOURCE,
  program: parseOrThrow(PROGRAM_B_SOURCE),
};

/** Smallest and largest step the "Jump around" lane may use. */
export const MIN_JUMP_STEP = 1;
export const MAX_JUMP_STEP = 4;

/**
 * The "Jump around" program with any step from 1 to 4: identical to A except line 5
 * adds `step` to the address. step 4 gives exactly program B.
 */
export function makeJumpProgram(step: number): ReferenceProgram {
  const s = Math.min(MAX_JUMP_STEP, Math.max(MIN_JUMP_STEP, Math.round(step)));
  const source = PROGRAM_A_SOURCE.replace(
    "5 ADD R2, 1       ; next address: one cell further",
    `5 ADD R2, ${s}       ; next address: ${s} cell${s === 1 ? "" : "s"} further`,
  );
  return { id: "B", name: "Jump around", source, program: parseOrThrow(source) };
}
