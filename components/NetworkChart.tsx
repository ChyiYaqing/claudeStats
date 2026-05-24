// Network history: download as a filled area, upload as a hairline.
// Series is oldest-first, up to 60 points.

export default function NetworkChart({
  series,
  max,
}: {
  series: { down: number; up: number }[];
  max: number;
}) {
  const W = 100;
  const H = 30;
  const n = Math.max(series.length, 2);
  const scale = Math.max(1, max);
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - (Math.min(v, scale) / scale) * (H - 1);

  const pts = series.length ? series : [{ down: 0, up: 0 }, { down: 0, up: 0 }];
  const downLine = pts.map((p, i) => `${x(i).toFixed(2)},${y(p.down).toFixed(2)}`).join(" ");
  const downArea = `M0,${H} L ${pts
    .map((p, i) => `${x(i).toFixed(2)},${y(p.down).toFixed(2)}`)
    .join(" L ")} L ${W},${H} Z`;
  const upLine = pts.map((p, i) => `${x(i).toFixed(2)},${y(p.up).toFixed(2)}`).join(" ");

  return (
    <svg className="chart netchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line x1="0" y1={H - 0.4} x2={W} y2={H - 0.4} stroke="var(--rule)" strokeWidth="0.4" />
      <path d={downArea} fill="var(--rule)" opacity="0.6" />
      <polyline points={downLine} fill="none" stroke="var(--ink)" strokeWidth="0.6" />
      <polyline
        points={upLine}
        fill="none"
        stroke="var(--ink-soft)"
        strokeWidth="0.6"
        strokeDasharray="1.4 1.2"
      />
    </svg>
  );
}
