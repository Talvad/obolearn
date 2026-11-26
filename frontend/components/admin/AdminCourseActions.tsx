'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCourse } from '@/lib/api/client';
import { revalidateCourseCache } from '@/lib/actions/revalidate';
import { Course } from '@/types';
import { Button } from '@/components/ui/Button';

interface AdminCourseActionsProps {
  course: Course;
  token: string;
}

export function AdminCourseActions({ course, token }: AdminCourseActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const togglePublish = () => {
    setError('');
    const newStatus = course.status === 'published' ? 'draft' : 'published';

    startTransition(async () => {
      try {
        await updateCourse(course.courseId, { status: newStatus }, token);
        // Revalidate the public catalog cache
        await revalidateCourseCache(course.courseId);
        router.refresh();
      } catch {
        setError('Could not update course status.');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant={course.status === 'published' ? 'secondary' : 'primary'}
        onClick={togglePublish}
        loading={isPending}
      >
        {course.status === 'published' ? 'Unpublish' : 'Publish course'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
