import type { Metadata } from "next";
import AviatorGame from "@/components/AviatorGame";

export const metadata: Metadata = {
  title: "Aviator · Bet Kenya 254",
  description: "Crash rounds every few seconds with provably fair seeds and instant cash out.",
};

export default function AviatorPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Aviator</h1>
          <p>Watch the multiplier climb, cash out before the plane flies away.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="pill green">
            <span className="live-dot" /> Round in progress
          </span>
          <span className="pill">1% edge · 5,000x cap</span>
        </div>
      </div>

      <AviatorGame />
    </>
  );
}
