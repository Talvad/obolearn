'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendConfirmationCode } from '@/lib/auth/cognito';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const result = await confirmSignUp(email, code);
      if (!result.success) {
        setError(result.error ?? 'Confirmation failed');
        return;
      }
      router.push('/auth/login?confirmed=1');
    });
  };

  const handleResend = async () => {
    const result = await resendConfirmationCode(email);
    if (result.success) setResent(true);
    else setError(result.error ?? 'Could not resend code');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-indigo-600">OboLearn</Link>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">Verify your email</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            We sent a 6-digit code to {emailParam || 'your email'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 space-y-5">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          {resent && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 px-4 py-3 text-sm text-green-700">
              Code resent — check your email.
            </div>
          )}

          {!emailParam && (
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          <Input
            id="code"
            type="text"
            label="Verification code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />

          <Button type="submit" className="w-full" loading={isPending}>
            Verify email
          </Button>

          <p className="text-center text-sm text-gray-600 dark:text-slate-400">
            Didn&apos;t get a code?{' '}
            <button type="button" onClick={handleResend} className="text-indigo-600 hover:underline font-medium">
              Resend
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
