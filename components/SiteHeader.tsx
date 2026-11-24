"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { money } from "@/lib/game";
import { useBank } from "@/lib/bank";

const NAV = [
  { href: "/", label: "Lobby" },
  { href: "/aviator", label: "Aviator" },
  { href: "/sports", label: "Sportsbook" },
  { href: "/account", label: "My account" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { balance, mode, setMode, isSignedIn, profile, ready } = useBank();

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  const chooseAccount = () => {
    if (isSignedIn) setMode("account");
    else router.push("/auth?next=account");
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="Bet Kenya 254 home">
          <span className="logo-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="logo-text">
            <span className="logo-title">BET KENYA</span>
            <span className="logo-sub">Crash · Sports</span>
          </span>
          <span className="logo-254">254</span>
        </Link>

        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mode-switch" role="group" aria-label="Wallet mode">
          <button
            type="button"
            className={mode === "demo" ? "active" : ""}
            onClick={() => setMode("demo")}
          >
            Demo
          </button>
          <button
            type="button"
            className={`${mode === "account" ? "active account" : ""}`}
            onClick={chooseAccount}
            title={isSignedIn ? "Play with your account balance" : "Sign in to use account mode"}
          >
            Account
          </button>
        </div>

        <div className="balance-chip">
          <span className="wallet-meta">
            <span className="wallet-label">{mode === "account" ? "Account" : "Demo"}</span>
            <span className="amount">{ready ? money(balance) : "KES —"}</span>
          </span>
          <Link
            href={isSignedIn ? "/account?tab=wallet" : "/auth?next=deposit"}
            className="deposit-btn"
          >
            Deposit
          </Link>
        </div>

        {isSignedIn && profile ? (
          <Link href="/account" className="user-btn" title="Open my account">
            <span className="avatar" style={{ background: "var(--green)" }}>
              {initials}
            </span>
            <span className="user-name">{profile.name.split(" ")[0]}</span>
          </Link>
        ) : (
          <Link href="/auth" className="btn-ghost btn-sm">
            Sign in
          </Link>
        )}

        <span className="demo-badge" title="All balances on this build are virtual">
          Play money
        </span>
      </div>
    </header>
  );
}
