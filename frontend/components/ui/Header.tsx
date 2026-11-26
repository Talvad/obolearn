import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/auth/SignOutButton';

export async function Header() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600 dark:text-indigo-400">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">
              Ob
            </span>
            OboLearn
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <Link href="/courses" className="text-gray-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
              Browse
            </Link>

            {user ? (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
                  Dashboard
                </Link>
                {user.groups.includes('admin') && (
                  <Link href="/admin" className="text-gray-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
                    Admin
                  </Link>
                )}
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
