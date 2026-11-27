/**
 * Public course catalog — Task 9.
 *
 * Static shell: "use cache" on the course list fetch, tagged 'courses'.
 * Cache is invalidated when admin publishes a course (revalidateTag).
 */

import { Suspense } from "react";
import { listPublicCourses } from "@/lib/api/client";
import { CourseCard } from "@/components/course/CourseCard";

// Cache the course list; invalidated by revalidateTag('courses', 'max')
async function getCourses() {
  "use cache";
  return listPublicCourses({ tags: ["public-courses"] });
}

export const metadata = {
  title: "Browse Courses — OboLearn",
  description: "Explore our library of free video courses.",
};

export default async function CoursesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Static header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Browse Courses
        </h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Explore our growing library of free video courses.
        </p>
      </div>

      {/* Course grid — cached */}
      <Suspense fallback={<CoursesGridSkeleton />}>
        <CoursesGrid />
      </Suspense>
    </div>
  );
}

async function CoursesGrid() {
  const courses = await getCourses();

  if (courses.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-6xl mb-4">📚</p>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300">
          No courses yet
        </h2>
        <p className="text-gray-500 mt-2">
          Check back soon — courses are being added.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((course) => (
        <CourseCard key={course.courseId} course={course} />
      ))}
    </div>
  );
}

function CoursesGridSkeleton() {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-pulse"
        >
          <div className="h-44 bg-gray-200 dark:bg-slate-700" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
