// Circular score ring: a faint track with an accent arc filling round(value%).
// value is 0–1. Purely presentational, no client hooks.
export function ScoreRing({
  value,
  size = 56,
}: {
  value: number;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={`${Math.round(pct * 100)} percent match`}
    >
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-white/10"
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className="stroke-accent transition-[stroke-dashoffset] duration-700"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-ink font-display text-xs font-semibold"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
