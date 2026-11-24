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
              Crash games and a Kenyan sportsbook, built with Next.js. Demo mode needs no
              account; registered accounts add a wallet, limits and bet history.
            </p>
          </div>

          <div className="footer-links">
            <Link href="/">Lobby</Link>
            <Link href="/aviator">Aviator</Link>
            <Link href="/sports">Sportsbook</Link>
            <Link href="/fair">Provably fair</Link>
            <Link href="/account">My account</Link>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <span className="age-badge">18+</span>
            <span style={{ fontSize: 11.5, color: "var(--muted-2)", maxWidth: 190 }}>
              Gambling is for adults only. Set limits before you play, not after.
            </span>
          </div>
        </div>

        <div className="footer-note">
          <span>
            <strong style={{ color: "var(--muted)" }}>Play-money preview.</strong> No deposits,
            withdrawals or real-money wagers are processed. Balances are virtual, have no cash
            value, and accounts on this deployment are stored in this browser only — connect a
            Postgres database to make them portable. Operating a real betting service in Kenya
            requires a BCLB licence, KYC/AML controls and responsible-gambling tooling.
          </span>
        </div>
      </div>
    </footer>
  );
}
