"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ types */

export type Mode = "demo" | "account";
export type KycStatus = "unverified" | "pending" | "verified";
export type TxKind = "bet" | "win" | "deposit" | "withdrawal" | "bonus" | "reset";

export type Transaction = {
  id: string;
  label: string;
  amount: number;
  kind: TxKind;
  at: number;
};

export type BetLeg = {
  id: string;
  match: string;
  market: string;
  pick: string;
  odds: number;
};

export type TicketStatus = "pending" | "won" | "lost";

export type Ticket = {
  id: string;
  stake: number;
  odds: number;
  legs: BetLeg[];
  status: TicketStatus;
  placedAt: number;
  payout: number;
};

export type AviatorBet = {
  id: string;
  roundId: number;
  stake: number;
  cashout: number | null; // multiplier cashed out at, null = lost
  payout: number;
  at: number;
};

export type Limits = {
  dailyDeposit: number;
  dailyLoss: number;
  realityCheckMin: number;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  salt: string;
  passwordHash: string;
  createdAt: number;
  kyc: KycStatus;
  kycRef?: string;
  idNumber?: string;
  limits: Limits;
  selfExcludedUntil?: number;
  twoFactor: boolean;
};

export type Bucket = {
  balance: number;
  transactions: Transaction[];
  tickets: Ticket[];
  aviatorBets: AviatorBet[];
  dayKey: string;
  depositedToday: number;
  stakedToday: number;
  wonToday: number;
};

export type Withdrawal = {
  id: string;
  amount: number;
  method: string;
  destination: string;
  status: "pending" | "paid";
  at: number;
};

type WithdrawalRecord = Withdrawal & { profileId: string };

type State = {
  profiles: Profile[];
  buckets: Record<string, Bucket>;
  sessionId: string | null;
  withdrawals: WithdrawalRecord[];
};

export const START_DEMO_BALANCE = 5000;
const STORAGE_KEY = "bk254.state.v3";
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_LIMITS: Limits = {
  dailyDeposit: 10000,
  dailyLoss: 5000,
  realityCheckMin: 30,
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function emptyBucket(balance: number): Bucket {
  return {
    balance,
    transactions: [],
    tickets: [],
    aviatorBets: [],
    dayKey: todayKey(),
    depositedToday: 0,
    stakedToday: 0,
    wonToday: 0,
  };
}

function initialState(): State {
  return {
    profiles: [],
    buckets: { demo: emptyBucket(START_DEMO_BALANCE) },
    sessionId: null,
    withdrawals: [],
  };
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* --------------------------------------------------------------- crypto */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations: 150_000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/* -------------------------------------------------------------- validation */

export function emailProblem(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) return "Enter a valid email address";
  return null;
}

export function phoneProblem(phone: string): string | null {
  const digits = phone.replace(/[\s-]/g, "");
  if (!/^(?:\+254|0)(?:7|1)\d{8}$/.test(digits)) {
    return "Use a Kenyan number, e.g. 0712 345 678 or +254712345678";
  }
  return null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Include at least one letter and one number";
  }
  return null;
}

export function ageFrom(dob: string): number {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/* --------------------------------------------------------------- context */

type SignUpInput = {
  name: string;
  email: string;
  phone: string;
  dob: string;
  password: string;
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
  signUp: (input: SignUpInput) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  updateProfile: (patch: Partial<Profile>) => void;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  submitKyc: (fullName: string, idNumber: string) => void;
  setLimits: (patch: Partial<Limits>) => void;
  selfExclude: (days: number) => void;
  toggleTwoFactor: () => void;
  debit: (amount: number, label: string) => boolean;
  credit: (amount: number, label: string) => void;
  recordAviatorBet: (bet: Omit<AviatorBet, "id" | "at">) => void;
  addTicket: (ticket: Omit<Ticket, "id" | "status" | "placedAt" | "payout">) => string | null;
  settleTicket: (id: string, won: boolean) => number | null;
  deposit: (amount: number, method: string) => { ok: boolean; error?: string };
  requestWithdrawal: (
    amount: number,
    method: string,
    destination: string,
  ) => { ok: boolean; error?: string };
  topUpDemo: () => void;
  resetDemo: () => void;
};

const BankContext = createContext<BankValue | null>(null);

function bucketOf(state: State, key: string): Bucket {
  const bucket = state.buckets[key] ?? emptyBucket(0);
  if (bucket.dayKey !== todayKey()) {
    return {
      ...bucket,
      dayKey: todayKey(),
      depositedToday: 0,
      stakedToday: 0,
      wonToday: 0,
    };
  }
  return bucket;
}

export function BankProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<Mode>("demo");
  const ref = useRef(state);

  const commit = useCallback((updater: (prev: State) => State) => {
    const next = updater(ref.current);
    ref.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed && Array.isArray(parsed.profiles)) {
          const hydrated: State = {
            profiles: parsed.profiles ?? [],
            buckets: parsed.buckets ?? { demo: emptyBucket(START_DEMO_BALANCE) },
            sessionId: parsed.sessionId ?? null,
            withdrawals: parsed.withdrawals ?? [],
          };
          if (!hydrated.buckets.demo) hydrated.buckets.demo = emptyBucket(START_DEMO_BALANCE);
          ref.current = hydrated;
          setState(hydrated);

          const session = hydrated.profiles.find((p) => p.id === hydrated.sessionId);
          if (session) setModeState("account");
        }
      }
    } catch {
      // ignore corrupt storage
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be full or blocked
    }
  }, [state, ready]);

  const profile = useMemo(
    () => state.profiles.find((p) => p.id === state.sessionId) ?? null,
    [state.profiles, state.sessionId],
  );

  const bucketKey = mode === "account" && profile ? profile.id : "demo";
  const bucket = bucketOf(state, bucketKey);
  const demoBucket = bucketOf(state, "demo");

  const selfExcludedUntil = profile?.selfExcludedUntil ?? null;
  const excluded = Boolean(selfExcludedUntil && selfExcludedUntil > Date.now());

  const lossToday = Math.max(0, round2(bucket.stakedToday - bucket.wonToday));
  const limits = profile?.limits ?? DEFAULT_LIMITS;
  const canBet = !excluded && lossToday < limits.dailyLoss;
  const isVerified = profile?.kyc === "verified";

  const applyToBucket = useCallback(
    (updater: (b: Bucket) => Bucket, key = bucketKey) => {
      commit((prev) => ({
        ...prev,
        buckets: { ...prev.buckets, [key]: updater(bucketOf(prev, key)) },
      }));
    },
    [commit, bucketKey],
  );

  /* ------------------------------------------------------------- auth */

  const signUp = useCallback<BankValue["signUp"]>(
    async ({ name, email, phone, dob, password }) => {
      const cleanEmail = email.trim().toLowerCase();
      const problem =
        (name.trim().length < 3 ? "Enter your full name" : null) ??
        emailProblem(cleanEmail) ??
        phoneProblem(phone) ??
        passwordProblem(password) ??
        (ageFrom(dob) < 18 ? "You must be 18 or older to open an account" : null);
      if (problem) return { ok: false, error: problem };
      if (ref.current.profiles.some((p) => p.email === cleanEmail)) {
        return { ok: false, error: "An account with that email already exists" };
      }

      const salt = randomHex(16);
      const passwordHash = await hashPassword(password, salt);
      const user: Profile = {
        id: uid("usr"),
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        dob,
        salt,
        passwordHash,
        createdAt: Date.now(),
        kyc: "unverified",
        limits: DEFAULT_LIMITS,
        twoFactor: false,
      };

      commit((prev) => ({
        ...prev,
        profiles: [...prev.profiles, user],
        buckets: { ...prev.buckets, [user.id]: emptyBucket(0) },
        sessionId: user.id,
      }));
      setModeState("account");
      return { ok: true };
    },
    [commit],
  );

  const signIn = useCallback<BankValue["signIn"]>(
    async (email, password) => {
      const cleanEmail = email.trim().toLowerCase();
      const user = ref.current.profiles.find((p) => p.email === cleanEmail);
      if (!user) return { ok: false, error: "No account found for that email" };
      const hash = await hashPassword(password, user.salt);
      if (hash !== user.passwordHash) return { ok: false, error: "Incorrect password" };
      commit((prev) => ({ ...prev, sessionId: user.id }));
      setModeState("account");
      return { ok: true };
    },
    [commit],
  );

  const signOut = useCallback(() => {
    commit((prev) => ({ ...prev, sessionId: null }));
    setModeState("demo");
  }, [commit]);

  const updateProfile = useCallback<BankValue["updateProfile"]>(
    (patch) => {
      commit((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === prev.sessionId ? { ...p, ...patch } : p,
        ),
      }));
    },
    [commit],
  );

  const changePassword = useCallback<BankValue["changePassword"]>(
    async (current, next) => {
      const user = ref.current.profiles.find((p) => p.id === ref.current.sessionId);
      if (!user) return { ok: false, error: "Not signed in" };
      const hash = await hashPassword(current, user.salt);
      if (hash !== user.passwordHash) return { ok: false, error: "Current password is incorrect" };
      const problem = passwordProblem(next);
      if (problem) return { ok: false, error: problem };
      const salt = randomHex(16);
      const passwordHash = await hashPassword(next, salt);
      commit((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === user.id ? { ...p, salt, passwordHash } : p,
        ),
      }));
      return { ok: true };
    },
    [commit],
  );

  const submitKyc = useCallback<BankValue["submitKyc"]>(
    (fullName, idNumber) => {
      commit((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === prev.sessionId
            ? {
                ...p,
                name: fullName.trim() || p.name,
                idNumber: idNumber.trim(),
                kyc: "pending",
                kycRef: uid("kyc").toUpperCase(),
              }
            : p,
        ),
      }));
    },
    [commit],
  );

  const setLimits = useCallback<BankValue["setLimits"]>(
    (patch) => {
      commit((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === prev.sessionId ? { ...p, limits: { ...p.limits, ...patch } } : p,
        ),
      }));
    },
    [commit],
  );

  const selfExclude = useCallback<BankValue["selfExclude"]>(
    (days) => {
      commit((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === prev.sessionId
            ? {
                ...p,
                selfExcludedUntil:
                  days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : undefined,
              }
            : p,
        ),
      }));
    },
    [commit],
  );

  const toggleTwoFactor = useCallback(() => {
    commit((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === prev.sessionId ? { ...p, twoFactor: !p.twoFactor } : p,
      ),
    }));
  }, [commit]);

  /* ------------------------------------------------------------ money */

  const guard = useCallback(() => {
    if (excluded) return "Self-exclusion is active on this account";
    if (lossToday >= (profile?.limits.dailyLoss ?? DEFAULT_LIMITS.dailyLoss)) {
      return "Daily loss limit reached";
    }
    return null;
  }, [excluded, lossToday, profile]);

  const debit = useCallback<BankValue["debit"]>(
    (amount, label) => {
      const value = round2(amount);
      if (!(value > 0) || guard()) return false;
      const current = bucketOf(ref.current, bucketKey);
      if (current.balance < value) return false;
      applyToBucket((b) => ({
        ...b,
        balance: round2(b.balance - value),
        stakedToday: round2(b.stakedToday + value),
        transactions: [
          { id: uid("tx"), label, amount: -value, kind: "bet" as TxKind, at: Date.now() },
          ...b.transactions,
        ].slice(0, 60),
      }));
      return true;
    },
    [bucketKey, guard, applyToBucket],
  );

  const credit = useCallback<BankValue["credit"]>(
    (amount, label) => {
      const value = round2(amount);
      if (!(value > 0)) return;
      applyToBucket((b) => ({
        ...b,
        balance: round2(b.balance + value),
        wonToday: round2(b.wonToday + value),
        transactions: [
          { id: uid("tx"), label, amount: value, kind: "win" as TxKind, at: Date.now() },
          ...b.transactions,
        ].slice(0, 60),
      }));
    },
    [applyToBucket],
  );

  const recordAviatorBet = useCallback<BankValue["recordAviatorBet"]>(
    (bet) => {
      applyToBucket((b) => ({
        ...b,
        aviatorBets: [{ ...bet, id: uid("av"), at: Date.now() }, ...b.aviatorBets].slice(0, 30),
      }));
    },
    [applyToBucket],
  );

  const addTicket = useCallback<BankValue["addTicket"]>(
    (ticket) => {
      const stake = round2(ticket.stake);
      const current = bucketOf(ref.current, bucketKey);
      if (!(stake > 0) || current.balance < stake || guard()) return null;
      const id = uid("slip");
      applyToBucket((b) => ({
        ...b,
        balance: round2(b.balance - stake),
        stakedToday: round2(b.stakedToday + stake),
        transactions: [
          {
            id: uid("tx"),
            label: `Bet slip · ${ticket.legs.length} leg${ticket.legs.length > 1 ? "s" : ""}`,
            amount: -stake,
            kind: "bet" as TxKind,
            at: Date.now(),
          },
          ...b.transactions,
        ].slice(0, 60),
        tickets: [
          {
            ...ticket,
            stake,
            id,
            status: "pending" as TicketStatus,
            placedAt: Date.now(),
            payout: 0,
          },
          ...b.tickets,
        ].slice(0, 30),
      }));
      return id;
    },
    [applyToBucket, bucketKey, guard],
  );

  const settleTicket = useCallback<BankValue["settleTicket"]>(
    (id, won) => {
      const ticket = bucketOf(ref.current, bucketKey).tickets.find((t) => t.id === id);
      if (!ticket || ticket.status !== "pending") return null;
      const payout = won ? round2(ticket.stake * ticket.odds) : 0;
      applyToBucket((b) => ({
        ...b,
        balance: round2(b.balance + payout),
        wonToday: round2(b.wonToday + payout),
        tickets: b.tickets.map((t) =>
          t.id === id ? { ...t, status: won ? "won" : "lost", payout } : t,
        ),
        transactions: won
          ? [
              {
                id: uid("tx"),
                label: `Slip won · ${ticket.legs.length} leg${ticket.legs.length > 1 ? "s" : ""}`,
                amount: payout,
                kind: "win" as TxKind,
                at: Date.now(),
              },
              ...b.transactions,
            ].slice(0, 60)
          : b.transactions,
      }));
      return payout;
    },
    [applyToBucket, bucketKey],
  );

  const deposit = useCallback<BankValue["deposit"]>(
    (amount, method) => {
      const value = round2(amount);
      if (!profile) return { ok: false, error: "Sign in to deposit" };
      if (!(value >= 50)) return { ok: false, error: "Minimum deposit is KES 50" };
      const current = bucketOf(ref.current, bucketKey);
      if (current.depositedToday + value > limits.dailyDeposit) {
        return {
          ok: false,
          error: `That exceeds your daily deposit limit of KES ${limits.dailyDeposit.toLocaleString()}`,
        };
      }
      applyToBucket((b) => ({
        ...b,
        balance: round2(b.balance + value),
        depositedToday: round2(b.depositedToday + value),
        transactions: [
          {
            id: uid("tx"),
            label: `Deposit · ${method} (simulated)`,
            amount: value,
            kind: "deposit" as TxKind,
            at: Date.now(),
          },
          ...b.transactions,
        ].slice(0, 60),
      }));
      return { ok: true };
    },
    [applyToBucket, bucketKey, limits.dailyDeposit, profile],
  );

  const requestWithdrawal = useCallback<BankValue["requestWithdrawal"]>(
    (amount, method, destination) => {
      const value = round2(amount);
      if (!profile) return { ok: false, error: "Sign in to withdraw" };
      if (profile.kyc !== "verified") {
        return { ok: false, error: "Verify your identity before withdrawing" };
      }
      if (!(value >= 500)) return { ok: false, error: "Minimum withdrawal is KES 500" };
      const current = bucketOf(ref.current, bucketKey);
      if (current.balance < value) return { ok: false, error: "Insufficient balance" };
      commit((prev) => {
        const prevBucket = bucketOf(prev, bucketKey);
        return {
          ...prev,
          buckets: {
            ...prev.buckets,
            [bucketKey]: {
              ...prevBucket,
              balance: round2(prevBucket.balance - value),
              transactions: [
                {
                  id: uid("tx"),
                  label: `Withdrawal request · ${method}`,
                  amount: -value,
                  kind: "withdrawal" as TxKind,
                  at: Date.now(),
                },
                ...prevBucket.transactions,
              ].slice(0, 60),
            },
          },
          withdrawals: [
            {
              id: uid("wd"),
              profileId: profile.id,
              amount: value,
              method,
              destination,
              status: "pending" as const,
              at: Date.now(),
            },
            ...prev.withdrawals,
          ],
        };
      });
      return { ok: true };
    },
    [bucketKey, commit, profile],
  );

  const topUpDemo = useCallback(() => {
    applyToBucket(
      (b) => ({
        ...b,
        balance: round2(b.balance + 1000),
        transactions: [
          { id: uid("tx"), label: "Demo credits added", amount: 1000, kind: "bonus" as TxKind, at: Date.now() },
          ...b.transactions,
        ].slice(0, 60),
      }),
      "demo",
    );
  }, [applyToBucket]);

  const resetDemo = useCallback(() => {
    commit((prev) => ({
      ...prev,
      buckets: { ...prev.buckets, demo: emptyBucket(START_DEMO_BALANCE) },
    }));
  }, [commit]);

  const setMode = useCallback(
    (next: Mode) => {
      if (next === "account" && !ref.current.sessionId) return;
      setModeState(next);
    },
    [],
  );

  const value = useMemo<BankValue>(
    () => ({
      ready,
      mode,
      setMode,
      profile,
      isSignedIn: Boolean(profile),
      isVerified,
      balance: mode === "account" && !profile ? demoBucket.balance : bucket.balance,
      transactions: bucket.transactions,
      tickets: bucket.tickets,
      aviatorBets: bucket.aviatorBets,
      withdrawals: state.withdrawals
        .filter((w) => (profile ? w.profileId === profile.id : false))
        .map(({ profileId: _profileId, ...rest }) => rest),
      limits,
      selfExcludedUntil,
      canBet,
      lossToday,
      stakedToday: bucket.stakedToday,
      signUp,
      signIn,
      signOut,
      updateProfile,
      changePassword,
      submitKyc,
      setLimits,
      selfExclude,
      toggleTwoFactor,
      debit,
      credit,
      recordAviatorBet,
      addTicket,
      settleTicket,
      deposit,
      requestWithdrawal,
      topUpDemo,
      resetDemo,
    }),
    [
      ready,
      mode,
      setMode,
      profile,
      isVerified,
      bucket,
      demoBucket.balance,
      state.withdrawals,
      limits,
      selfExcludedUntil,
      canBet,
      lossToday,
      signUp,
      signIn,
      signOut,
      updateProfile,
      changePassword,
      submitKyc,
      setLimits,
      selfExclude,
      toggleTwoFactor,
      debit,
      credit,
      recordAviatorBet,
      addTicket,
      settleTicket,
      deposit,
      requestWithdrawal,
      topUpDemo,
      resetDemo,
    ],
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBank(): BankValue {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error("useBank must be used inside <BankProvider>");
  return ctx;
}
