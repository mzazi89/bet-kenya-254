"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { money } from "@/lib/game";
import { useWallet } from "@/lib/wallet";

const NAV = [
  { href: "/", label: "Aviator" },
  { href: "/sports", label: "Sportsbook" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { balance, topUp, ready, resetWallet } = useWallet();

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

        <div className="wallet-chip">
          <span className="wallet-meta">
            <span className="wallet-label">Balance</span>
            <span className="wallet-balance">{ready ? money(balance) : "KES —"}</span>
          </span>
          <button
            type="button"
            className="topup-btn"
            onClick={() => topUp(1000)}
            title="Add KES 1,000 of demo credits"
          >
            + 1,000
          </button>
          <button
            type="button"
            className="topup-btn reset-btn"
            onClick={() => {
              if (window.confirm("Reset demo wallet to KES 5,000 and clear history?")) {
                resetWallet();
              }
            }}
            title="Reset the demo wallet"
          >
            Reset
          </button>
        </div>

        <span className="demo-badge">Play money</span>
      </div>
    </header>
  );
}
