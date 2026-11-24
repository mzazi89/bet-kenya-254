import { NextResponse } from "next/server";
import { currentUserId, fail, okWithSnapshot } from "@/lib/server/api";
import { deposit, resetDemo, topUpDemo, withdraw } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "cle1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const userId = await currentUserId();

    if (action === "deposit") {
      await deposit(userId, Number(body.amount ?? 0), String(body.method ?? "M-Pesa STK"));
    } else if (action === "withdraw") {
      await withdraw(
        userId,
        Number(body.amount ?? 0),
        String(body.method ?? "M-Pesa"),
        String(body.destination ?? ""),
      );
    } else if (action === "demo-topup") {
      await topUpDemo(userId);
    } else if (action === "demo-reset") {
      await resetDemo(userId);
    } else {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }

    return okWithSnapshot(userId);
  } catch (error) {
    return fail(error);
  }
}
