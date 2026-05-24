// A thin arc gauge drawn in SVG. `percent` null => an empty ring ("no data").

export default function RingGauge({
  label,
  percent,
  sub,
}: {
  label: string;
  percent: number | null;
  sub: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const p = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * c;
  // Start the arc at 12 o'clock and sweep clockwise.
  const transform = "rotate(-90 50 50)";

  return (
    <div className="gauge">
      <span className="label">{label}</span>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label} ${percent ?? "no data"}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--rule)" strokeWidth="4" />
        {percent !== null && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform={transform}
          />
        )}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--serif)"
          fontSize={percent === null ? 22 : 26}
          fill={percent === null ? "var(--ink-faint)" : "var(--ink)"}
        >
          {percent === null ? "—" : `${Math.round(percent)}%`}
        </text>
      </svg>
      <span className="caption">{sub}</span>
    </div>
  );
}
