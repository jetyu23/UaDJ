"use client";

import { useState } from "react";

/**
 * The Camelot wheel as the interactive hero object. 12 segments per ring
 * (inner = A/minor, outer = B/major), each at its conventional hue. Hovering
 * a segment lights its harmonic neighbours — the same rule the optimiser
 * scores by. Coordinates are rounded to 2dp so server and client render the
 * exact same path strings (unrounded floats caused hydration mismatches).
 */

type Seg = { num: number; letter: "A" | "B" };

const r2 = (v: number) => Math.round(v * 100) / 100;

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r2(cx + r * Math.cos(rad)), r2(cy + r * Math.sin(rad))];
};

function ringSegment(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number
): string {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  return [
    `M ${x0} ${y0}`,
    `A ${r1} ${r1} 0 0 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${r0} ${r0} 0 0 0 ${x3} ${y3}`,
    "Z",
  ].join(" ");
}

const hue = (num: number) => ((num - 1) * 30 + 180) % 360;

const isCompatible = (a: Seg, b: Seg) => {
  const raw = Math.abs(a.num - b.num);
  const d = Math.min(raw, 12 - raw);
  if (d === 0) return true; // same or relative
  return d === 1 && a.letter === b.letter; // wheel neighbour
};

export default function Wheel() {
  const [hover, setHover] = useState<Seg | null>(null);
  const C = 210;
  const rings: { letter: "A" | "B"; r0: number; r1: number; rl: number }[] = [
    { letter: "A", r0: 78, r1: 130, rl: 104 },
    { letter: "B", r0: 136, r1: 195, rl: 166 },
  ];

  return (
    <div className="wheel-wrap">
      <svg
        className="wheel"
        viewBox="0 0 420 420"
        role="img"
        aria-label="Camelot wheel of musical keys; neighbouring segments are harmonically compatible"
        onMouseLeave={() => setHover(null)}
      >
        <g className="rotor">
          {rings.map((ring) =>
            Array.from({ length: 12 }, (_, i) => {
              const num = i + 1;
              const seg: Seg = { num, letter: ring.letter };
              const a0 = i * 30 - 14;
              const a1 = i * 30 + 14;
              const active = hover ? isCompatible(hover, seg) : false;
              const dim = hover && !active;
              const h = hue(num);
              const sat = ring.letter === "A" ? 62 : 76;
              const light = ring.letter === "A" ? 55 : 62;
              const [lx, ly] = polar(C, C, ring.rl, i * 30);
              return (
                <g key={`${ring.letter}${num}`}>
                  <path
                    d={ringSegment(C, C, ring.r0, ring.r1, a0, a1)}
                    fill={`hsl(${h} ${sat}% ${light}%)`}
                    opacity={dim ? 0.12 : active ? 1 : 0.5}
                    style={{
                      transition: "opacity .18s ease, filter .18s ease",
                      filter: active
                        ? `drop-shadow(0 0 10px hsl(${h} 95% 62% / 0.9))`
                        : undefined,
                    }}
                    onMouseEnter={() => setHover(seg)}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="12"
                    fontFamily="ui-monospace, Menlo, monospace"
                    fill="rgba(233,238,245,0.9)"
                    opacity={dim ? 0.2 : 1}
                    style={{
                      pointerEvents: "none",
                      transition: "opacity .18s ease",
                    }}
                  >
                    {num}
                    {ring.letter}
                  </text>
                </g>
              );
            })
          )}
        </g>
        <circle cx={C} cy={C} r={58} fill="none" stroke="var(--line)" />
        {hover ? (
          <text
            x={C}
            y={C}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="34"
            fontWeight="700"
            fontFamily="ui-monospace, Menlo, monospace"
            fill={`hsl(${hue(hover.num)} 90% 66%)`}
            style={{ pointerEvents: "none" }}
          >
            {hover.num}
            {hover.letter}
          </text>
        ) : (
          <text
            x={C}
            y={C}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="17"
            fontFamily="ui-monospace, Menlo, monospace"
            fill="var(--muted)"
            letterSpacing="4"
            style={{ pointerEvents: "none" }}
          >
            UaDJ
          </text>
        )}
      </svg>
    </div>
  );
}
