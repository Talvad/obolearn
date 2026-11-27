/**
 * Server-side session helpers.
 *
 * Reads the id_token from the cookie set by the client after Cognito sign-in.
 * The cookie is httpOnly and is validated by decoding the JWT (we trust Cognito's
 * signature; full verification is done by API Gateway on the backend).
 */

import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { connection } from "next/server";

export const TOKEN_COOKIE = "obolearn_id_token";

export interface SessionUser {
  userId: string;
  email: string;
  name?: string;
  groups: string[];
}

interface CognitoIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
  "cognito:groups"?: string[];
  exp: number;
}

/**
 * Get the current session user from the id_token cookie.
 * Returns null if not logged in or token is expired.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  await connection();
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwtDecode<CognitoIdTokenPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null;

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      groups: payload["cognito:groups"] ?? [],
    };
  } catch {
    return null;
  }
}

/** Returns true if the session user is in the admin group. */
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.groups.includes("admin") ?? false;
}

/** Get the raw id_token from the cookie (for use in API calls). */
export async function getTokenFromCookie(): Promise<string | null> {
  await connection();
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}
