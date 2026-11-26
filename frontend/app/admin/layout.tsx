import { Suspense } from "react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Admin top bar */}
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/admin"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Admin Panel
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/admin"
                  className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Courses
                </Link>
              </nav>
            </div>
            <Link href="/" className="text-sm text-indigo-600 hover:underline">
              ← Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Auth check happens inside each page inside a Suspense boundary */}
        {children}
      </main>
    </div>
  );
}
