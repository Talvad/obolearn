/**
 * LearnerAuthGuard — server component that checks learner auth at request time.
 * Must be rendered inside a <Suspense> boundary.
 */

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';

interface Props {
  children: React.ReactNode;
  redirectTo?: string;
}

export async function LearnerAuthGuard({ children, redirectTo = '/dashboard' }: Props) {
  const user = await getSessionUser(); // calls cookies() — requires Suspense ancestor
  if (!user) redirect(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
  return <>{children}</>;
}
