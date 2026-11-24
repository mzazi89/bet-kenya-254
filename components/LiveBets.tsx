"use client";

import { useMemo } from "react";
import { hashString, multiplierLabel, seededRandom } from "@/lib/game";
import type { Phase } from "@/lib/useAviator";

const NAMES = [
  "Kipchoge M.",
  "Wanjiku N.",
  "Otieno J.",
  "Achieng' O.",
  "Kamau P.",
  "Mutiso D.",
  "Chebet R.",
  "Njoroge S.",
  "Amina H.",
  "Brian K.",
  "Faith W.",
  "Omondi T.",
  "Mercy G.",
  "Kiptoo A.",
  "Dennis M.",
  "Sharon A.",
  "Hassan I.",
  "Wairimu L.",
  "Njeri K.",
  "Barasa E.",
];

const STAKES = [20, 50, 100, 100, 200, 250, 500, 1000, 2000, 5000];
const COLORS = ["#22e08a", "#ffc95c", "#7cc4ff", "#ff8fb1", "#b28dff", "#6fe0d0", "#ffa26b"];

type Bot = {
  id: string;
  name: string;
  stake: number;
  target: number;
  color: string;
};

type Props = {
  roundId: number;
  phase: Phase;
  multiplier: number;
  crashPoint: number;
};

export default function LiveBets({ roundId, phase, multiplier, crashPoint }: Props) {
  const bots = useMemo<Bot[]>(() => {
    const rnd = seededRandom(hashString(`players:${roundId}`));
    const pool = [...NAMES];
    const count = 7 + Math.floor(rnd() * 3);
    const list: Bot[] = [];

    for (let i = 0; i < count; i++) {
      const name = pool.splice(Math.floor(rnd() * pool.length), 1)[0] ?? `Player ${i + 1}`;
      const stake = STAKES[Math.floor(rnd() * STAKES.length)];
      const target = Math.round((1.15 + Math.pow(rnd(), 1.7) * 7.5) * 100) / 100;
      list.push({
        id: `${roundId}-${i}`,
        name,
        stake,
        target,
        color: COLORS[Math.floor(rnd() * COLORS.length)],
      });
    }
    return list.sort((a, b) => b.stake - a.stake);
  }, [roundId]);

  const totalStaked = bots.reduce((sum, bot) => sum + bot.stake, 0);

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Live bets</h2>
        <span className="pill">{bots.length} players</span>
        <span className="spacer" />
        <span className="card-sub mono">KES {totalStaked.toLocaleString("en-KE")}</span>
      </div>

      <div className="live-list">
        {bots.map((bot) => {
          const cashed = phase !== "waiting" && bot.target <= (phase === "crashed" ? crashPoint : multiplier);
          const lost = phase === "crashed" && bot.target > crashPoint;

          return (
            <div className="live-row" key={bot.id}>
              <span className="avatar" style={{ background: bot.color }} aria-hidden="true">
                {bot.name.charAt(0)}
              </span>
              <span>
                <span className="live-name">{bot.name}</span>
                <br />
                <span className="live-stake">KES {bot.stake.toLocaleString("en-KE")}</span>
              </span>
              {phase === "waiting" ? (
                <span className="live-status status-live">waiting</span>
              ) : cashed ? (
                <span className="live-status status-win">@ {multiplierLabel(bot.target)}</span>
              ) : lost ? (
                <span className="live-status status-lost">lost</span>
              ) : (
                <span className="live-status status-live">in play</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
