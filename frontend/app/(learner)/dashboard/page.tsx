/**
 * Learner dashboard — Task 11.
 */

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, getTokenFromCookie } from "@/lib/auth/session";
import {
  listEnrollments,
  getCourse,
  listLessons,
  getCourseProgress,
} from "@/lib/api/client";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Course, CourseProgress } from "@/types";

export const metadata = {
  title: "Dashboard — OboLearn",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  // cookies() inside Suspense — streams at request time
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/dashboard");

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Pick up where you left off.
        </p>
      </div>
      <EnrolledCourses />
    </>
  );
}

async function EnrolledCourses() {
  "use cache";
  const token = await getTokenFromCookie();
  if (!token) return null;

  const enrollments = await listEnrollments(token);

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-6xl mb-4">🎓</p>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300">
          No courses yet
        </h2>
        <p className="text-gray-500 mt-2">
          <Link href="/courses" className="text-indigo-600 hover:underline">
            Browse courses
          </Link>{" "}
          to get started.
        </p>
      </div>
    );
  }

  const courseData = await Promise.allSettled(
    enrollments.map(async (enrollment) => {
      const [course, lessons, progress] = await Promise.all([
        getCourse(enrollment.courseId, { revalidate: 0 }),
        listLessons(enrollment.courseId, { revalidate: 0 }),
        getCourseProgress(enrollment.courseId, token).catch(() => null),
      ]);
      return { course, lessons, progress };
    }),
  );

  const resolved = courseData
    .filter((r) => r.status === "fulfilled")
    .map(
      (r) =>
        (
          r as PromiseFulfilledResult<{
            course: Course;
            lessons: any[];
            progress: CourseProgress | null;
          }>
        ).value,
    );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {resolved.map(({ course, lessons, progress }) => {
        const percent =
          progress && progress.totalLessons > 0
            ? (progress.completedLessons / progress.totalLessons) * 100
            : 0;

        const completedIds = new Set(
          progress?.lessons.filter((l) => l.completed).map((l) => l.lessonId),
        );
        const nextLesson =
          lessons.find((l: any) => !completedIds.has(l.lessonId)) ?? lessons[0];

        return (
          <div
            key={course.courseId}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
          >
            <div className="p-6 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
                  {course.title}
                </h2>
                {progress?.courseCompleted && (
                  <Badge color="green">Completed</Badge>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-slate-400">
                {course.instructorName}
              </p>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>
                    {progress?.completedLessons ?? 0} /{" "}
                    {progress?.totalLessons ?? lessons.length} lessons
                  </span>
                  <span>{Math.round(percent)}%</span>
                </div>
                <ProgressBar
                  value={percent}
                  label={`${course.title} progress: ${Math.round(percent)}%`}
                />
              </div>
            </div>

            <div className="px-6 pb-5">
              {nextLesson ? (
                <Link
                  href={`/courses/${course.courseId}/lessons/${nextLesson.lessonId}`}
                  className="block w-full text-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm text-white font-medium hover:bg-indigo-700 transition-colors"
                >
                  {progress?.courseCompleted ? "Review course" : "Continue"}
                </Link>
              ) : (
                <Link
                  href={`/courses/${course.courseId}`}
                  className="block w-full text-center rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  View course
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
      </div>
      <div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse space-y-3"
          >
            <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
