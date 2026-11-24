"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { money, round2 } from "@/lib/game";
import {
  MATCHES,
  SPORTS,
  type Match,
  type Market,
  type Pick,
} from "@/lib/sports";
import { useBank, type BetLeg } from "@/lib/bank";
import { ToastStack, useToasts } from "./ToastStack";

const TABS = ["All", ...SPORTS] as const;
const STAKE_CHIPS = [100, 250, 500, 1000, 2500];
const SETTLE_MS = 14000;

function money2(value: number) {
  return value.toFixed(2);
}

export default function SportsPage() {
  const { balance, addTicket, tickets, settleTicket, mode } = useBank();
  const { items, push } = useToasts();

  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [panel, setPanel] = useState<"slip" | "bets">("slip");
  const [selections, setSelections] = useState<BetLeg[]>([]);
  const [stake, setStake] = useState("500");
  const timers = useRef(new Map<string, number>());

  const stakeValue = Math.max(0, Math.floor(Number(stake) || 0));
  const totalOdds = useMemo(
    () => round2(selections.reduce((acc, leg) => acc * leg.odds, 1)),
    [selections],
  );
  const potential = round2(stakeValue * totalOdds);

  const matches = useMemo(
    () => (tab === "All" ? MATCHES : MATCHES.filter((match) => match.sport === tab)),
    [tab],
  );

  const pendingBets = tickets.filter((ticket) => ticket.status === "pending").length;

  // Simulated settlement: every slip resolves a few seconds after placement.
  useEffect(() => {
    tickets
      .filter((ticket) => ticket.status === "pending")
      .forEach((ticket) => {
        if (timers.current.has(ticket.id)) return;
        const elapsed = Date.now() - ticket.placedAt;
        const delay = Math.max(1200, SETTLE_MS - elapsed);
        const timer = window.setTimeout(() => {
          timers.current.delete(ticket.id);
          const won = Math.random() < 0.9 / ticket.odds;
          const payout = settleTicket(ticket.id, won);
          if (payout === null) return; // slip was cleared (e.g. wallet reset)
          push(
            won
              ? `Slip won — ${money(payout)} paid out`
              : `Slip lost — ${money(ticket.stake)} stake gone`,
            won ? "win" : "lose",
          );
        }, delay);
        timers.current.set(ticket.id, timer);
      });
  }, [tickets, settleTicket, push]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => window.clearTimeout(timer));
      map.clear();
    };
  }, []);

  const togglePick = (match: Match, market: Market, pick: Pick) => {
    const legId = `${match.id}:${market.id}:${pick.id}`;
    setSelections((prev) => {
      if (prev.some((leg) => leg.id === legId)) {
        return prev.filter((leg) => leg.id !== legId);
      }
      // One selection per market per match.
      const cleaned = prev.filter((leg) => !leg.id.startsWith(`${match.id}:${market.id}:`));
      return [
        ...cleaned,
        {
          id: legId,
          match: `${match.home} vs ${match.away}`,
          market: market.name,
          pick: pick.label,
          odds: pick.odds,
        },
      ];
    });
  };

  const placeSlip = () => {
    if (selections.length === 0) {
      push("Add at least one pick to your slip", "lose");
      return;
    }
    if (stakeValue < 10) {
      push("Minimum stake is KES 10", "lose");
      return;
    }
    const id = addTicket({ stake: stakeValue, odds: totalOdds, legs: selections });
    if (!id) {
      push("Not enough balance, or betting is blocked by your limits", "lose");
      return;
    }
    push(`Slip placed · ${money(stakeValue)} at ${money2(totalOdds)} odds`, "info");
    setSelections([]);
    setPanel("bets");
  };

  return (
    <>
      <div className="layout-sports">
        <div>
          <h1 className="page-title">Sportsbook</h1>
          <p className="page-sub">
            Kenyan and international markets with simulated odds. Build a single, a double or an
            accumulator — slips settle a few seconds after you place them.
          </p>

          <div className="sport-tabs" role="tablist" aria-label="Sports">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                className={`tab${tab === item ? " active" : ""}`}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="match-list">
            {matches.map((match) => (
              <article className="match-card" key={match.id}>
                <div className="match-top">
                  <span className="league">{match.league}</span>
                  <span>·</span>
                  <span>{match.kickoff}</span>
                  {match.live && <span className="tag-live">live</span>}
                  <span className="spacer" />
                  {match.score ? (
                    <span className="team-score">{match.score}</span>
                  ) : (
                    <span className="pill">{match.sport}</span>
                  )}
                </div>

                <div className="match-teams">
                  <div className="team-line">
                    <span>{match.home}</span>
                  </div>
                  <div className="team-line">
                    <span>{match.away}</span>
                  </div>
                  <div className="venue">{match.venue}</div>
                </div>

                <div className="markets">
                  {match.markets.map((market) => (
                    <div className="market-row" key={market.id}>
                      <span className="market-name">{market.name}</span>
                      <div className="picks">
                        {market.picks.map((pick) => {
                          const legId = `${match.id}:${market.id}:${pick.id}`;
                          const selected = selections.some((leg) => leg.id === legId);
                          return (
                            <button
                              key={pick.id}
                              type="button"
                              className={`pick${selected ? " selected" : ""}`}
                              aria-pressed={selected}
                              onClick={() => togglePick(match, market, pick)}
                            >
                              <span className="pick-label">{pick.label}</span>
                              <span className="odds">{pick.odds.toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="card betslip" id="my-bets">
          <div className="slip-tabs">
            <button
              type="button"
              className={`slip-tab${panel === "slip" ? " active" : ""}`}
              onClick={() => setPanel("slip")}
            >
              Bet slip ({selections.length})
            </button>
            <button
              type="button"
              className={`slip-tab${panel === "bets" ? " active" : ""}`}
              onClick={() => setPanel("bets")}
            >
              My bets ({tickets.length})
            </button>
          </div>

          {panel === "slip" ? (
            <div className="slip-body">
              {selections.length === 0 ? (
                <div className="empty-state">
                  Your slip is empty.
                  <br />
                  Tap any odds to add a pick.
                </div>
              ) : (
                <>
                  {selections.map((leg) => (
                    <div className="slip-leg" key={leg.id}>
                      <div>
                        <div className="slip-leg-match">{leg.match}</div>
                        <div className="slip-leg-pick">{leg.pick}</div>
                        <div className="slip-leg-market">{leg.market}</div>
                      </div>
                      <div className="slip-leg-right">
                        <button
                          type="button"
                          className="remove-btn"
                          aria-label={`Remove ${leg.pick}`}
                          onClick={() =>
                            setSelections((prev) => prev.filter((item) => item.id !== leg.id))
                          }
                        >
                          ×
                        </button>
                        <span className="odds">{leg.odds.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}

                  <div className="slip-total">
                    <span>
                      {selections.length} {selections.length === 1 ? "pick" : "picks"} · total odds
                    </span>
                    <strong>{money2(totalOdds)}</strong>
                  </div>

                  <div className="stake-field">
                    <span className="prefix">Stake</span>
                    <input
                      inputMode="numeric"
                      value={stake}
                      aria-label="Stake amount"
                      onChange={(e) => setStake(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <span className="prefix">KES</span>
                  </div>

                  <div className="chips">
                    {STAKE_CHIPS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`chip${stakeValue === value ? " active" : ""}`}
                        onClick={() => setStake(String(value))}
                      >
                        {value}
                      </button>
                    ))}
                  </div>

                  <div className="potential">
                    <span>Potential return</span>
                    <strong>{money(potential)}</strong>
                  </div>

                  <button
                    type="button"
                    className="place-btn"
                    disabled={stakeValue < 10 || stakeValue > balance}
                    onClick={placeSlip}
                  >
                    {stakeValue > balance ? "Insufficient balance" : `Place bet · ${money(stakeValue)}`}
                  </button>
                  <p className="bet-note" style={{ margin: 0 }}>
                    {mode === "demo" ? "Demo" : "Account"} balance {money(balance)} · odds and
                    results are simulated.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="tickets">
              {tickets.length === 0 ? (
                <div className="empty-state">No slips yet. Build one from the markets.</div>
              ) : (
                tickets.map((ticket) => (
                  <div className="ticket" key={ticket.id}>
                    <div className="ticket-top">
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted-2)" }}>
                        {new Date(ticket.placedAt).toLocaleTimeString("en-KE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {money2(ticket.odds)} odds
                      </span>
                      <span className={`ticket-status ${ticket.status}`}>
                        {ticket.status === "pending" ? "open" : ticket.status}
                      </span>
                    </div>

                    <div className="ticket-legs">
                      {ticket.legs.map((leg) => (
                        <span key={leg.id}>
                          {leg.match} — {leg.pick} @ {leg.odds.toFixed(2)}
                        </span>
                      ))}
                    </div>

                    <div className="ticket-amount">
                      <span>Stake {money(ticket.stake)}</span>
                      <span>
                        {ticket.status === "won"
                          ? `+${money(ticket.payout)}`
                          : ticket.status === "lost"
                            ? `−${money(ticket.stake)}`
                            : `to return ${money(round2(ticket.stake * ticket.odds))}`}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {pendingBets > 0 && (
                <p className="bet-note" style={{ margin: 0 }}>
                  {pendingBets} open {pendingBets === 1 ? "slip" : "slips"} · results land in a few
                  seconds.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      <ToastStack items={items} />
    </>
  );
}
