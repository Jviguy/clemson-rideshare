import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/rides", "/post-ride", "/my-rides"];

// Routes that are only for unauthenticated users
const authRoutes = ["/login", "/signup", "/verify"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

  // Check if the current path matches a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL("/rides", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/rides/:path*",
    "/post-ride/:path*",
    "/my-rides/:path*",
    "/login",
    "/signup",
    "/verify",
  ],
};
