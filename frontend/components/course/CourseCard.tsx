import Link from 'next/link';
import Image from 'next/image';
import { Course } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface CourseCardProps {
  course: Course;
  progressPercent?: number;
}

export function CourseCard({ course, progressPercent }: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.courseId}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Cover image */}
      <div className="relative h-44 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40">
        {course.coverImageUrl ? (
          <Image
            src={course.coverImageUrl}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-5xl">🎓</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 gap-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            {course.title}
          </h2>
          <Badge color="green">Free</Badge>
        </div>

        <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 flex-1">
          {course.description}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-auto">
          <span>{course.instructorName}</span>
          <span>{course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}</span>
        </div>

        {typeof progressPercent === 'number' && (
          <div className="mt-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-indigo-600 h-1.5 rounded-full progress-bar"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
