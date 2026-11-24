"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/game";
import { useBank } from "@/lib/bank";

type Tab = "overview" | "wallet" | "limits" | "kyc" | "security";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "wallet", label: "Wallet" },
  { id: "limits", label: "Limits & safety" },
  { id: "kyc", label: "Verification" },
  { id: "security", label: "Security" },
];

const DEPOSIT_METHODS = ["M-Pesa STK", "Card", "Airtel Money"];
const WITHDRAW_METHODS = ["M-Pesa", "Bank transfer"];

function fmtDate(value: number | string) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(value: number) {
  return new Date(value).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export default function AccountPanels() {
  const params = useSearchParams();
  const router = useRouter();
  const {
    profile,
    isSignedIn,
    signOut,
    balance,
    transactions,
    tickets,
    withdrawals,
    limits,
    setLimits,
    selfExclude,
    selfExcludedUntil,
    canBet,
    lossToday,
    stakedToday,
    deposit,
    requestWithdrawal,
    submitKyc,
    updateProfile,
    changePassword,
    toggleTwoFactor,
    topUpDemo,
    resetDemo,
    mode,
  } = useBank();

  const requested = params.get("tab");
  const initialTab = (TABS.some((t) => t.id === requested) ? requested : "overview") as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [depositAmount, setDepositAmount] = useState("1000");
  const [depositMethod, setDepositMethod] = useState(DEPOSIT_METHODS[0]);
  const [withdrawAmount, setWithdrawAmount] = useState("1000");
  const [withdrawMethod, setWithdrawMethod] = useState(WITHDRAW_METHODS[0]);
  const [destination, setDestination] = useState(profile?.phone ?? "");

  const [limitDraft, setLimitDraft] = useState({
    dailyDeposit: String(limits.dailyDeposit),
    dailyLoss: String(limits.dailyLoss),
    realityCheckMin: String(limits.realityCheckMin),
  });

  const [kycName, setKycName] = useState(profile?.name ?? "");
  const [kycId, setKycId] = useState(profile?.idNumber ?? "");

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);

  if (!isSignedIn || !profile) {
    return (
      <div className="card" style={{ padding: 28, maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 21 }}>Sign in to continue</h2>
        <p style={{ margin: "0 0 18px", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6 }}>
          The wallet, limits and verification screens belong to a registered account. Demo mode
          keeps working without one.
        </p>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <Link href="/auth" className="btn-primary">
            Sign in or create an account
          </Link>
          <Link href="/aviator" className="btn-ghost">
            Keep playing demo
          </Link>
        </div>
      </div>
    );
  }

  const staked = transactions
    .filter((t) => t.kind === "bet")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const won = transactions.filter((t) => t.kind === "win").reduce((sum, t) => sum + t.amount, 0);
  const net = Math.round((won - staked) * 100) / 100;

  const excluded = Boolean(selfExcludedUntil && selfExcludedUntil > Date.now());
  const daysLeft = selfExcludedUntil
    ? Math.max(0, Math.ceil((selfExcludedUntil - Date.now()) / 86_400_000))
    : 0;

  const doDeposit = () => {
    const amount = Number.parseInt(depositAmount, 10) || 0;
    const result = deposit(amount, depositMethod);
    setToast(
      result.ok
        ? { tone: "ok", text: `${money(amount)} added via ${depositMethod} (simulated, no charge)` }
        : { tone: "error", text: result.error ?? "Deposit failed" },
    );
  };

  const doWithdraw = () => {
    const amount = Number.parseInt(withdrawAmount, 10) || 0;
    const result = requestWithdrawal(amount, withdrawMethod, destination || profile.phone);
    setToast(
      result.ok
        ? {
            tone: "ok",
            text: `Withdrawal request for ${money(amount)} submitted — pending review`,
          }
        : { tone: "error", text: result.error ?? "Withdrawal failed" },
    );
  };

  const saveLimits = () => {
    const next = {
      dailyDeposit: Math.max(0, Number.parseInt(limitDraft.dailyDeposit, 10) || 0),
      dailyLoss: Math.max(0, Number.parseInt(limitDraft.dailyLoss, 10) || 0),
      realityCheckMin: Math.max(0, Number.parseInt(limitDraft.realityCheckMin, 10) || 0),
    };
    setLimits(next);
    setToast({ tone: "ok", text: "Limits updated. Lower limits apply immediately." });
  };

  const changePw = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pw.next !== pw.confirm) {
      setToast({ tone: "error", text: "New passwords do not match" });
      return;
    }
    setPwBusy(true);
    const result = await changePassword(pw.current, pw.next);
    setPwBusy(false);
    setToast(
      result.ok
        ? { tone: "ok", text: "Password updated" }
        : { tone: "error", text: result.error ?? "Could not update password" },
    );
    if (result.ok) setPw({ current: "", next: "", confirm: "" });
  };

  return (
    <div className="stack-16">
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            className="avatar"
            style={{ width: 46, height: 46, fontSize: 16, background: "var(--green)" }}
          >
            {profile.name
              .split(" ")
              .map((p) => p.charAt(0))
              .slice(0, 2)
              .join("")}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted-2)" }}>
              {profile.email} · member since {fmtDate(profile.createdAt)}
            </div>
          </div>
          <div className="spacer" />
          <span className={`badge ${profile.kyc === "verified" ? "green" : profile.kyc === "pending" ? "gold" : "neutral"}`}>
            {profile.kyc === "verified" ? "KYC verified" : profile.kyc === "pending" ? "KYC in review" : "KYC required"}
          </span>
          <span className={`badge ${mode === "account" ? "gold" : "neutral"}`}>
            {mode === "account" ? "Account wallet" : "Demo wallet"}
          </span>
          <span className="pill mono">{money(balance)}</span>
        </div>

        <div className="tabbar" style={{ padding: "0 12px" }}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "active" : ""}
              onClick={() => {
                setTab(item.id);
                setToast(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {toast && <div className={`alert ${toast.tone}`}>{toast.text}</div>}

      {excluded && (
        <div className="alert error">
          Self-exclusion is active for another {daysLeft} day{daysLeft === 1 ? "" : "s"}. Betting
          is blocked until it expires.
        </div>
      )}
      {!canBet && !excluded && (
        <div className="alert info">
          Your daily loss limit ({money(limits.dailyLoss)}) is reached — betting is paused until
          tomorrow, or raise the limit in Limits &amp; safety.
        </div>
      )}

      {tab === "overview" && (
        <div className="stack-16">
          <div className="grid-2">
            <section className="card" style={{ padding: 18 }}>
              <div className="eyebrow">Account balance</div>
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 10px" }}>
                {money(balance)}
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn-primary btn-sm" onClick={() => setTab("wallet")}>
                  Deposit
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setTab("wallet")}>
                  Withdraw
                </button>
                <Link href="/aviator" className="btn-ghost btn-sm">
                  Play Aviator
                </Link>
              </div>
            </section>

            <section className="card" style={{ padding: 18 }}>
              <div className="eyebrow">Today</div>
              <div className="kv">
                <span>Staked</span>
                <strong className="mono">{money(stakedToday)}</strong>
              </div>
              <div className="kv">
                <span>Net result</span>
                <strong className="mono" style={{ color: lossToday > 0 ? "#ff9dab" : "var(--green)" }}>
                  {lossToday > 0 ? `−${money(lossToday)}` : money(0)}
                </strong>
              </div>
              <div className="kv">
                <span>Loss limit</span>
                <strong className="mono">
                  {money(limits.dailyLoss)}
                </strong>
              </div>
            </section>
          </div>

          <div className="grid-2">
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Recent activity</h2>
                <span className="spacer" />
                <button type="button" className="chip" onClick={() => setTab("wallet")}>
                  Full ledger
                </button>
              </div>
              <div style={{ padding: "6px 16px 14px" }}>
                {transactions.length === 0 ? (
                  <div className="empty-state">Nothing yet — place a bet or make a deposit.</div>
                ) : (
                  transactions.slice(0, 6).map((tx) => (
                    <div className="ledger-row" key={tx.id}>
                      <div>
                        <div className="ledger-label">{tx.label}</div>
                        <div className="ledger-meta">
                          {fmtDate(tx.at)} · {fmtTime(tx.at)}
                        </div>
                      </div>
                      <div className={`ledger-amount ${tx.amount >= 0 ? "plus" : "minus"}`}>
                        {tx.amount >= 0 ? "+" : "−"}
                        {money(Math.abs(tx.amount))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="card" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Lifetime on this account
              </div>
              <div className="kv">
                <span>Total staked</span>
                <strong className="mono">{money(staked)}</strong>
              </div>
              <div className="kv">
                <span>Total returned</span>
                <strong className="mono">{money(won)}</strong>
              </div>
              <div className="kv">
                <span>Net</span>
                <strong className="mono" style={{ color: net >= 0 ? "var(--green)" : "#ff9dab" }}>
                  {net >= 0 ? "+" : "−"}
                  {money(Math.abs(net))}
                </strong>
              </div>
              <div className="kv">
                <span>Sports slips</span>
                <strong>{tickets.length}</strong>
              </div>
              <div className="kv">
                <span>Withdrawal requests</span>
                <strong>{withdrawals.length}</strong>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "wallet" && (
        <div className="stack-16">
          <div className="grid-2">
            <section className="card" style={{ padding: 18 }}>
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                Deposit
              </h2>
              <div className="form-grid">
                <label className="form-field">
                  <span>Amount (KES)</span>
                  <input
                    inputMode="numeric"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </label>
                <div className="amount-presets">
                  {[500, 1000, 2500, 5000].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip${depositAmount === String(value) ? " active" : ""}`}
                      onClick={() => setDepositAmount(String(value))}
                    >
                      {value.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div>
                  <span className="field-label">Method</span>
                  <div className="method-grid" style={{ marginTop: 6 }}>
                    {DEPOSIT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={`method${depositMethod === method ? " active" : ""}`}
                        onClick={() => setDepositMethod(method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className="btn-primary" onClick={doDeposit}>
                  Deposit {money(Number.parseInt(depositAmount, 10) || 0)}
                </button>
                <p className="bet-note" style={{ margin: 0 }}>
                  Simulated: no STK push is sent and no card is charged. Deposits count against your
                  daily limit of {money(limits.dailyDeposit)}.
                </p>
              </div>
            </section>

            <section className="card" style={{ padding: 18 }}>
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                Withdraw
              </h2>
              <div className="form-grid">
                <label className="form-field">
                  <span>Amount (KES)</span>
                  <input
                    inputMode="numeric"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </label>
                <div>
                  <span className="field-label">Method</span>
                  <div className="method-grid" style={{ marginTop: 6, gridTemplateColumns: "1fr 1fr" }}>
                    {WITHDRAW_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={`method${withdrawMethod === method ? " active" : ""}`}
                        onClick={() => setWithdrawMethod(method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="form-field">
                  <span>{withdrawMethod === "M-Pesa" ? "M-Pesa number" : "Account number"}</span>
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={withdrawMethod === "M-Pesa" ? "0712 345 678" : "0123456789"}
                  />
                </label>
                <button type="button" className="btn-ghost" onClick={doWithdraw}>
                  Request withdrawal
                </button>
                <p className="bet-note" style={{ margin: 0 }}>
                  {profile.kyc === "verified"
                    ? "Requests are recorded as pending; no money is moved in this preview."
                    : "Identity verification is required before withdrawals."}
                </p>
              </div>
            </section>
          </div>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Ledger</h2>
              <span className="spacer" />
              <span className="card-sub">{transactions.length} entries</span>
            </div>
            <div style={{ padding: "6px 16px 14px" }}>
              {transactions.length === 0 ? (
                <div className="empty-state">Your ledger is empty.</div>
              ) : (
                transactions.map((tx) => (
                  <div className="ledger-row" key={tx.id}>
                    <div>
                      <div className="ledger-label">{tx.label}</div>
                      <div className="ledger-meta">
                        {fmtDate(tx.at)} · {fmtTime(tx.at)} · {tx.kind}
                      </div>
                    </div>
                    <div className={`ledger-amount ${tx.amount >= 0 ? "plus" : "minus"}`}>
                      {tx.amount >= 0 ? "+" : "−"}
                      {money(Math.abs(tx.amount))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Withdrawal requests</h2>
            </div>
            <div style={{ padding: "6px 16px 14px" }}>
              {withdrawals.length === 0 ? (
                <div className="empty-state">No withdrawal requests yet.</div>
              ) : (
                withdrawals.map((w) => (
                  <div className="ledger-row" key={w.id}>
                    <div>
                      <div className="ledger-label">
                        {money(w.amount)} → {w.method}
                      </div>
                      <div className="ledger-meta">
                        {fmtDate(w.at)} · {w.destination}
                      </div>
                    </div>
                    <span className={`badge ${w.status === "paid" ? "green" : "gold"}`}>
                      {w.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "limits" && (
        <div className="stack-16">
          <section className="card" style={{ padding: 18 }}>
            <h2 className="card-title" style={{ marginBottom: 4 }}>
              Daily limits
            </h2>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              Lower limits apply immediately. Raising them is a deliberate action — think about it
              before you do.
            </p>
            <div className="grid-2">
              <label className="form-field">
                <span>Daily deposit limit (KES)</span>
                <input
                  inputMode="numeric"
                  value={limitDraft.dailyDeposit}
                  onChange={(e) =>
                    setLimitDraft((prev) => ({
                      ...prev,
                      dailyDeposit: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Daily loss limit (KES)</span>
                <input
                  inputMode="numeric"
                  value={limitDraft.dailyLoss}
                  onChange={(e) =>
                    setLimitDraft((prev) => ({
                      ...prev,
                      dailyLoss: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Reality check (minutes)</span>
                <select
                  value={limitDraft.realityCheckMin}
                  onChange={(e) =>
                    setLimitDraft((prev) => ({ ...prev, realityCheckMin: e.target.value }))
                  }
                >
                  {["0", "15", "30", "60", "120"].map((value) => (
                    <option key={value} value={value}>
                      {value === "0" ? "Off" : `Every ${value} min`}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", alignItems: "flex-end", gridColumn: "1 / -1" }}>
                <button type="button" className="btn-primary" onClick={saveLimits}>
                  Save limits
                </button>
              </div>
            </div>
            <div className="kv" style={{ marginTop: 12 }}>
              <span>Lost today</span>
              <strong className="mono">{money(lossToday)}</strong>
            </div>
          </section>

          <section className="card" style={{ padding: 18 }}>
            <h2 className="card-title" style={{ marginBottom: 4 }}>
              Self-exclusion
            </h2>
            <p className="card-sub" style={{ marginBottom: 12 }}>
              Blocks all bets and deposits on this account for the period you choose. It cannot be
              undone early.
            </p>
            {excluded ? (
              <div className="alert info">
                Active until {selfExcludedUntil ? fmtDate(selfExcludedUntil) : "—"} ({daysLeft} day
                {daysLeft === 1 ? "" : "s"} left).
              </div>
            ) : (
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {[1, 7, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Self-exclude for ${days} day${days === 1 ? "" : "s"}? Betting will be blocked immediately.`,
                        )
                      ) {
                        selfExclude(days);
                        setToast({ tone: "ok", text: `Self-exclusion active for ${days} day(s)` });
                      }
                    }}
                  >
                    {days} day{days === 1 ? "" : "s"}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "kyc" && (
        <div className="stack-16">
          <section className="card" style={{ padding: 18 }}>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <h2 className="card-title">Identity verification</h2>
              <span className="spacer" />
              <span
                className={`badge ${profile.kyc === "verified" ? "green" : profile.kyc === "pending" ? "gold" : "neutral"}`}
              >
                {profile.kyc}
              </span>
            </div>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              Real operators check an ID document against a selfie. This preview captures the
              reference and simulates the decision — nothing is uploaded anywhere.
            </p>

            {profile.kyc === "unverified" && (
              <div className="form-grid">
                <label className="form-field">
                  <span>Full legal name</span>
                  <input value={kycName} onChange={(e) => setKycName(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>National ID / passport number</span>
                  <input value={kycId} onChange={(e) => setKycId(e.target.value)} placeholder="12345678" />
                </label>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (kycName.trim().length < 3 || kycId.trim().length < 5) {
                      setToast({ tone: "error", text: "Enter your legal name and a valid ID number" });
                      return;
                    }
                    submitKyc(kycName, kycId);
                    setToast({ tone: "ok", text: "Submitted for review" });
                  }}
                >
                  Submit for review
                </button>
              </div>
            )}

            {profile.kyc === "pending" && (
              <div className="stack-10">
                <div className="kv">
                  <span>Reference</span>
                  <strong className="mono">{profile.kycRef}</strong>
                </div>
                <div className="kv">
                  <span>ID number</span>
                  <strong className="mono">{profile.idNumber}</strong>
                </div>
                <button
                  type="button"
                  className="btn-gold"
                  onClick={() => {
                    updateProfile({ kyc: "verified" });
                    setToast({ tone: "ok", text: "Verification approved (simulated)" });
                  }}
                >
                  Simulate approval (demo)
                </button>
              </div>
            )}

            {profile.kyc === "verified" && (
              <div className="alert ok">
                Verified — withdrawals are enabled. Reference {profile.kycRef}.
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "security" && (
        <div className="stack-16">
          <div className="grid-2">
            <section className="card" style={{ padding: 18 }}>
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                Change password
              </h2>
              <form className="form-grid" onSubmit={changePw}>
                <label className="form-field">
                  <span>Current password</span>
                  <input
                    type="password"
                    value={pw.current}
                    onChange={(e) => setPw((prev) => ({ ...prev, current: e.target.value }))}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <label className="form-field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={pw.next}
                    onChange={(e) => setPw((prev) => ({ ...prev, next: e.target.value }))}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <label className="form-field">
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    value={pw.confirm}
                    onChange={(e) => setPw((prev) => ({ ...prev, confirm: e.target.value }))}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <button type="submit" className="btn-primary" disabled={pwBusy}>
                  {pwBusy ? "Updating…" : "Update password"}
                </button>
              </form>
            </section>

            <section className="card" style={{ padding: 18 }}>
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                Sessions &amp; devices
              </h2>
              <div className="kv">
                <span>Two-factor authentication</span>
                <button type="button" className="chip" onClick={toggleTwoFactor}>
                  {profile.twoFactor ? "Enabled · turn off" : "Disabled · turn on"}
                </button>
              </div>
              <div className="kv">
                <span>This device</span>
                <span className="mono" style={{ fontSize: 11.5 }}>
                  {typeof navigator !== "undefined" ? navigator.platform || "Browser" : "Browser"} · local storage
                </span>
              </div>
              <div className="kv">
                <span>Sign out everywhere</span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    signOut();
                    router.push("/");
                  }}
                >
                  Sign out
                </button>
              </div>
              <div className="notice" style={{ marginTop: 12 }}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 2 2 17h16L10 2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M10 7v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>
                  Accounts in this preview live in this browser&apos;s storage. Clearing site data
                  removes them; connecting the production database makes them portable.
                </span>
              </div>
            </section>
          </div>

          <section className="card" style={{ padding: 18 }}>
            <h2 className="card-title" style={{ marginBottom: 12 }}>
              Demo tools
            </h2>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost btn-sm" onClick={topUpDemo}>
                + KES 1,000 demo credits
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  if (window.confirm("Reset the demo wallet to KES 5,000?")) {
                    resetDemo();
                    setToast({ tone: "ok", text: "Demo wallet reset" });
                  }
                }}
              >
                Reset demo wallet
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
