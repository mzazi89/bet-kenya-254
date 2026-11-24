import type { Metadata } from "next";
import AuthPanel from "@/components/AuthPanel";

export const metadata: Metadata = {
  title: "Sign in · Bet Kenya 254",
  description: "Create an account to unlock the wallet, limits and bet history.",
};

export default function AuthPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>One login for the crash game, the sportsbook and your wallet.</p>
        </div>
      </div>
      <AuthPanel />
    </>
  );
}
