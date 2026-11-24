"use client";

import { useEffect, useMemo, useState } from "react";
import { hashString, multiplierLabel, money, seededRandom } from "@/lib/game";

type Event = { id: number; name: string; stake: number; at: number; payout: number };

const NAMES = [
  "Brian K.",
  "Wanjiku N.",
  "Omondi T.",
  "Faith W.",
  "Kamau P.",
  "Achieng' O.",
  "Dennis M.",
  "Sharon A.",
  "Kiptoo A.",
  "Mercy G.",
  "Njoroge S.",
  "Amina H.",
];

function makeEvents(seed: number, count = 6): Event[] {
  const rnd = seededRandom(hashString(`ticker:${seed}`));
  const pool = [...NAMES];
  return Array.from({ length: count }, (_, i) => {
    const stake = [50, 100, 200, 500, 1000][Math.floor(rnd() * 5)];
    const at = Math.round((1.2 + Math.pow(rnd(), 1.6) * 14) * 100) / 100;
    const name = pool.splice(Math.floor(rnd() * pool.length), 1)[0] ?? NAMES[i % NAMES.length];
    return {
      id: seed * 100 + i,
      name,
      stake,
      at,
      payout: Math.round(stake * at * 100) / 100,
    };
  });
}

export default function LobbyTicker() {
  const [seed, setSeed] = useState(1);
  const events = useMemo(() => makeEvents(seed), [seed]);

  useEffect(() => {
    const timer = window.setInterval(() => setSeed((s) => s + 1), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="card">
      <div className="card-head">
        <span className="live-dot" />
        <h2 className="card-title">Demo activity</h2>
        <span className="spacer" />
        <span className="card-sub">simulated players</span>
      </div>
      <div className="live-list" style={{ maxHeight: "none" }}>
        {events.map((event, index) => (
          <div className="live-row" key={`${seed}-${event.id}`} style={{ opacity: 1 - index * 0.1 }}>
            <span
              className="avatar"
              style={{ background: index % 2 ? "var(--gold)" : "var(--green)" }}
              aria-hidden="true"
            >
              {event.name.charAt(0)}
            </span>
            <span>
              <span className="live-name">{event.name}</span>
              <br />
              <span className="live-stake">
                staked {money(event.stake)} · cashed at {multiplierLabel(event.at)}
              </span>
            </span>
            <span className="live-status status-win">+{money(event.payout)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
