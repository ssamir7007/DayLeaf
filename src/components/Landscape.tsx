"use client";
import { useEffect, useRef } from "react";
// Draw a small woodcut-style landscape at the display's pixel density.
export default function Landscape() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d")!;
    function draw() {
      const w = 640,
        h = 370,
        dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let seed = 3281;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      ctx.fillStyle = "#f1ecd9";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#d59962";
      ctx.beginPath();
      ctx.arc(425, 96, 55, 0, Math.PI * 2);
      ctx.fill();
      const hill = (
        color: string,
        line: string,
        height: (x: number) => number,
        spacing: number,
        tilt: number,
      ) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-10, h + 5);
        for (let x = -10; x <= w + 10; x += 2) ctx.lineTo(x, height(x));
        ctx.lineTo(w + 10, h + 5);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.clip();
        ctx.strokeStyle = line;
        ctx.lineWidth = 0.85;
        for (let n = -180; n < 750; n += spacing) {
          ctx.beginPath();
          for (let x = -10; x <= w + 10; x += 4) {
            const y = height(x) + n + tilt * x + Math.sin(x * 0.035 + n) * 1.25;
            if (x === -10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      };
      hill(
        "#c3c6aa",
        "#939d81",
        (x) => 173 + 25 * Math.cos(x / 87) - 0.04 * x,
        5.5,
        0.12,
      );
      hill(
        "#98aa88",
        "#738a6b",
        (x) => 213 - 39 * Math.sin((x + 75) / 114),
        5.4,
        -0.17,
      );
      hill(
        "#6d8768",
        "#526f56",
        (x) => 241 + 25 * Math.sin((x - 90) / 83),
        5,
        0.17,
      );
      hill(
        "#506f55",
        "#92a48a",
        (x) => 290 - 37 * Math.sin((x + 100) / 124),
        5.8,
        -0.25,
      );
      hill(
        "#314f40",
        "#728b72",
        (x) => 336 - 33 * Math.cos((x - 25) / 148),
        5.7,
        0.23,
      );
      // Fern fronds grow from the foreground ridge.
      const fern = (bx: number, by: number, dx: number, dy: number) => {
        ctx.strokeStyle = "#2f4c3a";
        ctx.fillStyle = "#37533e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + dx * 0.15, by + dy * 0.55, bx + dx, by + dy);
        ctx.stroke();
        for (let i = 1; i < 16; i++) {
          const t = i / 16,
            x = bx + dx * (0.3 * t + 0.7 * t * t),
            y = by + dy * t;
          for (const s of [-1, 1]) {
            const len = (1 - t * 0.7) * 29,
              ex = x + s * len + dx * 0.07,
              ey = y - len * 0.72;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + s * len * 0.67, y - 1, ex, ey);
            ctx.quadraticCurveTo(x + s * len * 0.48, y - len * 0.63, x, y);
            ctx.fill();
          }
        }
      };
      fern(96, 373, -55, -160);
      fern(100, 374, 45, -185);
      fern(109, 373, 91, -114);
      fern(52, 375, -61, -100);
      for (let i = 0; i < 27000; i++) {
        ctx.fillStyle =
          random() > 0.48 ? "rgba(255,250,225,.16)" : "rgba(61,52,30,.09)";
        ctx.fillRect(random() * w, random() * h, 1 + random(), 1);
      }
    }
    draw();
  }, []);
  return (
    <canvas
      className="landscape"
      ref={ref}
      width="640"
      height="370"
      role="img"
      aria-label="Woodcut illustration of a warm sun rising above rolling green hills and fern leaves"
    />
  );
}
