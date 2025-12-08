import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Runtime Middleware for Authentication and Route Protection
 *
 * This middleware runs on every request before the page components are rendered,
 * providing client-side route protection and authentication flow management.
 * It handles redirects for protected routes and prevents authenticated users
 * from accessing auth pages.
 */
export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  // Parse the current pathname from the request URL
  const { pathname } = req.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtected =
    pathname.startsWith("/events/new") || pathname.startsWith("/edit");

  /**
   * Handle access to protected routes by unauthenticated users.
   *
   * If a user without a valid token tries to access a protected route:
   * 1. Create a redirect URL to the login page
   * 2. Preserve the original destination in the "from" query parameter
   * 3. After successful login, user can be redirected back to their intended page
   *
   * This provides a seamless user experience where users can continue their
   * intended action after authentication.
   */
  if (isProtected && !token) {
    // Clone the current URL to create a redirect destination
    const url = req.nextUrl.clone();

    // Set the destination to the login page
    url.pathname = "/login";

    // Preserve the original destination for post-login redirect
    // Frontend login component can read this parameter and redirect after auth
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  /**
   * Handle access to authentication routes by already-authenticated users.
   *
   * If a user with a valid token tries to access login or register pages:
   * 1. Redirect them to the main application (events listing)
   * 2. This prevents confusion and provides a better user experience
   *
   * Common scenarios:
   * - User bookmarked login page and visits while already logged in
   * - User manually navigates to /login while authenticated
   * - Stale browser tabs pointing to auth pages
   */
  if (isAuthRoute && token) {
    // Clone the current URL to create a redirect destination
    const url = req.nextUrl.clone();

    // Redirect authenticated users to the main events page
    // This could be customized to redirect to a dashboard or profile page
    url.pathname = "/events";
    return NextResponse.redirect(url);
  }

  /**
   * Allow the request to proceed to the intended route.
   *
   * This covers all scenarios where no redirect is needed:
   * - Public routes (/, /events, /events/[id]) - accessible to everyone
   * - Authenticated users accessing protected routes
   * - Unauthenticated users accessing public routes
   * - API routes and static assets
   */
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/events/:path*"],
};
