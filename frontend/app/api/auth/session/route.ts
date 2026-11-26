/**
 * POST /api/auth/session
 * Sets the id_token as an httpOnly cookie after Cognito sign-in.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

const TOKEN_COOKIE = 'obolearn_id_token';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    // Decode to get expiry
    const payload = jwtDecode<{ exp: number }>(token);
    const expiresAt = new Date(payload.exp * 1000);

    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
}
