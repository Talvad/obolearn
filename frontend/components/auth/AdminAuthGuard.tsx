/**
 * AdminAuthGuard — server component that checks admin auth at request time.
 * Must be rendered inside a <Suspense> boundary so the cookies() call
 * doesn't block the static shell prerender.
 */

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';

export async function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser(); // calls cookies() — requires Suspense ancestor
  if (!user) redirect('/auth/login?redirect=/admin');
  if (!user.groups.includes('admin')) redirect('/dashboard');
  return <>{children}</>;
}
