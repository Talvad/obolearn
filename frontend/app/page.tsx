import Link from "next/link";
import { Suspense } from "react";
import { listCourses } from "@/lib/api/client";
import { CourseCard } from "@/components/course/CourseCard";
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

async function getFeaturedCourses() {
  "use cache";
  const courses = await listCourses({ tags: ["courses"] });
  return courses.slice(0, 4);
}

export default async function HomePage() {
  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 py-20 px-4">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              Learn at your own pace.
              <br />
              <span className="text-indigo-600">For free.</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-xl mx-auto">
              OboLearn gives you instant access to high-quality video courses
              with progress tracking — no payment required.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/courses"
                className="rounded-xl bg-indigo-600 px-8 py-3 text-white font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Browse courses
              </Link>
              <Link
                href="/auth/register"
                className="rounded-xl border border-gray-300 dark:border-slate-600 px-8 py-3 text-gray-700 dark:text-white font-semibold text-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Create account
              </Link>
            </div>
          </div>
        </section>

        {/* Featured courses */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Featured courses
            </h2>
            <Link
              href="/courses"
              className="text-sm text-indigo-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          <Suspense
            fallback={
              <div
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
                aria-busy="true"
              >
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-pulse"
                  >
                    <div className="h-44 bg-gray-200 dark:bg-slate-700" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <FeaturedCourses />
          </Suspense>
        </section>
      </main>
      <footer className="border-t border-gray-200 dark:border-slate-700 py-8 text-center text-sm text-gray-500">
        © 2025 OboLearn. All rights reserved.
      </footer>
    </>
  );
}

async function FeaturedCourses() {
  const courses = await getFeaturedCourses();

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 p-16 text-center text-gray-500">
        <p>Courses coming soon.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {courses.map((course) => (
        <CourseCard key={course.courseId} course={course} />
      ))}
    </div>
  );
}
