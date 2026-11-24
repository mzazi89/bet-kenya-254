"use client";

import { multiplierLabel } from "@/lib/game";
import type { Phase } from "@/lib/useAviator";

type Props = {
  roundId: number;
  phase: Phase;
  seedHash: string;
  seed: string;
  crashPoint: number;
};

function short(value: string, head = 12): string {
  if (!value) return "—";
  return `${value.slice(0, head)}…${value.slice(-4)}`;
}

export default function FairnessCard({ roundId, phase, seedHash, seed, crashPoint }: Props) {
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Provably fair</h2>
        <span className="spacer" />
        <span className="pill green">{phase === "crashed" ? "revealed" : "committed"}</span>
      </div>

      <div className="fair-body">
        <div className="hash-line">
          <span>Seed hash</span>
          <span title={seedHash || "pending"}>{short(seedHash)}</span>
        </div>
        <div className="hash-line">
          <span>Server seed</span>
          <span title={seed || "hidden"}>
            {seed ? short(seed) : "hidden until bust"}
          </span>
        </div>
        <div className="hash-line">
          <span>Round</span>
          <span>#{roundId}</span>
        </div>
        {phase === "crashed" ? (
          <p style={{ margin: 0 }}>
            Round busted at <strong style={{ color: "var(--red)" }}>{multiplierLabel(crashPoint)}</strong>.
            The seed above hashes to the commitment shown before takeoff.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            Each round commits a hash of the server seed before takeoff and reveals the seed after
            the bust, so every past result can be re-checked.
          </p>
        )}
        <p style={{ margin: 0, color: "var(--muted-2)" }}>
          Bust point = 0.99 / (1 − u) from a 32-bit hash of the seed. That 1% factor is the house
          edge: average return on a perfect cash-out strategy is 99%.
        </p>
      </div>
    </section>
  );
}
