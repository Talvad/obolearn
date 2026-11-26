/**
 * Login page — wraps the client form in Suspense to handle
 * useSearchParams() without blocking prerendering.
 */
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in — OboLearn" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
