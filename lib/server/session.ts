import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";

const COOKIE = "bk254_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  is_guest: boolean;
  email: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const { rows } = await query<SessionUser>(
    `select u.id, u.is_guest, u.email
       from sessions s
       join users u on u.id = s.user_id
      where s.token = $1 and s.expires_at > now()
      limit 1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TTL_MS);
  await query(`insert into sessions (token, user_id, expires_at) values ($1, $2, $3)`, [
    token,
    userId,
    expires,
  ]);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await query(`delete from sessions where token = $1`, [token]);
  store.delete(COOKIE);
}
