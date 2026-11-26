/**
 * API client for the OboLearn backend.
 *
 * Server-side calls pass the token from the cookie.
 * Client-side calls read the Cognito session directly.
 */

import type {
  Course,
  Lesson,
  Enrollment,
  CourseProgress,
  LessonProgress,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type FetchOptions = {
  token?: string | null;
  revalidate?: number | false;
  tags?: string[];
};

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: FetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (opts.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }

  const nextOpts: RequestInit["next"] = {};
  if (opts.tags) nextOpts.tags = opts.tags;
  if (opts.revalidate !== undefined) nextOpts.revalidate = opts.revalidate;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    next: nextOpts,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new ApiError(res.status, errorBody);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export async function listCourses(opts?: FetchOptions): Promise<Course[]> {
  if (!API_URL) return [];
  return apiFetch<Course[]>("/courses", {}, { tags: ["courses"], ...opts });
}

export async function getCourse(
  courseId: string,
  opts?: FetchOptions,
): Promise<Course> {
  return apiFetch<Course>(
    `/courses/${courseId}`,
    {},
    {
      tags: [`course-${courseId}`],
      ...opts,
    },
  );
}

export async function createCourse(
  data: Partial<Course>,
  token: string,
): Promise<Course> {
  return apiFetch<Course>(
    "/courses",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    { token },
  );
}

export async function updateCourse(
  courseId: string,
  data: Partial<Course>,
  token: string,
): Promise<Course> {
  return apiFetch<Course>(
    `/courses/${courseId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    { token },
  );
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export async function listLessons(
  courseId: string,
  opts?: FetchOptions,
): Promise<Lesson[]> {
  return apiFetch<Lesson[]>(
    `/courses/${courseId}/lessons`,
    {},
    {
      tags: [`course-${courseId}-lessons`],
      ...opts,
    },
  );
}

export async function createLesson(
  courseId: string,
  data: Partial<Lesson>,
  token: string,
): Promise<Lesson> {
  return apiFetch<Lesson>(
    `/courses/${courseId}/lessons`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    { token },
  );
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  data: Partial<Lesson>,
  token: string,
): Promise<Lesson> {
  return apiFetch<Lesson>(
    `/courses/${courseId}/lessons/${lessonId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    { token },
  );
}

export async function getUploadUrl(
  courseId: string,
  lessonId: string,
  token: string,
): Promise<{ uploadUrl: string; videoKey: string; expiresIn: number }> {
  return apiFetch(
    `/courses/${courseId}/lessons/${lessonId}/upload-url`,
    {
      method: "POST",
    },
    { token },
  );
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export async function enroll(
  courseId: string,
  token: string,
): Promise<Enrollment> {
  return apiFetch<Enrollment>(
    "/enrollments",
    {
      method: "POST",
      body: JSON.stringify({ courseId }),
    },
    { token },
  );
}

export async function listEnrollments(token: string): Promise<Enrollment[]> {
  return apiFetch<Enrollment[]>("/enrollments", {}, { token, revalidate: 0 });
}

export async function getEnrollment(
  courseId: string,
  token: string,
): Promise<Enrollment | null> {
  try {
    return await apiFetch<Enrollment>(
      `/enrollments/${courseId}`,
      {},
      { token, revalidate: 0 },
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export async function getCourseProgress(
  courseId: string,
  token: string,
): Promise<CourseProgress> {
  return apiFetch<CourseProgress>(
    `/progress/${courseId}`,
    {},
    { token, revalidate: 0 },
  );
}

export async function updateProgress(
  courseId: string,
  lessonId: string,
  data: { watchPercentage: number; lastPositionSeconds: number },
  token: string,
): Promise<LessonProgress> {
  return apiFetch<LessonProgress>(
    `/progress/${courseId}/${lessonId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    { token },
  );
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export async function getVideoSignedUrl(
  lessonId: string,
  courseId: string,
  token: string,
): Promise<{ signedUrl: string; expiresAt: string }> {
  return apiFetch(
    `/videos/${lessonId}/signed-url?courseId=${courseId}`,
    {},
    { token },
  );
}
