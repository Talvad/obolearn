/**
 * Admin course list — Task 12.
 */

import { Suspense } from "react";
import Link from "next/link";
import { getTokenFromCookie } from "@/lib/auth/session";
import { listCourses } from "@/lib/api/client";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Admin — OboLearn" };

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse h-32 bg-gray-100 dark:bg-slate-800 rounded-xl" />
      }
    >
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  // AdminAuthGuard calls cookies() — safe inside this Suspense boundary
  return (
    <AdminAuthGuard>
      <AdminCourseList />
    </AdminAuthGuard>
  );
}

async function AdminCourseList() {
  const token = await getTokenFromCookie();
  const courses = token ? await listCourses({ token, revalidate: 0 }) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Courses
        </h1>
        <Link href="/admin/courses/new">
          <Button>+ New course</Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No courses yet.</p>
          <Link
            href="/admin/courses/new"
            className="mt-4 inline-block text-indigo-600 hover:underline text-sm"
          >
            Create your first course →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Lessons
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Updated
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {courses.map((course) => (
                <tr
                  key={course.courseId}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {course.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {course.description}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      color={course.status === "published" ? "green" : "yellow"}
                    >
                      {course.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                    {course.lessonCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(course.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/courses/${course.courseId}`}
                      className="text-sm text-indigo-600 hover:underline font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
