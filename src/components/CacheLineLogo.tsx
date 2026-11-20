/** Inline SVG mark: a row of four memory cells, one requested (solid) and the rest of its line fetched along with it. */
export function CacheLineLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 20" className={className} aria-hidden="true" focusable="false">
      <rect x="1" y="2" width="62" height="16" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeDasharray="3 2" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={5 + i * 14.5}
          y="5.5"
          width="11"
          height="9"
          rx="1.5"
          fill="currentColor"
          fillOpacity={i === 1 ? 1 : 0.35}
        />
      ))}
    </svg>
  );
}
