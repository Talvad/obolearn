/**
 * /courses/{courseId}/lessons — redirects to the most relevant lesson.
 * cookies() is called inside this component, which is wrapped in Suspense by its parent.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { listLessons, getCourseProgress } from "@/lib/api/client";
import { getTokenFromCookie } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function LessonsRedirectPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <LessonsRedirect params={params} />
    </Suspense>
  );
}

async function LessonsRedirect({
  params,
}: PageProps): Promise<React.ReactElement | null> {
  const { courseId } = await params;
  const token = await getTokenFromCookie(); // cookies() — safe inside Suspense
  if (!token) redirect(`/auth/login?redirect=/courses/${courseId}/lessons`);

  const [lessons, progress] = await Promise.all([
    listLessons(courseId, { revalidate: 0, token }),
    getCourseProgress(courseId, token!).catch(() => null),
  ]);
  console.log("LESSONS", lessons);

  if (lessons.length === 0) {
    redirect(`/courses/${courseId}`);
  }

  const completedIds = new Set(
    progress?.lessons.filter((l) => l.completed).map((l) => l.lessonId),
  );
  const target =
    lessons.find((l) => !completedIds.has(l.lessonId)) ??
    lessons[lessons.length - 1];

  redirect(`/courses/${courseId}/lessons/${target.lessonId}`);
}
