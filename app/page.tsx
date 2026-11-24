import AviatorGame from "@/components/AviatorGame";

export default function Home() {
  return (
    <>
      <div className="row" style={{ gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Aviator</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            Watch the multiplier climb, cash out before the plane flies away.
          </p>
        </div>
        <span className="spacer" />
        <span className="pill green">
          <span className="live-dot" /> Round in progress
        </span>
      </div>

      <AviatorGame />
    </>
  );
}
