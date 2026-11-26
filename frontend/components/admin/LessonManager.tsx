'use client';

/**
 * LessonManager — Task 12.
 *
 * Add lessons, upload videos via presigned S3 URL.
 */

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createLesson, getUploadUrl, updateLesson } from '@/lib/api/client';
import { Lesson } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface LessonManagerProps {
  courseId: string;
  initialLessons: Lesson[];
  token: string;
}

export function LessonManager({ courseId, initialLessons, token }: LessonManagerProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, startCreate] = useTransition();
  const [uploadStates, setUploadStates] = useState<Record<string, { progress: number; status: 'idle' | 'uploading' | 'done' | 'error' }>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    startCreate(async () => {
      try {
        const lesson = await createLesson(courseId, { title: newTitle, description: newDescription }, token);
        setLessons((prev) => [...prev, lesson]);
        setNewTitle('');
        setNewDescription('');
        setShowForm(false);
        router.refresh();
      } catch {
        // Error handling in a real app would show a toast
      }
    });
  };

  const handleUpload = async (lessonId: string, file: File) => {
    setUploadStates((s) => ({ ...s, [lessonId]: { progress: 0, status: 'uploading' } }));
    try {
      const { uploadUrl, videoKey } = await getUploadUrl(courseId, lessonId, token);

      // Upload directly from the browser to S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploadStates((s) => ({ ...s, [lessonId]: { progress: pct, status: 'uploading' } }));
          }
        });
        xhr.addEventListener('load', () => (xhr.status < 400 ? resolve() : reject()));
        xhr.addEventListener('error', reject);
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'video/mp4');
        xhr.send(file);
      });

      // Update lesson record with videoKey
      const updated = await updateLesson(courseId, lessonId, { videoKey }, token);
      setLessons((prev) => prev.map((l) => (l.lessonId === lessonId ? updated : l)));
      setUploadStates((s) => ({ ...s, [lessonId]: { progress: 100, status: 'done' } }));
    } catch {
      setUploadStates((s) => ({ ...s, [lessonId]: { progress: 0, status: 'error' } }));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Lessons <span className="text-sm font-normal text-gray-500">({lessons.length})</span>
        </h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Add lesson'}
        </Button>
      </div>

      {/* New lesson form */}
      {showForm && (
        <form onSubmit={handleCreateLesson} className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-3">
          <Input id="lesson-title" label="Lesson title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="e.g. Variables and Types" />
          <div className="flex flex-col gap-1">
            <label htmlFor="lesson-desc" className="text-sm font-medium text-gray-700 dark:text-slate-300">Description (optional)</label>
            <textarea
              id="lesson-desc"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={creating}>Add lesson</Button>
          </div>
        </form>
      )}

      {/* Lesson list */}
      {lessons.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No lessons yet. Add your first lesson above.</p>
      ) : (
        <ol className="space-y-3">
          {lessons.map((lesson, index) => {
            const upload = uploadStates[lesson.lessonId];
            return (
              <li
                key={lesson.lessonId}
                className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-sm font-medium text-gray-600">
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                    {lesson.videoKey ? (
                      <Badge color="green">Video uploaded</Badge>
                    ) : (
                      <Badge color="yellow">No video</Badge>
                    )}
                  </div>
                  {lesson.description && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">{lesson.description}</p>
                  )}

                  {/* Upload section */}
                  {upload?.status === 'uploading' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Uploading…</span>
                        <span>{upload.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : upload?.status === 'done' ? (
                    <p className="text-xs text-green-600">✓ Upload complete</p>
                  ) : upload?.status === 'error' ? (
                    <p className="text-xs text-red-600">Upload failed. Try again.</p>
                  ) : null}
                </div>

                {/* Upload button */}
                <div className="shrink-0">
                  <input
                    ref={(el) => { fileInputRefs.current[lesson.lessonId] = el; }}
                    type="file"
                    accept="video/mp4,video/*"
                    className="sr-only"
                    aria-label={`Upload video for ${lesson.title}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(lesson.lessonId, file);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRefs.current[lesson.lessonId]?.click()}
                    disabled={upload?.status === 'uploading'}
                  >
                    {lesson.videoKey ? 'Replace video' : 'Upload video'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
