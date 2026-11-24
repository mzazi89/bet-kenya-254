"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CrashCanvas from "./CrashCanvas";
import FairnessCard from "./FairnessCard";
import LiveBets from "./LiveBets";
import { ToastStack, useToasts } from "./ToastStack";
import { money, multiplierLabel, round2 } from "@/lib/game";
import { useAviator } from "@/lib/useAviator";
import { useWallet } from "@/lib/wallet";

type ActiveBet = { stake: number; roundId: number; autoAt: number | null };

const STAKE_CHIPS = [50, 100, 250, 500, 1000];
const AUTO_CHIPS = ["1.50", "2.00", "3.00", "5.00"];
const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

function bigMultiplier(value: number): string {
  if (value >= 100) return `${value.toFixed(0)}x`;
  if (value >= 10) return `${value.toFixed(1)}x`;
  return `${value.toFixed(2)}x`;
}

function historyTone(value: number): string {
  if (value < 2) return "low";
  if (value < 10) return "mid";
  return "high";
}

export default function AviatorGame() {
  const { phase, roundId, multiplier, flightMs, countdownMs, crashPoint, seed, seedHash, history } =
    useAviator();
  const { balance, debit, credit } = useWallet();
  const { items, push } = useToasts();

  const [stake, setStake] = useState(100);
  const [autoOn, setAutoOn] = useState(false);
  const [autoInput, setAutoInput] = useState("2.00");
  const [bet, setBet] = useState<ActiveBet | null>(null);
  const betRef = useRef<ActiveBet | null>(null);
  const crashGuard = useRef(0);

  const updateBet = useCallback((next: ActiveBet | null) => {
    betRef.current = next;
    setBet(next);
  }, []);

  const autoAt = Number.parseFloat(autoInput);
  const autoValid = Number.isFinite(autoAt) && autoAt >= 1.1 && autoAt <= 1000;
  const currentBet = bet && bet.roundId === roundId ? bet : null;
  const queuedBet = bet && bet.roundId > roundId ? bet : null;

  const cashOut = useCallback(
    (target?: number) => {
      const active = betRef.current;
      if (!active || active.roundId !== roundId) return;
      const at = target ?? Math.max(multiplier, 1);
      const payout = round2(active.stake * at);
      updateBet(null);
      credit(payout, `Aviator cash out @ ${multiplierLabel(at)}`);
      push(`Cashed out ${money(payout)} at ${multiplierLabel(at)}`, "win");
    },
    [roundId, multiplier, credit, push, updateBet],
  );

  // Automatic cash-out while the plane is climbing.
  useEffect(() => {
    if (phase !== "flying" || !currentBet || !currentBet.autoAt) return;
    if (multiplier >= currentBet.autoAt) cashOut(currentBet.autoAt);
  }, [phase, multiplier, currentBet, cashOut]);

  // Resolve the round: an uncashed bet is lost when the plane flies away.
  useEffect(() => {
    if (phase !== "crashed" || crashGuard.current === roundId) return;
    crashGuard.current = roundId;
    if (bet && bet.roundId === roundId) {
      push(`Flew away at ${multiplierLabel(crashPoint)} — ${money(bet.stake)} lost`, "lose");
      updateBet(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundId, crashPoint, push, bet]);

  const placeBet = () => {
    if (betRef.current) return;
    const amount = Math.round(stake);
    if (amount < 10) {
      push("Minimum stake is KES 10", "lose");
      return;
    }
    const targetRound = phase === "waiting" ? roundId : roundId + 1;
    if (!debit(amount, `Aviator stake · round #${targetRound}`)) {
      push("Not enough demo balance — add 1,000 with the top-up button", "lose");
      return;
    }
    const auto = autoOn && autoValid ? autoAt : null;
    updateBet({ stake: amount, roundId: targetRound, autoAt: auto });
    push(
      auto
        ? `Bet placed · auto cash out at ${multiplierLabel(auto)}`
        : targetRound > roundId
          ? "Queued for the next round"
          : "Bet placed — waiting for takeoff",
      "info",
    );
  };

  const cancelBet = () => {
    const active = betRef.current;
    if (!active || active.roundId !== roundId) return;
    updateBet(null);
    credit(active.stake, "Aviator bet cancelled");
    push("Bet cancelled — stake returned", "info");
  };

  const secondsLeft = Math.ceil(countdownMs / 1000);
  const ringOffset = RING_CIRCUMFERENCE * (1 - Math.min(countdownMs / 7000, 1));
  const canCashOut = Boolean(currentBet) && phase === "flying";
  const canCancel = Boolean(currentBet) && phase === "waiting";
  const shortOfFunds = !bet && balance < Math.round(stake);
  const stakeTooLow = Math.round(stake) < 10;

  let button: React.ReactNode;
  if (canCashOut && currentBet) {
    button = (
      <button type="button" className="action-btn cashout" onClick={() => cashOut()}>
        <span className="btn-main">CASH OUT {money(round2(currentBet.stake * multiplier))}</span>
        <small>
          {multiplierLabel(multiplier)} · stake {money(currentBet.stake)}
        </small>
      </button>
    );
  } else if (canCancel && currentBet) {
    button = (
      <button type="button" className="action-btn queued" onClick={cancelBet}>
        <span className="btn-main">BET PLACED · {money(currentBet.stake)}</span>
        <small>Tap to cancel and get the stake back</small>
      </button>
    );
  } else if (queuedBet) {
    button = (
      <button type="button" className="action-btn queued" disabled>
        <span className="btn-main">QUEUED · NEXT ROUND</span>
        <small>
          {money(queuedBet.stake)}
          {queuedBet.autoAt ? ` · auto ${multiplierLabel(queuedBet.autoAt)}` : ""}
        </small>
      </button>
    );
  } else if (phase === "crashed") {
    button = (
      <button type="button" className="action-btn queued" disabled>
        <span className="btn-main">ROUND OVER</span>
        <small>Next round is loading…</small>
      </button>
    );
  } else {
    button = (
      <button
        type="button"
        className="action-btn"
        onClick={placeBet}
        disabled={shortOfFunds || stakeTooLow}
      >
        <span className="btn-main">{phase === "flying" ? "BET NEXT ROUND" : "PLACE BET"}</span>
        <small>
          {shortOfFunds
            ? "Insufficient balance"
            : stakeTooLow
              ? "Minimum stake KES 10"
              : `${money(stake)}${autoOn && autoValid ? ` · auto ${multiplierLabel(autoAt)}` : ""}`}
        </small>
      </button>
    );
  }

  return (
    <>
      <div className="layout-game">
        <div className="card stage-card">
          <div className="stage-top">
            <span className="stage-tag">
              <span className="live-dot" />
              Aviator
            </span>
            <span className="eyebrow">Round #{roundId}</span>
            <div className="history-strip" aria-label="Recent multipliers">
              {history.length === 0 ? (
                <span className="history-empty">Recent busts appear here</span>
              ) : (
                history.map((round) => (
                  <span key={round.id} className={`history-chip ${historyTone(round.crash)}`}>
                    {multiplierLabel(round.crash)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="stage">
            <CrashCanvas phase={phase} multiplier={multiplier} flightMs={flightMs} />

            <div className="multiplier-overlay">
              {phase === "waiting" ? (
                <div className="countdown-wrap">
                  <div className="countdown-ring">
                    <svg viewBox="0 0 96 96" aria-hidden="true">
                      <circle className="ring-track" cx="48" cy="48" r="42" />
                      <circle
                        className="ring-value"
                        cx="48"
                        cy="48"
                        r="42"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        strokeDashoffset={ringOffset}
                      />
                    </svg>
                    <span className="countdown-number">{Math.max(secondsLeft, 0)}</span>
                  </div>
                  <span className="multiplier-caption">
                    {history.length > 0
                      ? `Last round ${multiplierLabel(history[0].crash)} · next takeoff`
                      : "Next takeoff"}
                  </span>
                </div>
              ) : (
                <>
                  <span
                    className={`multiplier-value${
                      phase === "crashed" ? " crashed" : multiplier >= 10 ? " hot" : ""
                    }`}
                  >
                    {bigMultiplier(phase === "crashed" ? crashPoint : multiplier)}
                  </span>
                  <span className={`multiplier-caption${phase === "crashed" ? " bust" : ""}`}>
                    {phase === "crashed" ? "Flew away" : "Cash out before it busts"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="stage-footer">
            <span>
              Round <strong>#{roundId}</strong>
            </span>
            <span className="mono">
              {phase === "flying"
                ? `t + ${(flightMs / 1000).toFixed(1)}s`
                : phase === "crashed"
                  ? `busted @ ${multiplierLabel(crashPoint)}`
                  : `next in ${Math.max(secondsLeft, 0)}s`}
            </span>
            <span>Limits KES 10 – 25,000</span>
          </div>

          <div className="bet-panel">
            <div className="bet-grid">
              <div className="field">
                <label className="field-label" htmlFor="stake">
                  Stake (KES)
                </label>
                <div className="stake-row">
                  <button
                    type="button"
                    className="step-btn"
                    onClick={() => setStake((s) => Math.max(10, s - 50))}
                    aria-label="Decrease stake"
                  >
                    −
                  </button>
                  <input
                    id="stake"
                    className="stake-input"
                    inputMode="numeric"
                    value={stake}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                      setStake(Number.isFinite(next) ? Math.min(next, 25000) : 0);
                    }}
                    onBlur={() => setStake((s) => Math.min(Math.max(s || 10, 10), 25000))}
                    aria-label="Stake amount in KES"
                  />
                  <button
                    type="button"
                    className="step-btn"
                    onClick={() => setStake((s) => Math.min(25000, s + 50))}
                    aria-label="Increase stake"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="auto">
                  Auto cash out
                </label>
                <div className="stake-row">
                  <input
                    id="auto"
                    className="auto-input"
                    inputMode="decimal"
                    value={autoInput}
                    disabled={!autoOn}
                    onChange={(e) => setAutoInput(e.target.value.replace(/[^\d.]/g, ""))}
                    onBlur={() => {
                      const v = Number.parseFloat(autoInput);
                      setAutoInput(Number.isFinite(v) && v >= 1.1 ? v.toFixed(2) : "2.00");
                    }}
                  />
                  <span className="mono" style={{ color: "var(--muted-2)", fontSize: 13 }}>
                    x
                  </span>
                </div>
              </div>
            </div>

            <div className="chips">
              {STAKE_CHIPS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip${stake === value ? " active" : ""}`}
                  onClick={() => setStake(value)}
                >
                  +{value}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                onClick={() => setStake(Math.min(25000, Math.max(10, Math.floor(balance))))}
              >
                Max
              </button>
            </div>

            <div className="switch-row">
              <span>Auto cash out at</span>
              <span className="chips">
                {AUTO_CHIPS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip${autoOn && autoInput === value ? " active" : ""}`}
                    onClick={() => {
                      setAutoOn(true);
                      setAutoInput(value);
                    }}
                  >
                    {value}x
                  </button>
                ))}
              </span>
              <button
                type="button"
                className={`switch${autoOn ? " on" : ""}`}
                onClick={() => setAutoOn((v) => !v)}
                aria-pressed={autoOn}
                aria-label="Toggle auto cash out"
              />
            </div>

            {button}
            <p className="bet-note">
              Betting during a flight queues your stake for the next round. Demo credits only.
            </p>
          </div>
        </div>

        <aside className="side-stack">
          <LiveBets roundId={roundId} phase={phase} multiplier={multiplier} crashPoint={crashPoint} />
          <FairnessCard
            roundId={roundId}
            phase={phase}
            seedHash={seedHash}
            seed={seed}
            crashPoint={crashPoint}
          />
        </aside>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 3 3 10.5l6.5 2.2L12 20l3-6.5L21 3Z" />
          </svg>
          <h3>One plane, one multiplier</h3>
          <p>
            The multiplier climbs from 1.00x and can fly away at any moment. Cash out early for a
            small win, or hold your nerve for a bigger one.
          </p>
        </div>
        <div className="info-card">
          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v16M6 20h12M4 8h16M7 8l-3 5.5a3 3 0 0 0 6 0L7 8Zm10 0-3 5.5a3 3 0 0 0 6 0L17 8Z" />
          </svg>
          <h3>1% house edge, transparent math</h3>
          <p>
            Every bust is derived from a committed hash: 0.99 / (1 − u). Around half of all rounds
            end below 2.00x, and 1% bust instantly at 1.00x.
          </p>
        </div>
        <div className="info-card">
          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 3 3 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 3 3 0 0 0 0-6Z" />
            <path d="M13 7v10" strokeDasharray="2 2.5" />
          </svg>
          <h3>Play money, always</h3>
          <p>
            This is a demo build. Balances, bets and payouts are virtual, stored in your browser,
            and cannot be deposited or withdrawn.
          </p>
        </div>
      </div>

      <ToastStack items={items} />
    </>
  );
}
