/**
 * proxy.ts — Next.js 16 route protection (replaces middleware.ts).
 *
 * Protected routes:
 *   /dashboard              — learner must be authenticated
 *   /courses/[id]/lessons/  — learner must be authenticated
 *   /admin                  — must be authenticated AND in the 'admin' group
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const TOKEN_COOKIE = "obolearn_id_token";

interface TokenPayload {
  sub: string;
  exp: number;
  "cognito:groups"?: string[];
}

function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(TOKEN_COOKIE)?.value ?? null;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = jwtDecode<TokenPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLearnerRoute =
    pathname.startsWith("/dashboard") ||
    /^\/courses\/[^/]+\/lessons/.test(pathname);
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isLearnerRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeToken(token);
  if (!payload) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(TOKEN_COOKIE);
    return response;
  }

  if (isAdminRoute) {
    const groups = payload["cognito:groups"] ?? [];
    if (!groups.includes("admin")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:courseId/lessons/:path*",
    "/admin/:path*",
  ],
};
