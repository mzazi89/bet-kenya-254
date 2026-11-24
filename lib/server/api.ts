import { NextResponse } from "next/server";
import { createSession, getSessionUser } from "./session";
import { AppError, ensureGuest, snapshot } from "./store";

export async function currentUserId(): Promise<string> {
  const session = await getSessionUser();
  if (session) return session.id;
  const id = await ensureGuest();
  await createSession(id);
  return id;
}

export function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  console.error("[api]", error);
  return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
}

export async function okWithSnapshot(userId: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...extra, snapshot: await snapshot(userId) });
}
