export type CourseStatus = 'draft' | 'published';

export interface Course {
  courseId: string;
  title: string;
  description: string;
  status: CourseStatus;
  coverImageUrl?: string;
  instructorName: string;
  createdAt: string;
  updatedAt: string;
  lessonCount: number;
}

export interface Lesson {
  lessonId: string;
  courseId: string;
  order: number;
  title: string;
  description?: string;
  videoKey?: string;
  videoDurationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  userId: string;
  courseId: string;
  createdAt: string;
}

export interface LessonProgress {
  userId: string;
  courseId: string;
  lessonId: string;
  watchPercentage: number;
  lastPositionSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export interface CourseProgress {
  courseId: string;
  lessons: LessonProgress[];
  totalLessons: number;
  completedLessons: number;
  courseCompleted: boolean;
}

export interface User {
  userId: string;
  email: string;
  name?: string;
  createdAt: string;
}
