/**
 * Parser: turns assembly text into a list of instructions.
 *
 * Accepted syntax (case does not matter):
 *   MOV   Rd, imm|Rs
 *   LOAD  Rd, [imm|Rs]
 *   STORE Rs, [imm|Rd]
 *   ADD   Rd, imm|Rs
 *   SUB   Rd, imm|Rs
 *   JNZ   Rs, line          (line = 0-based instruction number)
 *
 * Extras:
 *   - Blank lines are ignored.
 *   - Anything after ";" or "#" is a comment.
 *   - A line may start with its instruction number, like the listings in SPEC.md
 *     ("3 LOAD R1, [R2]"). If present it must match the real instruction number.
 *   - Numbers can be decimal (16), negative (-1, stored as 65535) or hex (0x10).
 *
 * Errors always include the 1-based text line, the way a code editor counts lines.
 */
import type { Instruction, Operand, Program, RegisterIndex } from "./types";

/** One problem found while parsing. */
export interface ParseError {
  /** 1-based line number in the source text. */
  readonly line: number;
  /** Plain-English explanation, already prefixed with "Line N:". */
  readonly message: string;
}

/** Result of parsing: either a program or the first error found. */
export type ParseResult =
  | { readonly ok: true; readonly program: Program }
  | { readonly ok: false; readonly error: ParseError };

/** Largest value a 16-bit register can hold. */
const MAX_U16 = 0xffff;

/** Number of memory cells; LOAD/STORE immediates must be below this. */
const MEMORY_SIZE = 256;

/** Internal helper: an exception that carries the line number. */
class LineError extends Error {
  /** Remember the line so the caller can report it. */
  constructor(
    readonly line: number,
    detail: string,
  ) {
    super(`Line ${line}: ${detail}`);
  }
}

/** Remove a trailing comment (";" or "#") and surrounding spaces. */
function stripComment(raw: string): string {
  const cut = raw.search(/[;#]/);
  return (cut === -1 ? raw : raw.slice(0, cut)).trim();
}

/** Read "R0".."R3" (any case). Throws a LineError for anything else. */
function parseRegister(token: string, line: number): RegisterIndex {
  const m = /^r([0-3])$/i.exec(token.trim());
  if (!m || m[1] === undefined) {
    throw new LineError(line, `expected a register R0–R3 but found "${token.trim() || "nothing"}".`);
  }
  return Number(m[1]) as RegisterIndex;
}

/**
 * Read a number like 16, -1 or 0x1F. Negative values wrap to 16 bits (-1 -> 65535).
 * Returns null when the token is not a number at all.
 */
function parseNumber(token: string): number | null {
  const t = token.trim();
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t.slice(2), 16);
  return null;
}

/** Read an immediate value and check it fits in 16 bits. */
function parseImmediate(token: string, line: number): number {
  const n = parseNumber(token);
  if (n === null) {
    throw new LineError(line, `expected a number or register but found "${token.trim() || "nothing"}".`);
  }
  if (n < -0x8000 || n > MAX_U16) {
    throw new LineError(line, `number ${n} does not fit in 16 bits (use -32768 to 65535).`);
  }
  return n & MAX_U16; // wrap negatives into 0..65535
}

/** Read "R2" or "16" as a value operand. */
function parseValueOperand(token: string, line: number): Operand {
  if (/^\s*r/i.test(token)) return { kind: "reg", reg: parseRegister(token, line) };
  return { kind: "imm", value: parseImmediate(token, line) };
}

/** Read "[R2]" or "[0x10]" as an address operand. Immediate addresses must be inside memory. */
function parseAddressOperand(token: string, line: number): Operand {
  const m = /^\s*\[(.*)\]\s*$/.exec(token);
  if (!m || m[1] === undefined) {
    throw new LineError(line, `expected an address in square brackets, like [R2] or [16], but found "${token.trim() || "nothing"}".`);
  }
  const inner = parseValueOperand(m[1], line);
  if (inner.kind === "imm" && inner.value >= MEMORY_SIZE) {
    throw new LineError(line, `address ${inner.value} is outside memory (0–${MEMORY_SIZE - 1}).`);
  }
  return inner;
}

/** Check that exactly `count` operands were given. */
function expectOperands(ops: string[], count: number, mnemonic: string, line: number): void {
  if (ops.length !== count) {
    throw new LineError(line, `${mnemonic} needs ${count} operands separated by a comma, but got ${ops.length}.`);
  }
}

/**
 * Parse one non-empty instruction line.
 * `index` is the 0-based instruction number this line will become.
 */
function parseInstructionLine(text: string, line: number, index: number): Instruction {
  let body = text;

  // Optional leading instruction number, e.g. "3 LOAD R1, [R2]" or "3: LOAD R1, [R2]".
  const numbered = /^(\d+)\s*:?\s+(.*)$/.exec(body);
  if (numbered && numbered[1] !== undefined && numbered[2] !== undefined) {
    const given = Number(numbered[1]);
    if (given !== index) {
      throw new LineError(line, `line is numbered ${given}, but it is instruction ${index} (numbers start at 0).`);
    }
    body = numbered[2];
  }

  // Split "MNEMONIC rest-of-line".
  const m = /^([a-z]+)\b\s*(.*)$/i.exec(body);
  if (!m || m[1] === undefined) {
    throw new LineError(line, `cannot read "${body}". Expected an instruction like MOV, LOAD, STORE, ADD, SUB or JNZ.`);
  }
  const mnemonic = m[1].toUpperCase();
  const rest = (m[2] ?? "").trim();
  const ops = rest === "" ? [] : rest.split(",").map((s) => s.trim());
  const base = { sourceLine: line, text: body.trim() };

  switch (mnemonic) {
    case "MOV":
    case "ADD":
    case "SUB": {
      expectOperands(ops, 2, mnemonic, line);
      return { op: mnemonic, rd: parseRegister(ops[0] ?? "", line), src: parseValueOperand(ops[1] ?? "", line), ...base };
    }
    case "LOAD": {
      expectOperands(ops, 2, mnemonic, line);
      return { op: "LOAD", rd: parseRegister(ops[0] ?? "", line), addr: parseAddressOperand(ops[1] ?? "", line), ...base };
    }
    case "STORE": {
      expectOperands(ops, 2, mnemonic, line);
      return { op: "STORE", rs: parseRegister(ops[0] ?? "", line), addr: parseAddressOperand(ops[1] ?? "", line), ...base };
    }
    case "JNZ": {
      expectOperands(ops, 2, mnemonic, line);
      const rs = parseRegister(ops[0] ?? "", line);
      const target = parseNumber(ops[1] ?? "");
      if (target === null || target < 0) {
        throw new LineError(line, `JNZ needs a target instruction number (0 or more), but found "${ops[1] ?? ""}".`);
      }
      return { op: "JNZ", rs, target, ...base };
    }
    default:
      throw new LineError(line, `unknown instruction "${m[1]}". Use MOV, LOAD, STORE, ADD, SUB or JNZ.`);
  }
}

/**
 * Parse a whole program. Stops at the first error and reports its line.
 * After all lines are read, checks that every JNZ jumps to an instruction that exists.
 */
export function parseProgram(source: string): ParseResult {
  const program: Instruction[] = [];
  try {
    const rawLines = source.split(/\r?\n/);
    rawLines.forEach((raw, i) => {
      const text = stripComment(raw);
      if (text === "") return; // blank or comment-only line
      program.push(parseInstructionLine(text, i + 1, program.length));
    });

    // Jump targets can only be checked once we know how many instructions there are.
    for (const ins of program) {
      if (ins.op === "JNZ" && ins.target >= program.length) {
        throw new LineError(
          ins.sourceLine,
          `JNZ jumps to instruction ${ins.target}, but the program only has instructions 0–${program.length - 1}.`,
        );
      }
    }
  } catch (err) {
    if (err instanceof LineError) {
      return { ok: false, error: { line: err.line, message: err.message } };
    }
    throw err; // a real bug, not a user mistake
  }
  return { ok: true, program };
}

/** Parse text that is known to be valid (used for built-in programs). Throws on error. */
export function parseOrThrow(source: string): Program {
  const result = parseProgram(source);
  if (!result.ok) throw new Error(result.error.message);
  return result.program;
}
