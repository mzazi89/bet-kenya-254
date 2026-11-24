import { NextResponse } from "next/server";
import { currentUserId, fail, okWithSnapshot } from "@/lib/server/api";
import { placeTicket, settleTicket } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "cle1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const userId = await currentUserId();

    if (action === "place") {
      const mode = body.mode === "account" ? "account" : "demo";
      const legs = Array.isArray(body.legs)
        ? body.legs.slice(0, 8).map((leg: Record<string, unknown>) => ({
            match: String(leg.match ?? ""),
            market: String(leg.market ?? ""),
            pick: String(leg.pick ?? ""),
            odds: Number(leg.odds ?? 0),
          }))
        : [];
      const { ticketId } = await placeTicket(userId, mode, {
        stake: Number(body.stake ?? 0),
        odds: Number(body.odds ?? 0),
        legs,
      });
      return okWithSnapshot(userId, { ticketId });
    }

    if (action === "settle") {
      const result = await settleTicket(userId, String(body.ticketId ?? ""));
      return okWithSnapshot(userId, result);
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}
