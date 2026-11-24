import type { Metadata } from "next";
import FairVerifier from "@/components/FairVerifier";

export const metadata: Metadata = {
  title: "Provably fair · Bet Kenya 254",
  description: "Recompute any crash round from its seed and verify the commitment.",
};

export default function FairPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Provably fair</h1>
          <p>Every round commits a seed hash before takeoff and reveals the seed after the bust.</p>
        </div>
      </div>
      <FairVerifier />
    </>
  );
}
