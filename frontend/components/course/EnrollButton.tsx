'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enroll } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';

interface EnrollButtonProps {
  courseId: string;
  token: string | null;
}

export function EnrollButton({ courseId, token }: EnrollButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  if (!token) {
    return (
      <a
        href={`/auth/login?redirect=/courses/${courseId}`}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
      >
        Sign in to enroll
      </a>
    );
  }

  const handleEnroll = () => {
    setError('');
    startTransition(async () => {
      try {
        await enroll(courseId, token);
        router.push(`/courses/${courseId}/lessons`);
        router.refresh();
      } catch {
        setError('Could not enroll. Please try again.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={handleEnroll} loading={isPending}>
        Enroll for free
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
