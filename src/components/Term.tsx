import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Plain-English meaning of each word a stranger might not know. */
export const TERMS = {
  cache: "A small, fast memory right next to the CPU. It keeps copies of cells read recently.",
  RAM: "The big main memory. It holds everything, but every trip to it is slow.",
  hit: "The cell was already in the cache, so the read was fast.",
  miss: "The cell was not in the cache, so the CPU had to wait for RAM.",
  cycle: "One tick of the CPU's clock. Fewer cycles means faster.",
} as const;

export type TermKey = keyof typeof TERMS;

/** A word with a dotted underline; hover, focus or tap it to see what it means. */
export function Term({ k, children }: { k: TermKey; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-2"
          aria-label={`${typeof children === "string" ? children : k}: ${TERMS[k]}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-56 normal-case tracking-normal">{TERMS[k]}</TooltipContent>
    </Tooltip>
  );
}
