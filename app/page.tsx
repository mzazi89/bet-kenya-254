import Link from "next/link";
import LobbyTicker from "@/components/LobbyTicker";

const STATS = [
  { label: "Return to player", value: "99.0%", green: true },
  { label: "Max multiplier", value: "5,000x", green: false },
  { label: "Min stake", value: "KES 10", green: false },
  { label: "Round cadence", value: "~20s", green: false },
];

const GAMES = [
  {
    href: "/aviator",
    title: "Aviator",
    desc: "Cash out before the plane flies away. Rounds resolve in seconds, provably fair seeds on every one.",
    tag: "Live",
    tagClass: "live",
    rtp: "99% RTP",
    art: "av",
  },
  {
    href: "/sports",
    title: "Sportsbook",
    desc: "Kenyan football, rugby, cricket and global leagues. Singles or accumulators, settled in seconds.",
    tag: "Live",
    tagClass: "live",
    rtp: "Demo odds",
    art: "sp",
  },
  {
    href: "#",
    title: "Dice",
    desc: "Roll under or over, tune your own win chance and payout. In the build queue.",
    tag: "Soon",
    tagClass: "soon",
    rtp: "—",
    art: "soon",
  },
  {
    href: "#",
    title: "Crash tournaments",
    desc: "Scheduled rounds with a shared prize pool and a leaderboard. In the build queue.",
    tag: "Soon",
    tagClass: "soon",
    rtp: "—",
    art: "soon",
  },
] as const;

function PlaneArt() {
  return (
    <svg viewBox="0 0 420 250" className="hero-plane" role="img" aria-label="Multiplier curve">
      <defs>
        <linearGradient id="curveFill" x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0%" stopColor="#22e08a" stopOpacity="0" />
          <stop offset="100%" stopColor="#22e08a" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="curveLine" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0fb56d" />
          <stop offset="100%" stopColor="#6dffbe" />
        </linearGradient>
      </defs>
      {[70, 115, 160, 205].map((y) => (
        <line key={y} x1="26" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path
        d="M26 212 C 120 200 190 178 268 112 C 300 86 322 66 344 48 L 344 212 Z"
        fill="url(#curveFill)"
      />
      <path
        d="M26 212 C 120 200 190 178 268 112 C 300 86 322 66 344 48"
        fill="none"
        stroke="url(#curveLine)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="344" cy="48" r="14" fill="rgba(34,224,138,0.18)" />
      <circle cx="344" cy="48" r="5" fill="#ffffff" />
      <g transform="translate(352 30) rotate(-22)">
        <path d="M0 0 L52 -16 L30 6 L26 26 L12 8 Z" fill="#eafff5" opacity="0.9" />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Crash games · Kenyan sportsbook</span>
          <h1>
            Ride the multiplier.
            <br />
            Cash out <em>before it flies.</em>
          </h1>
          <p>
            Live crash rounds, real market prices and a wallet that remembers every bet. Start in
            demo with no sign-up, or open an account for your own balance, limits and history.
          </p>
          <div className="hero-actions">
            <Link href="/aviator" className="btn-primary">
              Play Aviator
            </Link>
            <Link href="/sports" className="btn-ghost">
              Browse sportsbook
            </Link>
          </div>
          <div className="stat-strip">
            {STATS.map((stat) => (
              <div className="stat" key={stat.label}>
                <div className="stat-label">{stat.label}</div>
                <div className={`stat-value${stat.green ? " green" : ""}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-art">
          <PlaneArt />
          <span className="hero-mult">2.41x</span>
        </div>
      </section>

      <div className="section-head">
        <div>
          <h2>Games &amp; markets</h2>
          <p>Two products live today, with more in the build queue.</p>
        </div>
        <Link href="/aviator" className="btn-ghost btn-sm">
          Open the game →
        </Link>
      </div>

      <div className="game-grid">
        {GAMES.map((game) => (
          <Link href={game.href} className="game-card" key={game.title}>
            <div className={`game-thumb ${game.art}`}>
              {game.art === "av" ? (
                <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <path
                    d="M6 38C14 34 20 28 26 18"
                    stroke="#22e08a"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path d="M30 14 44 6 36 22 32 20Z" fill="#eafff5" />
                </svg>
              ) : game.art === "sp" ? (
                <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <circle cx="24" cy="24" r="15" stroke="#7cc4ff" strokeWidth="2.5" />
                  <path
                    d="M24 9v30M9 24h30"
                    stroke="#7cc4ff"
                    strokeWidth="2"
                    strokeDasharray="2 3"
                  />
                  <path d="M18 20h12v8H18z" fill="rgba(124,196,255,0.25)" stroke="#7cc4ff" />
                </svg>
              ) : (
                <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <rect
                    x="10"
                    y="10"
                    width="28"
                    height="28"
                    rx="6"
                    stroke="rgba(255,201,92,0.45)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M24 18v12M18 24h12"
                    stroke="rgba(255,201,92,0.45)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <div className="game-body">
              <div className="game-title">
                {game.title}
                <span className={`tag ${game.tagClass}`}>{game.tag}</span>
              </div>
              <p className="game-desc">{game.desc}</p>
              <div className="game-foot">
                <span className="tag rtp">{game.rtp}</span>
                <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>
                  {game.tag === "Live" ? "Play →" : "In build"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <LobbyTicker />

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Built like a real book</h2>
            <span className="spacer" />
            <span className="pill green">v2</span>
          </div>
          <div style={{ padding: "14px 16px 18px" }} className="stack-10">
            {[
              {
                title: "Two wallets, one switch",
                body: "Anonymous demo credits for trying things out; a registered account wallet with its own ledger, deposits and withdrawals.",
              },
              {
                title: "Limits before you play",
                body: "Daily deposit and loss limits, reality-check reminders and self-exclusion — configurable from your account.",
              },
              {
                title: "Verifiable rounds",
                body: "Every crash round commits a seed hash before takeoff and reveals the seed after the bust. Recompute any round on the fairness page.",
              },
              {
                title: "Ledger you can audit",
                body: "Each stake, payout and deposit is written to a transaction ledger with running balance context.",
              },
            ].map((item) => (
              <div key={item.title} style={{ display: "flex", gap: 10 }}>
                <svg
                  viewBox="0 0 20 20"
                  width="18"
                  height="18"
                  fill="none"
                  style={{ flexShrink: 0, marginTop: 2, color: "var(--green)" }}
                  aria-hidden="true"
                >
                  <path
                    d="M4 10.5 8 14.5 16 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 650 }}>{item.title}</div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--muted-2)",
                      lineHeight: 1.55,
                      marginTop: 2,
                    }}
                  >
                    {item.body}
                  </div>
                </div>
              </div>
            ))}
            <Link href="/auth" className="btn-primary" style={{ marginTop: 6 }}>
              Create an account
            </Link>
          </div>
        </section>
      </div>

      <div className="notice" style={{ marginTop: 18 }}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2 2 17h16L10 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M10 7v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="10" cy="14.4" r="1" fill="currentColor" />
        </svg>
        <span>
          <strong style={{ color: "var(--text)" }}>18+ · Play money.</strong> This build never
          handles real cash. Accounts, deposits and withdrawals are simulated and stored in your
          browser; real-money operation needs a BCLB licence, a server database and KYC/AML
          controls.
        </span>
      </div>
    </>
  );
}
