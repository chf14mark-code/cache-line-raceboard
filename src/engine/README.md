# src/engine

Pure TypeScript simulation of the CPU + cache machine described in `/SPEC.md`.

Rules:
- Zero React imports. Zero randomness. Deterministic.
- Every function has a comment explaining what it does.
- No browser storage, no network.

Files:
- `types.ts` — data shapes: instructions, config, snapshots, events.
- `config.ts` — `simpleConfig()` / `fullConfig()` (line size 2/4/8/16).
- `parser.ts` — assembly text -> instructions; errors carry the 1-based text line.
- `cache.ts` — one fully-associative LRU cache level.
- `machine.ts` — CPU + hierarchy; `stepCycle`, `stepInstruction`, `runToEnd`, `reset`, `flushCache`.
- `programs.ts` — reference programs A and B.
- `selftest.ts` — checks shown on `/selftest` (also run by `engine.test.ts`).
