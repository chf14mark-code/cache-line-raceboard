# src/animation

Presentation layer for the race. Reads engine events and snapshots; never changes the machine.

- `pacing.ts` — wall-clock time per cycle (compressed log scale or proportional 80 ms/cycle).
- `tracker.ts` — turns events into marks: last hit, arriving line, eviction, "free" cells, free rides.
- `captions.ts` — the sentence under each cache.
- `css.ts` — animation length scaled by speed.
