"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Mode = "demo" | "account";
export type KycStatus = "unverified" | "pending" | "verified";

export type Transaction = {
  id: string;
  label: string;
  amount: number;
  kind: string;
  at: number;
};

export type BetLeg = {
  id?: string;
  match: string;
  market: string;
  pick: string;
  odds: number;
};

export type Ticket = {
  id: string;
  stake: number;
  odds: number;
  status: "pending" | "won" | "lost";
  payout: number;
  placedAt: number;
  legs: BetLeg[];
};

export type AviatorBet = {
  id: string;
  roundId: number;
  stake: number;
  cashout: number | null;
  payout: number;
  status: string;
  at: number;
};

export type Limits = { dailyDeposit: number; dailyLoss: number; realityCheckMin: number };

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  isGuest: boolean;
  kyc: KycStatus;
  kycRef: string | null;
  idNumber: string | null;
  twoFactor: boolean;
  selfExcludedUntil: number | null;
  createdAt: number;
  limits: Limits;
};

export type WalletSnapshot = {
  balance: number;
  depositedToday: number;
  stakedToday: number;
  wonToday: number;
  transactions: Transaction[];
  tickets: Ticket[];
  aviatorBets: AviatorBet[];
};

export type Withdrawal = {
  id: string;
  amount: number;
  method: string;
  destination: string;
  status: "pending" | "paid";
  at: number;
};

type Snapshot = {
  profile: Profile | null;
  wallets: Record<Mode, WalletSnapshot>;
  withdrawals: Withdrawal[];
};

type Result = { ok: boolean; error?: string };

const emptyWallet: WalletSnapshot = {
  balance: 0,
  depositedToday: 0,
  stakedToday: 0,
  wonToday: 0,
  transactions: [],
  tickets: [],
  aviatorBets: [],
};

const emptySnapshot: Snapshot = {
  profile: null,
  wallets: { demo: emptyWallet, account: emptyWallet },
  withdrawals: [],
};

type BankValue = {
  ready: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  profile: Profile | null;
  isSignedIn: boolean;
  isVerified: boolean;
  balance: number;
  transactions: Transaction[];
  tickets: Ticket[];
  aviatorBets: AviatorBet[];
  withdrawals: Withdrawal[];
  limits: Limits;
  selfExcludedUntil: number | null;
  canBet: boolean;
  lossToday: number;
  stakedToday: number;
  signUp: (input: {
    name: string;
    email: string;
    phone: string;
    dob: string;
    password: string;
  }) => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<Result>;
  submitKyc: (name: string, idNumber: string) => Promise<Result>;
  approveKyc: () => Promise<Result>;
  setLimits: (patch: Partial<Limits>) => Promise<Result>;
  selfExclude: (days: number) => Promise<Result>;
  toggleTwoFactor: () => Promise<Result>;
  deposit: (amount: number, method: string) => Promise<Result>;
  requestWithdrawal: (amount: number, method: string, destination: string) => Promise<Result>;
  topUpDemo: () => Promise<Result>;
  resetDemo: () => Promise<Result>;
  placeAviatorBet: (roundId: number, stake: number) => Promise<Result & { betId?: string }>;
  settleAviatorBet: (
    betId: string,
    cashout: number | null,
  ) => Promise<Result & { payout?: number }>;
  placeTicket: (
    stake: number,
    odds: number,
    legs: BetLeg[],
  ) => Promise<Result & { ticketId?: string }>;
  settleTicket: (ticketId: string) => Promise<Result & { won?: boolean; payout?: number }>;
  refresh: () => Promise<void>;
};

const BankContext = createContext<BankValue | null>(null);

const DEFAULT_LIMITS: Limits = { dailyDeposit: 10000, dailyLoss: 5000, realityCheckMin: 30 };

export function BankProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<Mode>("demo");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot as Snapshot);
        if (data.snapshot.profile && !data.snapshot.profile.isGuest) setModeState("account");
      }
    } catch {
      // API unavailable — render with empty state rather than crashing
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const call = useCallback(async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({ ok: false, error: "Bad response" }))) as Record<
      string,
      unknown
    > &
      Result;
    if (data.snapshot) setSnapshot(data.snapshot as Snapshot);
    return data;
  }, []);

  const profile = snapshot.profile;
  const wallet = snapshot.wallets[mode] ?? emptyWallet;
  const limits = profile?.limits ?? DEFAULT_LIMITS;
  const selfExcludedUntil = profile?.selfExcludedUntil ?? null;
  const excluded = Boolean(selfExcludedUntil && selfExcludedUntil > Date.now());
  const lossToday = Math.max(0, Math.round((wallet.stakedToday - wallet.wonToday) * 100) / 100);
  const canBet = !excluded && lossToday < limits.dailyLoss;

  const value = useMemo<BankValue>(
    () => ({
      ready,
      mode,
      setMode: setModeState,
      profile,
      isSignedIn: Boolean(profile && !profile.isGuest),
      isVerified: profile?.kyc === "verified",
      balance: wallet.balance,
      transactions: wallet.transactions,
      tickets: wallet.tickets,
      aviatorBets: wallet.aviatorBets,
      withdrawals: snapshot.withdrawals,
      limits,
      selfExcludedUntil,
      canBet,
      lossToday,
      stakedToday: wallet.stakedToday,
      signUp: async (input) => {
        const res = await call("/api/auth", { action: "register", ...input });
        if (res.ok) setModeState("account");
        return { ok: Boolean(res.ok), error: res.error };
      },
      signIn: async (email, password) => {
        const res = await call("/api/auth", { action: "login", email, password });
        if (res.ok) setModeState("account");
        return { ok: Boolean(res.ok), error: res.error };
      },
      signOut: async () => {
        await call("/api/auth", { action: "logout" });
        setModeState("demo");
      },
      changePassword: async (current, next) => {
        const res = await call("/api/account", { action: "password", current, next });
        return { ok: Boolean(res.ok), error: res.error };
      },
      submitKyc: async (name, idNumber) => {
        const res = await call("/api/account", { action: "kyc", name, idNumber });
        return { ok: Boolean(res.ok), error: res.error };
      },
      approveKyc: async () => {
        const res = await call("/api/account", { action: "kyc-approve" });
        return { ok: Boolean(res.ok), error: res.error };
      },
      setLimits: async (patch) => {
        const res = await call("/api/account", { action: "limits", ...patch });
        return { ok: Boolean(res.ok), error: res.error };
      },
      selfExclude: async (days) => {
        const res = await call("/api/account", { action: "exclude", days });
        return { ok: Boolean(res.ok), error: res.error };
      },
      toggleTwoFactor: async () => {
        const res = await call("/api/account", { action: "two-factor" });
        return { ok: Boolean(res.ok), error: res.error };
      },
      deposit: async (amount, method) => {
        const res = await call("/api/wallet", { action: "deposit", amount, method });
        return { ok: Boolean(res.ok), error: res.error };
      },
      requestWithdrawal: async (amount, method, destination) => {
        const res = await call("/api/wallet", { action: "withdraw", amount, method, destination });
        return { ok: Boolean(res.ok), error: res.error };
      },
      topUpDemo: async () => {
        const res = await call("/api/wallet", { action: "demo-topup" });
        return { ok: Boolean(res.ok), error: res.error };
      },
      resetDemo: async () => {
        const res = await call("/api/wallet", { action: "demo-reset" });
        return { ok: Boolean(res.ok), error: res.error };
      },
      placeAviatorBet: async (roundId, stake) => {
        const res = await call("/api/aviator", { action: "place", roundId, stake, mode });
        return { ok: Boolean(res.ok), error: res.error, betId: res.betId as string | undefined };
      },
      settleAviatorBet: async (betId, cashout) => {
        const res = await call("/api/aviator", { action: "settle", betId, cashout });
        return { ok: Boolean(res.ok), error: res.error, payout: res.payout as number | undefined };
      },
      placeTicket: async (stake, odds, legs) => {
        const res = await call("/api/sports", { action: "place", stake, odds, legs, mode });
        return {
          ok: Boolean(res.ok),
          error: res.error,
          ticketId: res.ticketId as string | undefined,
        };
      },
      settleTicket: async (ticketId) => {
        const res = await call("/api/sports", { action: "settle", ticketId });
        return {
          ok: Boolean(res.ok),
          error: res.error,
          won: res.won as boolean | undefined,
          payout: res.payout as number | undefined,
        };
      },
      refresh: load,
    }),
    [
      ready,
      mode,
      profile,
      wallet,
      snapshot.withdrawals,
      limits,
      selfExcludedUntil,
      canBet,
      lossToday,
      call,
      load,
    ],
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBank(): BankValue {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error("useBank must be used inside <BankProvider>");
  return ctx;
}
