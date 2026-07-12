"use client";

import { useEffect, useRef } from "react";

/**
 * Two-part cursor: a dot glued to the pointer, a ring easing behind it. The
 * ring grows over interactive elements and adopts the key colour of any
 * hovered track row (via data-hue).
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      const target = e.target as HTMLElement | null;
      const hueEl = target?.closest<HTMLElement>("[data-hue]");
      const hot = target?.closest("a, button, input, [data-hot]");
      if (ring.current) {
        ring.current.classList.toggle("hot", !!hot || !!hueEl);
        const next = hueEl?.dataset.hue ?? "";
        if (ring.current.style.borderColor !== next) {
          ring.current.style.borderColor = next;
        }
      }
    };

    const loop = () => {
      rx += (x - rx) * 0.3;
      ry += (y - ry) * 0.3;
      if (ring.current) {
        ring.current.style.transform = `translate(${rx}px, ${ry}px)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const off = { transform: "translate(-100px, -100px)", willChange: "transform" };
  return (
    <>
      <div ref={dot} className="cur-dot" style={off} aria-hidden />
      <div ref={ring} className="cur-ring" style={off} aria-hidden />
    </>
  );
}
