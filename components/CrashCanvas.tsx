"use client";

import { useEffect, useRef } from "react";
import { multiplierAt } from "@/lib/game";
import type { Phase } from "@/lib/useAviator";

type Props = {
  phase: Phase;
  multiplier: number;
  flightMs: number;
};

const GREEN = "#22e08a";
const RED = "#ff4a63";

export default function CrashCanvas({ phase, multiplier, flightMs }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<Props>({ phase, multiplier, flightMs });
  dataRef.current = { phase, multiplier, flightMs };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let lastSignature = "";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(rect.width, 10);
      height = Math.max(rect.height, 10);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastSignature = "";
    };

    const draw = () => {
      const state = dataRef.current;
      const padL = 44;
      const padR = 20;
      const padT = 16;
      const padB = 24;
      const plotW = Math.max(width - padL - padR, 1);
      const plotH = Math.max(height - padT - padB, 1);

      const liveMultiplier = state.phase === "waiting" ? 1 : state.multiplier;
      const yMax = Math.max(2, liveMultiplier * 1.16);
      const elapsedSec = state.flightMs / 1000;
      const xMax = Math.max(7, elapsedSec * 1.02);
      const crashed = state.phase === "crashed";
      const accent = crashed ? RED : GREEN;

      const toX = (sec: number) => padL + (sec / xMax) * plotW;
      const toY = (m: number) => {
        const clamped = Math.min(Math.max(m, 1), yMax);
        return padT + plotH - ((clamped - 1) / (yMax - 1)) * plotH;
      };

      ctx.clearRect(0, 0, width, height);

      // Horizontal grid + multiplier labels.
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const rows = 4;
      for (let i = 0; i <= rows; i++) {
        const m = 1 + ((yMax - 1) * i) / rows;
        const y = toY(m);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.strokeStyle = i === 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.055)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.34)";
        ctx.fillText(m >= 10 ? `${m.toFixed(0)}x` : `${m.toFixed(1)}x`, 6, y);
      }

      // Vertical grid + whole-second labels.
      const tickStep = xMax <= 10 ? 1 : Math.ceil(xMax / 8);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let sec = tickStep; sec < xMax - 0.4; sec += tickStep) {
        const x = toX(sec);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.strokeStyle = "rgba(255,255,255,0.035)";
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.26)";
        ctx.fillText(`${Math.round(sec)}s`, x, padT + plotH + 7);
      }

      // Curve samples.
      const steps = 72;
      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= steps; i++) {
        const sec = (elapsedSec * i) / steps;
        const m = state.phase === "waiting" ? 1 : multiplierAt(sec * 1000);
        points.push({ x: toX(sec), y: toY(m) });
      }

      if (points.length > 1) {
        // Gradient area under the curve.
        ctx.beginPath();
        ctx.moveTo(points[0].x, padT + plotH);
        points.forEach((p, i) => (i === 0 ? ctx.lineTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.lineTo(points[points.length - 1].x, padT + plotH);
        ctx.closePath();
        const fill = ctx.createLinearGradient(0, padT, 0, padT + plotH);
        fill.addColorStop(0, crashed ? "rgba(255,74,99,0.34)" : "rgba(34,224,138,0.30)");
        fill.addColorStop(1, "rgba(34,224,138,0)");
        ctx.fillStyle = fill;
        ctx.fill();

        // Glowing stroke.
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = accent;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Head marker (plane position).
        const head = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = crashed ? "rgba(255,74,99,0.16)" : "rgba(34,224,138,0.18)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = accent;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (!crashed && state.phase === "flying") {
          // Short shine trail from the head.
          const prev = points[Math.max(points.length - 8, 0)];
          const trail = ctx.createLinearGradient(prev.x, prev.y, head.x, head.y);
          trail.addColorStop(0, "rgba(255,255,255,0)");
          trail.addColorStop(1, "rgba(255,255,255,0.65)");
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(head.x, head.y);
          ctx.strokeStyle = trail;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Frame border.
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.strokeRect(padL + 0.5, padT + 0.5, plotW - 1, plotH - 1);

      // Timestamp chip bottom-left of the plot.
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(`t + ${elapsedSec.toFixed(1)}s`, padL + 8, padT + plotH - 6);
    };

    const frame = () => {
      const s = dataRef.current;
      const signature =
        s.phase === "flying"
          ? `f:${s.multiplier.toFixed(3)}`
          : `${s.phase}:${s.multiplier.toFixed(2)}:${Math.round(s.flightMs)}`;
      if (signature !== lastSignature) {
        lastSignature = signature;
        draw();
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    draw();
    raf = requestAnimationFrame(frame);

    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="crash-canvas" aria-hidden="true" />;
}
