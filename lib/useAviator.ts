"use client";

import { useEffect, useRef, useState } from "react";
import {
  crashPointFor,
  hashString,
  multiplierAt,
  msForMultiplier,
  randomHex,
  round2,
} from "./game";

export type Phase = "waiting" | "flying" | "crashed";

export type RoundResult = { id: number; crash: number };

export type AviatorState = {
  phase: Phase;
  roundId: number;
  multiplier: number;
  flightMs: number;
  countdownMs: number;
  crashPoint: number;
  seed: string;
  seedHash: string;
  history: RoundResult[];
};

const WAIT_MS = 7000;
const HOLD_MS = 3200;

type Engine = {
  phase: Phase;
  roundId: number;
  seed: string;
  phaseStartedAt: number;
  phaseEndsAt: number;
  crashPoint: number;
  multiplier: number;
};

function seedHashOf(seed: string): string {
  return (
    hashString(seed).toString(16).padStart(8, "0") +
    hashString(`${seed}:salt`).toString(16).padStart(8, "0")
  );
}

function initialEngine(): Engine {
  return {
    phase: "waiting",
    roundId: 1,
    seed: randomHex(),
    phaseStartedAt: 0,
    phaseEndsAt: 0,
    crashPoint: 0,
    multiplier: 1,
  };
}

/**
 * Drives the crash round lifecycle with a single requestAnimationFrame loop:
 * waiting (7s) -> flying -> crashed (3.2s) -> next round.
 */
export function useAviator(): AviatorState {
  const engineRef = useRef<Engine | null>(null);
  if (engineRef.current === null) engineRef.current = initialEngine();

  const [state, setState] = useState<AviatorState>({
    phase: "waiting",
    roundId: 1,
    multiplier: 1,
    flightMs: 0,
    countdownMs: WAIT_MS,
    crashPoint: 0,
    seed: "",
    seedHash: "",
    history: [],
  });

  useEffect(() => {
    const engine = engineRef.current as Engine;
    const startedAt = performance.now();
    engine.phaseStartedAt = startedAt;
    engine.phaseEndsAt = startedAt + WAIT_MS;

    let raf = 0;
    let lastKey = "";

    const publish = (now: number) => {
      const phase = engine.phase;
      const flying = phase === "flying";
      const multiplier = phase === "crashed" ? engine.crashPoint : round2(engine.multiplier);
      const flightMs = flying
        ? now - engine.phaseStartedAt
        : phase === "crashed"
          ? msForMultiplier(engine.crashPoint)
          : 0;
      const countdownMs = phase === "waiting" ? Math.max(0, engine.phaseEndsAt - now) : 0;
      const key = flying
        ? `${phase}:${engine.roundId}:${multiplier}`
        : `${phase}:${engine.roundId}:${Math.ceil(countdownMs / 250)}`;

      if (key === lastKey) return;
      lastKey = key;

      setState((prev) => ({
        phase,
        roundId: engine.roundId,
        multiplier,
        flightMs,
        countdownMs,
        crashPoint: phase === "waiting" ? 0 : engine.crashPoint,
        // Revealed only after the round busts, so the result can't be read mid-flight.
        seed: phase === "crashed" ? engine.seed : "",
        seedHash: seedHashOf(engine.seed),
        history:
          prev.phase === "flying" && phase === "crashed"
            ? [{ id: engine.roundId, crash: engine.crashPoint }, ...prev.history].slice(0, 20)
            : prev.history,
      }));
    };

    const tick = (now: number) => {
      if (engine.phase === "waiting" && now >= engine.phaseEndsAt) {
        engine.phase = "flying";
        engine.phaseStartedAt = now;
        engine.crashPoint = crashPointFor(engine.seed, engine.roundId);
        engine.multiplier = 1;
      } else if (engine.phase === "flying") {
        engine.multiplier = multiplierAt(now - engine.phaseStartedAt);
        if (engine.multiplier >= engine.crashPoint) {
          engine.phase = "crashed";
          engine.phaseEndsAt = now + HOLD_MS;
          engine.multiplier = engine.crashPoint;
        }
      } else if (engine.phase === "crashed" && now >= engine.phaseEndsAt) {
        engine.roundId += 1;
        engine.seed = randomHex();
        engine.phase = "waiting";
        engine.phaseStartedAt = now;
        engine.phaseEndsAt = now + WAIT_MS;
        engine.multiplier = 1;
        engine.crashPoint = 0;
      }

      publish(now);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return state;
}
