import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="row" style={{ gap: 10 }}>
              <span className="logo-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <strong>BET KENYA 254</strong>
            </div>
            <p>
              A demo crash game and sportsbook for Kenya, built with Next.js. Every balance,
              odds line and payout on this site is virtual.
            </p>
          </div>

          <div className="footer-links">
            <Link href="/">Aviator</Link>
            <Link href="/sports">Sportsbook</Link>
            <Link href="/sports#my-bets">My bets</Link>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <span className="age-badge">18+</span>
            <span style={{ fontSize: 11.5, color: "var(--muted-2)", maxWidth: 190 }}>
              Gambling is for adults only. If it stops being fun, take a break.
            </span>
          </div>
        </div>

        <div className="footer-note">
          <span>
            <strong style={{ color: "var(--muted)" }}>Play-money demo.</strong> No deposits, no
            withdrawals, no M-Pesa or card processing. Credits reset on demand and carry no cash
            value. Built as a portfolio project — not a licensed betting operator. Real-money
            gambling in Kenya requires a BCLB licence; please play responsibly.
          </span>
        </div>
      </div>
    </footer>
  );
}
