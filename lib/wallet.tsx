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

export const START_BALANCE = 5000;
const STORAGE_KEY = "bk254.wallet.v1";

export type TxKind = "bet" | "win" | "topup" | "reset";

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
  settledAt?: number;
};

type WalletState = {
  balance: number;
  transactions: Transaction[];
  tickets: Ticket[];
};

type WalletContextValue = WalletState & {
  ready: boolean;
  debit: (amount: number, label: string) => boolean;
  credit: (amount: number, label: string) => void;
  addTicket: (ticket: Omit<Ticket, "id" | "status" | "placedAt" | "payout">) => string | null;
  settleTicket: (id: string, won: boolean) => number | null;
  topUp: (amount?: number) => void;
  resetWallet: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const initialState: WalletState = {
  balance: START_BALANCE,
  transactions: [],
  tickets: [],
};

function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(initialState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);

  stateRef.current = state;

  // Load once on the client so the server render never mismatches.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WalletState>;
        setState({
          balance: typeof parsed.balance === "number" ? parsed.balance : START_BALANCE,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
        });
      }
    } catch {
      // Corrupt payload -> fall back to a fresh demo wallet.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode); the session still works.
    }
  }, [state, ready]);

  const debit = useCallback((amount: number, label: string) => {
    const value = Math.round(amount * 100) / 100;
    if (!(value > 0) || stateRef.current.balance < value) return false;
    setState((prev) => ({
      ...prev,
      balance: Math.round((prev.balance - value) * 100) / 100,
      transactions: [
        { id: nextId("tx"), label, amount: -value, kind: "bet" as TxKind, at: Date.now() },
        ...prev.transactions,
      ].slice(0, 40),
    }));
    return true;
  }, []);

  const credit = useCallback((amount: number, label: string) => {
    const value = Math.round(amount * 100) / 100;
    if (!(value > 0)) return;
    setState((prev) => ({
      ...prev,
      balance: Math.round((prev.balance + value) * 100) / 100,
      transactions: [
        { id: nextId("tx"), label, amount: value, kind: "win" as TxKind, at: Date.now() },
        ...prev.transactions,
      ].slice(0, 40),
    }));
  }, []);

  const addTicket = useCallback<WalletContextValue["addTicket"]>((ticket) => {
    const stake = Math.round(ticket.stake * 100) / 100;
    if (!(stake > 0) || stateRef.current.balance < stake) return null;
    const id = nextId("slip");
    setState((prev) => ({
      ...prev,
      balance: Math.round((prev.balance - stake) * 100) / 100,
      transactions: [
        {
          id: nextId("tx"),
          label: `Bet slip · ${ticket.legs.length} leg${ticket.legs.length > 1 ? "s" : ""}`,
          amount: -stake,
          kind: "bet" as TxKind,
          at: Date.now(),
        },
        ...prev.transactions,
      ].slice(0, 40),
      tickets: [
        {
          ...ticket,
          stake,
          id,
          status: "pending" as TicketStatus,
          placedAt: Date.now(),
          payout: 0,
        },
        ...prev.tickets,
      ].slice(0, 25),
    }));
    return id;
  }, []);

  const settleTicket = useCallback<WalletContextValue["settleTicket"]>((id, won) => {
    const ticket = stateRef.current.tickets.find((t) => t.id === id);
    if (!ticket || ticket.status !== "pending") return null;
    const payout = won ? Math.round(ticket.stake * ticket.odds * 100) / 100 : 0;
    setState((prev) => ({
      ...prev,
      balance: Math.round((prev.balance + payout) * 100) / 100,
      tickets: prev.tickets.map((t) =>
        t.id === id ? { ...t, status: won ? "won" : "lost", payout, settledAt: Date.now() } : t,
      ),
      transactions: won
        ? [
            {
              id: nextId("tx"),
              label: `Slip won · ${ticket.legs.length} leg${ticket.legs.length > 1 ? "s" : ""}`,
              amount: payout,
              kind: "win" as TxKind,
              at: Date.now(),
            },
            ...prev.transactions,
          ].slice(0, 40)
        : prev.transactions,
    }));
    return payout;
  }, []);

  const topUp = useCallback((amount = 1000) => {
    setState((prev) => ({
      ...prev,
      balance: Math.round((prev.balance + amount) * 100) / 100,
      transactions: [
        {
          id: nextId("tx"),
          label: "Demo funds added",
          amount,
          kind: "topup" as TxKind,
          at: Date.now(),
        },
        ...prev.transactions,
      ].slice(0, 40),
    }));
  }, []);

  const resetWallet = useCallback(() => {
    setState({
      balance: START_BALANCE,
      transactions: [],
      tickets: [],
    });
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      ...state,
      ready,
      debit,
      credit,
      addTicket,
      settleTicket,
      topUp,
      resetWallet,
    }),
    [state, ready, debit, credit, addTicket, settleTicket, topUp, resetWallet],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
