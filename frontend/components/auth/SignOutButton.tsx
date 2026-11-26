'use client';

import { signOut } from '@/lib/auth/cognito';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    // Clear the httpOnly-style token cookie via API route
    fetch('/api/auth/signout', { method: 'POST' }).finally(() => {
      router.push('/');
      router.refresh();
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
