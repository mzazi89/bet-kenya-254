import type { Metadata } from "next";
import { Suspense } from "react";
import AccountPanels from "@/components/AccountPanels";

export const metadata: Metadata = {
  title: "My account · Bet Kenya 254",
  description: "Wallet, limits, verification and security for your account.",
};

export default function AccountPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>My account</h1>
          <p>Wallet, limits, verification and security in one place.</p>
        </div>
      </div>
      <Suspense fallback={<div className="card" style={{ padding: 24 }}>Loading account…</div>}>
        <AccountPanels />
      </Suspense>
    </>
  );
}
