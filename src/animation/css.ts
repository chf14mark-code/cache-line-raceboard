/** Inline style that sets an animation's length, scaled by the speed selector. */
export function animStyle(ms: number, speed: number): Record<string, string> {
  return { "--anim-ms": `${Math.max(16, Math.round(ms / speed))}ms` };
}
