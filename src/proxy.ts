import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware for role-based route protection.
 *
 * Route structure:
 * - /dashboard/brand/*  → BRAND or ADMIN only
 * - /dashboard/creator/* → CREATOR or ADMIN only
 * - /admin/*            → ADMIN only
 * - /api/admin/*        → ADMIN only
 * - /api/brand/*        → BRAND or ADMIN only
 * - /api/creator/*      → CREATOR or ADMIN only
 */

const ROLE_ROUTES: Record<string, string[]> = {
  "/dashboard/brand": ["BRAND", "ADMIN"],
  "/dashboard/creator": ["CREATOR", "ADMIN"],
  "/admin": ["ADMIN"],
  "/api/admin": ["ADMIN"],
  "/api/brand": ["BRAND", "ADMIN"],
  "/api/creator": ["CREATOR", "ADMIN"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname === "/" ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to sign in
  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check role-based access
  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      const userRole = token.role as string;
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/brand/:path*",
    "/api/creator/:path*",
    "/api/admin/:path*",
    "/api/campaigns/:path*",
    "/api/payments/:path*",
  ],
};
