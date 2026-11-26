/**
 * Admin course management — Task 12.
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCourse, listLessons } from "@/lib/api/client";
import { getTokenFromCookie } from "@/lib/auth/session";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { Badge } from "@/components/ui/Badge";
import { AdminCourseActions } from "@/components/admin/AdminCourseActions";
import { LessonManager } from "@/components/admin/LessonManager";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function AdminCourseDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-xl" />
        </div>
      }
    >
      <AdminCourseContent params={params} />
    </Suspense>
  );
}

async function AdminCourseContent({ params }: PageProps) {
  return (
    <AdminAuthGuard>
      <AdminCourseDetail params={params} />
    </AdminAuthGuard>
  );
}

async function AdminCourseDetail({ params }: PageProps) {
  const { courseId } = await params;
  const token = await getTokenFromCookie();
  if (!token) notFound();

  const [course, lessons] = await Promise.all([
    getCourse(courseId, { token, revalidate: 0 }),
    listLessons(courseId, { token, revalidate: 0 }),
  ]);

  if (!course) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {course.title}
            </h1>
            <Badge color={course.status === "published" ? "green" : "yellow"}>
              {course.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">By {course.instructorName}</p>
        </div>
        <AdminCourseActions course={course} token={token} />
      </div>

      <LessonManager
        courseId={courseId}
        initialLessons={lessons}
        token={token}
      />
    </div>
  );
}
