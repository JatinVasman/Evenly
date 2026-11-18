import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("evenly_session")?.value;

  // Check if route is public
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/signin" ||
    pathname === "/signup";

  const isPublicRoute =
    isAuthPage ||
    pathname.startsWith("/invite") ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/register" ||
    (pathname.startsWith("/api/invitations/") && request.method === "GET");

  // If user is already logged in with session cookie and visits /login or /register, redirect to dashboard
  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is NOT logged in and visits any protected page, immediately redirect to /login
  if (!sessionToken && !isPublicRoute) {
    // If it's an API route, return 401 Unauthorized JSON instead of redirecting HTML
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect to login screen
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static public assets (manifest.json, sw.js, icons/*)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};
