'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCourse } from '@/lib/api/client';
import { getToken } from '@/lib/actions/token';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function NewCourseForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const token = await getToken();
      if (!token) {
        setError('Not signed in');
        return;
      }

      try {
        const course = await createCourse(
          { title, description, instructorName, coverImageUrl: coverImageUrl || undefined },
          token,
        );
        router.push(`/admin/courses/${course.courseId}`);
      } catch {
        setError('Could not create course. Check all fields.');
      }
    });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">New course</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="title"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Introduction to TypeScript"
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-slate-300">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="What will learners take away from this course?"
            className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <Input
          id="instructor"
          label="Instructor name"
          value={instructorName}
          onChange={(e) => setInstructorName(e.target.value)}
          required
          placeholder="e.g. Jane Doe"
        />

        <Input
          id="cover"
          label="Cover image URL (optional)"
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://…"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Create course
          </Button>
        </div>
      </form>
    </div>
  );
}
