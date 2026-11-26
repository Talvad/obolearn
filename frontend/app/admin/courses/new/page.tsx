import { Suspense } from "react";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { NewCourseForm } from "@/components/admin/NewCourseForm";

export const metadata = { title: "New course — OboLearn Admin" };

export default function NewCoursePage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse h-96 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
      }
    >
      <AdminAuthGuard>
        <NewCourseForm />
      </AdminAuthGuard>
    </Suspense>
  );
}
