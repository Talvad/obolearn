/**
 * Course detail page — Task 9.
 *
 * Static shell prerendered with "use cache" on course+lesson fetches.
 * Dynamic island: enrollment CTA reads user session at request time.
 * params is a Promise — resolved inside a Suspense boundary.
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourse, listLessons, getEnrollment } from "@/lib/api/client";
import { getTokenFromCookie } from "@/lib/auth/session";
import { EnrollButton } from "@/components/course/EnrollButton";
import { Badge } from "@/components/ui/Badge";
import { Course, Lesson } from "@/types";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CourseDetailContent params={params} />
    </Suspense>
  );
}

async function fetchCourseAndLessons(
  courseId: string,
): Promise<{ course: Course; lessons: Lesson[] }> {
  "use cache";
  const [course, lessons] = await Promise.all([
    getCourse(courseId, { tags: [`course-${courseId}`] }),
    listLessons(courseId, { tags: [`course-${courseId}-lessons`] }),
  ]);
  return { course, lessons };
}

async function CourseDetailContent({ params }: PageProps) {
  const { courseId } = await params; // dynamic — safe inside Suspense

  let data: { course: Course; lessons: Lesson[] };
  try {
    data = await fetchCourseAndLessons(courseId);
  } catch {
    notFound();
  }

  const { course, lessons } = data!;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-gray-500">
          <li>
            <Link href="/courses" className="hover:text-indigo-600">
              Courses
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-900 dark:text-white truncate max-w-xs">
            {course.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main content — cached */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {course.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              By {course.instructorName}
            </p>
          </div>

          <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
            {course.description}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Lessons{" "}
              <span className="text-sm font-normal text-gray-500">
                ({lessons.length})
              </span>
            </h2>
            <ol className="space-y-2">
              {lessons.map((lesson, index) => (
                <li
                  key={lesson.lessonId}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {lesson.title}
                    </p>
                    {lesson.videoDurationSeconds && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDuration(lesson.videoDurationSeconds)}
                      </p>
                    )}
                  </div>
                  {!lesson.videoKey && (
                    <Badge color="yellow">Coming soon</Badge>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="sticky top-24 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm space-y-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              Free
            </div>
            <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> {lessons.length} video
                lesson{lessons.length !== 1 ? "s" : ""}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Progress tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Resume where you left
                off
              </li>
            </ul>

            {/* Dynamic enrollment CTA — cookies() inside nested Suspense */}
            <Suspense
              fallback={
                <div className="h-12 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse" />
              }
            >
              <EnrollCTA courseId={courseId} />
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  );
}

async function EnrollCTA({ courseId }: { courseId: string }) {
  const token = await getTokenFromCookie(); // cookies() — safe inside Suspense
  const enrollment = token
    ? await getEnrollment(courseId, token).catch(() => null)
    : null;

  if (enrollment) {
    return (
      <Link
        href={`/courses/${courseId}/lessons`}
        className="block w-full text-center rounded-lg bg-green-600 px-6 py-3 text-white font-medium hover:bg-green-700 transition-colors"
      >
        Continue learning →
      </Link>
    );
  }

  return <EnrollButton courseId={courseId} token={token} />;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CourseDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-6" />
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        </div>
        <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    </div>
  );
}
