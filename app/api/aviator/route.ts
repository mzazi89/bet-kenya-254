import { NextResponse } from "next/server";
import { currentUserId, fail, okWithSnapshot } from "@/lib/server/api";
import { placeAviatorBet, settleAviatorBet } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "cle1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const userId = await currentUserId();

    if (action === "place") {
      const mode = body.mode === "account" ? "account" : "demo";
      const { betId } = await placeAviatorBet(
        userId,
        mode,
        Number(body.roundId ?? 1),
        Number(body.stake ?? 0),
      );
      return okWithSnapshot(userId, { betId });
    }

    if (action === "settle") {
      const cashout =
        body.cashout === null || body.cashout === undefined ? null : Number(body.cashout);
      const { payout } = await settleAviatorBet(userId, String(body.betId ?? ""), cashout);
      return okWithSnapshot(userId, { payout });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}
