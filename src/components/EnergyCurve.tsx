"use client";

/**
 * The set's energy arc: a sparkline of track energy (0–1) across the
 * optimised order. Turns "it's ordered better" into something you can see —
 * the warm-up, the peak, the cool-down. Tracks without energy data are
 * skipped; the line connects through known points.
 */
export default function EnergyCurve({
  values,
}: {
  values: (number | null)[];
}) {
  const W = 640;
  const H = 110;
  const P = 12;
  const n = values.length;

  const pts: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (v == null) return;
    const clamped = Math.max(0, Math.min(1, v));
    const x = P + (i * (W - 2 * P)) / Math.max(1, n - 1);
    const y = H - P - clamped * (H - 2 * P);
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  });

  if (pts.length < 2) return null;

  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${H - P} ${line} ${pts[pts.length - 1].x},${H - P}`;

  return (
    <div className="curve">
      <p className="col-title">Energy arc — optimised order</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Track energy across the optimised playlist order"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--neon)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--neon-2)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#eg)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--neon)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--neon)" />
        ))}
      </svg>
    </div>
  );
}
