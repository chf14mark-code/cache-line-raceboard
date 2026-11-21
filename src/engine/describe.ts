/**
 * Plain-English glosses for instructions, used by "Show the program".
 * Pure text building: no React, no state.
 */
import type { Instruction, Operand } from "./types";

/** Format an address the way the UI shows memory: 0x00 .. 0xFF. */
export function hexAddress(address: number): string {
  return `0x${address.toString(16).toUpperCase().padStart(2, "0")}`;
}

/** Name of a value operand: "R1" for a register, the number itself for an immediate. */
function valueText(operand: Operand): string {
  return operand.kind === "reg" ? `R${operand.reg}` : String(operand.value);
}

/** Describe which memory cell an address operand points at. */
function cellText(addr: Operand): string {
  return addr.kind === "reg"
    ? `the memory cell whose address is in R${addr.reg}`
    : `memory cell ${hexAddress(addr.value)}`;
}

/**
 * One short sentence explaining what instruction number `index` does.
 * Example: LOAD R1, [R2]  ->  "Read the memory cell whose address is in R2 into R1".
 */
export function describeInstruction(ins: Instruction, index: number): string {
  switch (ins.op) {
    case "MOV":
      return ins.src.kind === "imm"
        ? `Put the number ${ins.src.value} into R${ins.rd}`
        : `Copy R${ins.src.reg} into R${ins.rd}`;
    case "ADD":
      return `Add ${valueText(ins.src)} to R${ins.rd}`;
    case "SUB":
      return `Subtract ${valueText(ins.src)} from R${ins.rd}`;
    case "LOAD":
      return `Read ${cellText(ins.addr)} into R${ins.rd}`;
    case "STORE":
      return `Write R${ins.rs} into ${cellText(ins.addr)}`;
    case "JNZ":
      return `If R${ins.rs} is not zero, jump ${ins.target <= index ? "back" : "ahead"} to line ${ins.target}; otherwise go on`;
  }
}
