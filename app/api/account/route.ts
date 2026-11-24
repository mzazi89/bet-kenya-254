import { NextResponse } from "next/server";
import { currentUserId, fail, okWithSnapshot } from "@/lib/server/api";
import {
  approveKyc,
  changePassword,
  setSelfExclusion,
  submitKyc,
  toggleTwoFactor,
  updateLimits,
  updateProfile,
} from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "cle1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const userId = await currentUserId();

    switch (action) {
      case "profile":
        await updateProfile(userId, {
          name: body.name === undefined ? undefined : String(body.name),
          phone: body.phone === undefined ? undefined : String(body.phone),
        });
        break;
      case "limits":
        await updateLimits(userId, {
          dailyDeposit:
            body.dailyDeposit === undefined ? undefined : Number(body.dailyDeposit),
          dailyLoss: body.dailyLoss === undefined ? undefined : Number(body.dailyLoss),
          realityCheckMin:
            body.realityCheckMin === undefined ? undefined : Number(body.realityCheckMin),
        });
        break;
      case "kyc":
        await submitKyc(userId, String(body.name ?? ""), String(body.idNumber ?? ""));
        break;
      case "kyc-approve":
        await approveKyc(userId);
        break;
      case "exclude":
        await setSelfExclusion(userId, Number(body.days ?? 0));
        break;
      case "two-factor":
        await toggleTwoFactor(userId);
        break;
      case "password":
        await changePassword(userId, String(body.current ?? ""), String(body.next ?? ""));
        break;
      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }

    return okWithSnapshot(userId);
  } catch (error) {
    return fail(error);
  }
}
