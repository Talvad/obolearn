import { Suspense } from "react";
import { Header } from "@/components/ui/Header";

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <span className="text-xl font-bold text-indigo-600">OboLearn</span>
        </div>
      </div>
    </header>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 dark:border-slate-700 py-8 text-center text-sm text-gray-500">
        © 2025 OboLearn. All rights reserved.
      </footer>
    </>
  );
}
