import { NextResponse } from "next/server";
import { currentUserId, fail, okWithSnapshot } from "@/lib/server/api";
import { clearSession, createSession, getSessionUser } from "@/lib/server/session";
import { login, register } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "cle1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "logout") {
      await clearSession();
      const userId = await currentUserId();
      return okWithSnapshot(userId);
    }

    if (action === "register") {
      const session = await getSessionUser();
      const guestId = session?.is_guest ? session.id : undefined;
      const userId = await register(
        {
          name: String(body.name ?? ""),
          email: String(body.email ?? ""),
          phone: String(body.phone ?? ""),
          dob: String(body.dob ?? ""),
          password: String(body.password ?? ""),
        },
        guestId,
      );
      await createSession(userId);
      return okWithSnapshot(userId);
    }

    if (action === "login") {
      const userId = await login(String(body.email ?? ""), String(body.password ?? ""));
      await createSession(userId);
      return okWithSnapshot(userId);
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}
