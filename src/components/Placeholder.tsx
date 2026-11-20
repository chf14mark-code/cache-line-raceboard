import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dashed box marking an area of the layout that a later step will fill in. */
export function Placeholder({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn("placeholder-frame flex flex-col rounded-lg p-3", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </h2>
        {hint && <span className="font-mono text-[11px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
