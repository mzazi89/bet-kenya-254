"use client";

import { useState } from "react";
import { crashPointFor, hashString, multiplierLabel, msForMultiplier } from "@/lib/game";

export default function FairVerifier() {
  const [seed, setSeed] = useState("9f2a5c7d1e8b3a46c0d5e9f17a2b4c6d");
  const [round, setRound] = useState("1");

  const roundNumber = Math.max(1, Number.parseInt(round, 10) || 1);
  const crash = seed.trim() ? crashPointFor(seed.trim(), roundNumber) : 0;
  const commit = hashString(`${seed.trim()}:salt`).toString(16).padStart(8, "0");
  const seedHash = `${hashString(seed.trim()).toString(16).padStart(8, "0")}${commit}`;
  const duration = crash > 0 ? Math.round(msForMultiplier(crash) / 100) / 10 : 0;

  return (
    <div className="grid-2">
      <section className="card" style={{ padding: 20 }}>
        <h2 className="card-title" style={{ marginBottom: 10 }}>
          Recompute a round
        </h2>
        <div className="form-grid">
          <label className="form-field">
            <span>Server seed</span>
            <input value={seed} onChange={(event) => setSeed(event.target.value)} spellCheck={false} />
          </label>
          <label className="form-field">
            <span>Round number</span>
            <input
              inputMode="numeric"
              value={round}
              onChange={(event) => setRound(event.target.value.replace(/\D/g, "").slice(0, 9))}
            />
          </label>
        </div>

        <div className="stack-10" style={{ marginTop: 16 }}>
          <div className="hash-line">
            <span>Commitment</span>
            <span title={seedHash}>{seedHash}</span>
          </div>
          <div className="kv">
            <span>Bust point</span>
            <strong className="mono" style={{ color: "var(--red)", fontSize: 16 }}>
              {crash ? multiplierLabel(crash) : "—"}
            </strong>
          </div>
          <div className="kv">
            <span>Flight time</span>
            <strong className="mono">{crash ? `${duration.toFixed(1)}s` : "—"}</strong>
          </div>
          <div className="kv">
            <span>Hash input</span>
            <strong className="mono" style={{ fontSize: 11.5 }}>
              {seed.trim()}:{roundNumber}
            </strong>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <h2 className="card-title" style={{ marginBottom: 10 }}>
          How the proof works
        </h2>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: "var(--muted)" }}>
          <li>The server picks a random seed and publishes its hash before the round starts.</li>
          <li>
            The bust point is derived from <span className="mono">0.99 / (1 − u)</span>, where{" "}
            <span className="mono">u = hash(seed + &quot;:&quot; + round) / 2³²</span>.
          </li>
          <li>After the round busts, the seed is revealed so you can recompute the same result.</li>
          <li>
            Any change to the seed or round number produces a different hash — and a different bust
            point, which is why the commitment must be published first.
          </li>
        </ol>

        <div className="alert info" style={{ marginTop: 14 }}>
          In this preview the round engine runs in your browser, so the seed is generated locally
          rather than committed by a server. The maths is identical; the trust model isn&apos;t. Move
          the generator behind the API before real play.
        </div>

        <div className="hash-line" style={{ marginTop: 14 }}>
          <span>Formula</span>
          <span>0.99 / (1 − u)</span>
        </div>
      </section>
    </div>
  );
}
