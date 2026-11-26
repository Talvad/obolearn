/**
 * Lesson watch page — Task 10.
 * All cookies()/auth access is inside a Suspense boundary.
 */

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  getCourse,
  listLessons,
  getVideoSignedUrl,
  getCourseProgress,
  getEnrollment,
} from "@/lib/api/client";
import { getTokenFromCookie } from "@/lib/auth/session";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { Badge } from "@/components/ui/Badge";

interface PageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default function LessonPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LessonContent params={params} />
    </Suspense>
  );
}

async function LessonContent({ params }: PageProps) {
  const { courseId, lessonId } = await params;

  // cookies() inside Suspense — streams at request time
  const token = await getTokenFromCookie();
  if (!token)
    redirect(`/auth/login?redirect=/courses/${courseId}/lessons/${lessonId}`);

  const enrollment = await getEnrollment(courseId, token).catch(() => null);
  if (!enrollment) redirect(`/courses/${courseId}`);

  const [course, lessons, progressData] = await Promise.all([
    getCourse(courseId, { revalidate: 0 }),
    listLessons(courseId, { revalidate: 0 }),
    getCourseProgress(courseId, token).catch(() => null),
  ]);

  if (!course) notFound();

  const lesson = lessons.find((l) => l.lessonId === lessonId);
  if (!lesson) notFound();

  let signedUrl: string | null = null;
  if (lesson.videoKey) {
    try {
      const result = await getVideoSignedUrl(lessonId, courseId, token);
      signedUrl = result.signedUrl;
    } catch {
      // Video might not be available yet
    }
  }

  const progressByLesson = new Map(
    progressData?.lessons.map((p) => [p.lessonId, p]) ?? [],
  );

  const currentIndex = lessons.findIndex((l) => l.lessonId === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const myProgress = progressByLesson.get(lessonId);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
          <li>
            <Link href="/courses" className="hover:text-indigo-600">
              Courses
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/courses/${courseId}`}
              className="hover:text-indigo-600 truncate max-w-xs"
            >
              {course.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-900 dark:text-white truncate max-w-xs">
            {lesson.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Video + controls */}
        <div className="lg:col-span-2 space-y-4">
          {signedUrl ? (
            <VideoPlayer
              signedUrl={signedUrl}
              courseId={courseId}
              lessonId={lessonId}
              lastPositionSeconds={myProgress?.lastPositionSeconds}
              token={token}
            />
          ) : (
            <div className="aspect-video rounded-xl bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-3 text-gray-500">
              <span className="text-5xl">🎬</span>
              <p className="font-medium">Video coming soon</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {lesson.title}
              </h1>
              {lesson.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {lesson.description}
                </p>
              )}
            </div>
            {myProgress?.completed && <Badge color="green">Completed ✓</Badge>}
          </div>

          {/* Prev / Next nav */}
          <div className="flex items-center justify-between pt-2">
            {prevLesson ? (
              <Link
                href={`/courses/${courseId}/lessons/${prevLesson.lessonId}`}
                className="text-sm text-indigo-600 hover:underline"
              >
                ← {prevLesson.title}
              </Link>
            ) : (
              <span />
            )}
            {nextLesson && (
              <Link
                href={`/courses/${courseId}/lessons/${nextLesson.lessonId}`}
                className="text-sm text-indigo-600 hover:underline"
              >
                {nextLesson.title} →
              </Link>
            )}
          </div>
        </div>

        {/* Lesson list sidebar */}
        <aside>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Course contents
          </h2>
          <ol className="space-y-1">
            {lessons.map((l, i) => {
              const p = progressByLesson.get(l.lessonId);
              const isActive = l.lessonId === lessonId;
              return (
                <li key={l.lessonId}>
                  <Link
                    href={`/courses/${courseId}/lessons/${l.lessonId}`}
                    className={[
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                        p?.completed
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400",
                      ].join(" ")}
                    >
                      {p?.completed ? "✓" : i + 1}
                    </span>
                    <span className="truncate">{l.title}</span>
                  </Link>
                </li>
              );
            })}
          </ol>

          {progressData && (
            <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">
                  Your progress
                </span>
                <span className="font-medium">
                  {progressData.completedLessons}/{progressData.totalLessons}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full progress-bar"
                  style={{
                    width: `${progressData.totalLessons ? (progressData.completedLessons / progressData.totalLessons) * 100 : 0}%`,
                  }}
                />
              </div>
              {progressData.courseCompleted && (
                <p className="text-sm text-green-600 font-medium text-center">
                  🎉 Course completed!
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-64 mb-6" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video rounded-xl bg-gray-200 dark:bg-slate-700" />
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
