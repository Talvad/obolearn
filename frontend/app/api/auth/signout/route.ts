/**
 * POST /api/auth/signout
 * Clears the session cookie.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const TOKEN_COOKIE = 'obolearn_id_token';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
