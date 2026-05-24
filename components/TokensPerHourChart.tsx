// 24 hourly output-token bars. Pure SVG, no chart lib.

export default function TokensPerHourChart({
  data,
}: {
  data: { hour: number; tokens: number }[];
}) {
  const W = 100;
  const H = 30;
  const gap = 0.6;
  const bw = W / data.length - gap;
  const max = Math.max(1, ...data.map((d) => d.tokens));

  return (
    <>
      <svg className="chart bars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <line x1="0" y1={H - 0.4} x2={W} y2={H - 0.4} stroke="var(--rule)" strokeWidth="0.4" />
        {data.map((d, i) => {
          const h = d.tokens === 0 ? 0 : Math.max(0.6, (d.tokens / max) * (H - 1));
          return (
            <rect
              key={d.hour}
              x={i * (bw + gap)}
              y={H - 0.4 - h}
              width={bw}
              height={h}
              fill="var(--bar)"
            />
          );
        })}
      </svg>
      <div className="axis">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </>
  );
}
