'use server';

import { getTokenFromCookie } from '@/lib/auth/session';

/** Server action to retrieve the token — safe to call from client components. */
export async function getToken(): Promise<string | null> {
  return getTokenFromCookie();
}
