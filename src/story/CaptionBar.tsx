import type { Caption } from "@/animation/narration";

const ICON: Record<Caption["tone"], string> = { miss: "🚶", hit: "⚡", box: "📦", evict: "↩", done: "✓" };
const LABEL: Record<Caption["tone"], string> = { miss: "Trip", hit: "Desk", box: "Box", evict: "Swap", done: "Done" };

/** Big narration bar: newest caption large, the one before it small. A pause note is highlighted. */
export function CaptionBar({ captions, note }: { captions: readonly Caption[]; note: string | null }) {
  const now = captions[captions.length - 1];
  const before = captions[captions.length - 2];
  return (
    <div aria-live="polite" className="rounded-lg border-2 border-primary/50 bg-card px-5 py-3">
      {before && (
        <p className="text-base text-muted-foreground">
          {ICON[before.tone]} {before.text}
        </p>
      )}
      <p className="text-xl font-semibold text-foreground">
        {now ? (
          <>
            <span aria-hidden="true">{ICON[now.tone]} </span>
            <span className="sr-only">{LABEL[now.tone]}: </span>
            {now.text}
          </>
        ) : (
          "Getting ready…"
        )}
      </p>
      {note && <p className="mt-1 rounded bg-primary/15 px-2 py-1 text-lg font-semibold text-primary">⏸ {note}</p>}
    </div>
  );
}
