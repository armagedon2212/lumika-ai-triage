/** Logo fikcyjnego sklepu Lumika — prosty znak + logotyp tekstowy (SVG). */
export function Logo({ className = "h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 32" className={className} role="img" aria-label="Lumika">
      <rect x="0" y="0" width="32" height="32" rx="9" className="fill-brand-600" />
      <path d="M10 8v16h12" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22.5" cy="10" r="3" className="fill-mint-400" />
      <text
        x="40"
        y="22.5"
        className="fill-slate-900 dark:fill-white"
        style={{ font: "600 19px var(--font-geist-sans), system-ui, sans-serif", letterSpacing: "-0.02em" }}
      >
        lumika
      </text>
    </svg>
  );
}
