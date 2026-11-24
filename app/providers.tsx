"use client";

import type { ReactNode } from "react";
import { BankProvider } from "@/lib/bank";

export default function Providers({ children }: { children: ReactNode }) {
  return <BankProvider>{children}</BankProvider>;
}
