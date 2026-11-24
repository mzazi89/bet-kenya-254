import { NextResponse } from "next/server";
import { currentUserId, fail } from "@/lib/server/api";
import { snapshot } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "cle1";

export async function GET() {
  try {
    const userId = await currentUserId();
    return NextResponse.json({ ok: true, snapshot: await snapshot(userId) });
  } catch (error) {
    return fail(error);
  }
}
