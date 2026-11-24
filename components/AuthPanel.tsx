"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBank } from "@/lib/bank";

type Tab = "signin" | "signup";

const today = new Date().toISOString().slice(0, 10);
const latestAllowedDob = new Date(
  new Date().setFullYear(new Date().getFullYear() - 18),
).toISOString().slice(0, 10);

export default function AuthPanel() {
  const router = useRouter();
  const { signIn, signUp, isSignedIn } = useBank();
  const [tab, setTab] = useState<Tab>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    password: "",
    confirm: "",
    accepted: false,
  });

  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submitSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(form.email, form.password);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Could not sign in");
    else router.push("/account");
  };

  const submitSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!form.accepted) {
      setError("Confirm that you are 18 or older and accept the house rules");
      return;
    }
    setBusy(true);
    const result = await signUp({
      name: form.name,
      email: form.email,
      phone: form.phone,
      dob: form.dob,
      password: form.password,
    });
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Could not create the account");
    else router.push("/account");
  };

  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <div>
          <span className="eyebrow">Account mode</span>
          <h2>A wallet with a memory.</h2>
          <p>
            Demo mode resets whenever you clear the browser. An account keeps your balance, bet
            history, limits and KYC status together — and unlocks deposits, withdrawals and
            self-exclusion controls.
          </p>
        </div>

        <ul className="auth-points">
          {[
            "Separate account balance from your anonymous demo credits",
            "Full ledger: stakes, payouts, deposits and withdrawal requests",
            "Daily deposit and loss limits, reality checks, self-exclusion",
            "KYC tier required before any withdrawal is accepted",
          ].map((item) => (
            <li key={item}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10.5 8 14.5 16 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="alert info" style={{ fontSize: 11.5 }}>
          Preview build: accounts are stored in this browser only. No real money moves, and no
          personal data leaves the device.
        </div>
      </aside>

      <div className="auth-card">
        {isSignedIn ? (
          <div className="stack-10">
            <h2 style={{ margin: 0, fontSize: 20 }}>You&apos;re already signed in</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              Open your account to manage the wallet, limits and KYC. Or sign out from the account
              page to use a different profile.
            </p>
            <Link href="/account" className="btn-primary">
              Go to my account
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signin"}
                className={tab === "signin" ? "active" : ""}
                onClick={() => {
                  setTab("signin");
                  setError(null);
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signup"}
                className={tab === "signup" ? "active" : ""}
                onClick={() => {
                  setTab("signup");
                  setError(null);
                }}
              >
                Create account
              </button>
            </div>

            {error && <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>}

            {tab === "signin" ? (
              <form className="form-grid" onSubmit={submitSignIn}>
                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email")(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="form-field">
                  <span>Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={(e) => set("password")(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Checking…" : "Sign in"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setError(
                      "Password resets need email delivery, which isn't connected in this preview.",
                    )
                  }
                >
                  Forgot password?
                </button>
                <p className="bet-note" style={{ marginTop: 2 }}>
                  No account yet? Switch to “Create account”. Or{" "}
                  <Link href="/aviator" style={{ color: "var(--green)" }}>
                    keep playing in demo
                  </Link>
                  .
                </p>
              </form>
            ) : (
              <form className="form-grid" onSubmit={submitSignUp}>
                <label className="form-field">
                  <span>Full name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => set("name")(e.target.value)}
                    placeholder="As written on your ID"
                    autoComplete="name"
                  />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email")(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
                <div className="form-row">
                  <label className="form-field">
                    <span>Phone</span>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => set("phone")(e.target.value)}
                      placeholder="0712 345 678"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </label>
                  <label className="form-field">
                    <span>Date of birth</span>
                    <input
                      type="date"
                      required
                      max={latestAllowedDob}
                      min="1900-01-01"
                      value={form.dob}
                      onChange={(e) => set("dob")(e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="form-field">
                    <span>Password</span>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => set("password")(e.target.value)}
                      placeholder="8+ characters"
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="form-field">
                    <span>Confirm</span>
                    <input
                      type="password"
                      required
                      value={form.confirm}
                      onChange={(e) => set("confirm")(e.target.value)}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "flex-start",
                    fontSize: 12,
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.accepted}
                    onChange={(e) => set("accepted")(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    I am 18 or older, I understand this is a play-money preview, and I accept the
                    house rules.
                  </span>
                </label>

                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </button>
                <p className="bet-note" style={{ marginTop: 2 }}>
                  Passwords are hashed with PBKDF2-SHA256 (150k iterations) before storage.
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
