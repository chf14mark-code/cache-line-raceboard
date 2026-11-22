# The Cache Line — Specification

This file is the source of truth for every later prompt. If code and spec disagree, the spec wins.

## Goal

An interactive explainer of ONE mechanism: the CPU cache line (spatial locality).
When a CPU reads one memory cell it fetches the whole 4-cell "cache line" around it into a
small, fast cache. So reading memory in order is several times faster than jumping around.
A first-time user with zero help must understand this within 2 minutes.

**Every number shown must be computed by our own simulation code. Never hardcode results or
use pre-recorded animations.**

## Hard constraints

- React + TypeScript + Vite + Tailwind. Pure static front-end.
- NO backend, NO Supabase/Lovable Cloud, NO login, NO API keys, NO analytics,
  NO runtime network requests (system fonts and inline SVG only).
- NO localStorage, sessionStorage, IndexedDB or cookies. State lives only in React memory.
- All UI text in English.
- Simulation code lives in `src/engine/`: pure TypeScript, zero React imports, deterministic,
  no randomness, simple readable code with comments on every function. The team must be able
  to explain every line.
- Minimal dependencies. Any new library must be proposed (with a reason) before it is added.
- Responsive: main view fits 1366x768 without scrolling; stacks vertically on mobile.
- Respect `prefers-reduced-motion`. Never use color alone to carry meaning (add text labels/icons).

## Machine

### Memory
- 256 bytes, addresses `0x00`–`0xFF`. Cell `i` initially holds `i + 1`.
- Cache line size = 4 bytes by default (configurable: 2 / 4 / 8 / 16).
- Line index = `floor(addr / lineSize)`.

### Registers
- `PC`, `R0`–`R3`. 16-bit, wrap on overflow (and underflow).

### ISA (6 instructions)

| Instruction            | Cycles                                  | Meaning |
|------------------------|-----------------------------------------|---------|
| `MOV Rd, imm\|Rs`      | 1                                       | `Rd = value` |
| `LOAD Rd, [imm\|Rs]`   | latency of the level where data is found | `Rd = mem[addr]` |
| `STORE Rs, [imm\|Rd]`  | same latency rule as LOAD               | `mem[addr] = Rs` |
| `ADD Rd, imm\|Rs`      | 1                                       | `Rd = Rd + value` |
| `SUB Rd, imm\|Rs`      | 1                                       | `Rd = Rd - value` |
| `JNZ Rs, line`         | 1                                       | if `Rs != 0` then `PC = line` (0-based) else `PC + 1` |

- The program ends when `PC` passes the last line.
- Safety stop at 100000 cycles.

### Caches
- Each level is fully associative with LRU replacement.
- Each line holds `{ valid, tag = line index, lastUsed }`.
- **Simple mode:** L1 only (4 lines, latency 3) + RAM (latency 100).
- **Full mode:** L1 8 lines / latency 3, L2 16 lines / 10, L3 32 lines / 30, RAM 100.

### Access rules
- LOAD/STORE search L1 -> L2 -> L3 -> RAM.
- Latency = latency of the level where the data is found (**not cumulative**).
- On a lower-level hit or a RAM access, the whole line is copied into all upper levels,
  evicting the LRU line if a level is full.
- STORE is write-allocate + write-through (no dirty bits).

### Documented simplifications (vs. a real CPU)
1. Fully associative caches (real CPUs use set-associative).
2. Non-cumulative latency: a miss costs only the latency of the level that answered.
3. Write-through with no dirty bits and no write buffer; STORE costs the same as LOAD.
4. No pipelining, no out-of-order execution, no prefetcher, no TLB / virtual memory.
5. One instruction at a time; ALU instructions always take exactly 1 cycle.
6. Tiny sizes (256-byte memory, a few cache lines) so everything fits on screen.

### Engine clarifications (behaviour the spec above leaves open)
- `reset()` restarts PC, registers, RAM, clock and metrics but keeps the caches warm;
  `flushCache()` empties them. "Run again without flushing" = `reset()` then run.
- `lastUsed` is an access counter (1 = first LOAD/STORE served), not a cycle number, so LRU
  order survives `reset()`.
- Memory cells hold 16-bit values (cell 255 holds 256).
- A LOAD/STORE searches the caches in its first cycle and receives the line in its last cycle;
  fills/evictions happen then. Every cycle in between the CPU reports `stalling`.
- A LOAD/STORE to an address >= 256 halts the machine with a runtime error.
- Parser: `;` or `#` start a comment, blank lines are ignored, an optional leading instruction
  number (as in the listings below) must match the real 0-based index, JNZ targets must exist.
- Full mode, program B run twice without flushing = 227 cycles (16 L2 hits; L1 holds only 8
  of B's 16 lines and LRU always evicts the next one needed).

### Metrics
- Total cycles.
- Memory-wait cycles = sum of LOAD/STORE latencies.
- ALU-busy cycles = number of ADD/SUB instructions executed.
- Hits / misses per level.
- Wait % = memoryWait / total.

### Engine API (cycle-accurate)
- `stepCycle()`, `stepInstruction()`, `runToEnd()`, `reset()`, `flushCache()`.
- Returns immutable snapshots plus a list of events `{ cycle, kind, details }` that the UI animates.

## Reference programs (also used as self-tests)

**A — "Read in order"**
```
0 MOV R0, 16
1 MOV R2, 0
2 MOV R3, 0
3 LOAD R1, [R2]
4 ADD R3, R1
5 ADD R2, 1
6 SUB R0, 1
7 JNZ R0, 3
```

**B — "Jump around"**: identical, but line 5 is `ADD R2, 4`.

**Expected results (simple mode, cold cache):**
- A = 503 cycles (4 misses, 12 hits)
- B = 1667 cycles (16 misses, 0 hits)
- Running A again without flushing = 115 cycles

These values are test assertions for the engine, never display values.

## Page structure

- **Tier 1 (default):** headline question, two "race lanes", one clock, computed result banner.
- **Tier 2 (Deep Dive toggle):** full mode L1/L2/L3, 256-cell RAM, CPU internals,
  tag/LRU tables, narration log.
- **Tier 3 (Sandbox):** editable program, cache config, flush, presets.

## Folder layout

- `src/engine/` — simulation (pure TS, no React).
- `src/components/` — reusable UI pieces.
- `src/pages/` — page-level views composed from components.
- `src/routes/` — thin route files that render a page (framework routing).

## Presentation time model (animation layer, not the machine)
- Lives in `src/animation/`; reads engine events only and never changes engine behaviour.
- Default "compressed" time: one memory access takes a log-scaled wall time
  (L1 hit 3 cycles ≈ 150 ms, RAM miss 100 cycles ≈ 900 ms at 1x); 1-cycle instructions get
  the hit pace (50 ms). The counter still steps through every real cycle.
- Optional "Proportional time (80ms per cycle)" toggle, off by default.
- Speed selector (0.25x–10x) scales all wall-clock time and animation lengths.
- Shared clock: each cycle lasts as long as the lane that needs the most time for it.

## First-run flow (Tier 1)
- On load: hook question, two lanes, prediction prompt ("Which lane will finish first?") and a
  pulsing Start race button; speed/time options sit behind "Options". The prediction lives only
  in React memory.
- After both lanes finish, the controls bar is replaced by a result banner whose text is built
  from the finished snapshots (`resultSentences` in `src/lib/race.ts`), the prediction verdict,
  the one-line cache-line idea and a disabled "Explore deeper" link.
- A "Jump step" slider (1–4) rebuilds the jumping lane with `makeJumpProgram(step)` and re-runs
  the race to the end instantly; step 4 is program B.
- Tooltips explain cache, RAM, hit, miss and cycle in plain English.

## Default view: guided story (supersedes "First-run flow" as the landing view)
- `/` opens a 3-step story, one machine at a time, in everyday words: desk (cache), warehouse
  (RAM), tick (cycle). Step 1 runs A and pauses after the first miss and first hit; step 2 runs
  B and pauses after the first two misses; step 3 shows both computed totals and the ratio.
- A big caption bar narrates engine events (`src/animation/narration.ts`).
- Registers, program, hit rate and speed sit behind "Show details". The two-lane race (with
  prediction, banner and step slider) is reachable via "Race both at once".
