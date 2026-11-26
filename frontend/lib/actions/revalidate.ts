'use server';

import { revalidateTag } from 'next/cache';

/** Revalidate the public course catalog + a specific course's cache. */
export async function revalidateCourseCache(courseId: string) {
  revalidateTag('courses', 'max');
  revalidateTag(`course-${courseId}`, 'max');
  revalidateTag(`course-${courseId}-lessons`, 'max');
}

/** Revalidate a user's progress cache. */
export async function revalidateProgressCache(userId: string) {
  revalidateTag(`user-${userId}-progress`, 'max');
}
