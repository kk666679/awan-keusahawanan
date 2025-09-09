import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"

// Define protected routes
const protectedRoutes = ["/dashboard", "/workspace", "/api/workspaces"]
const authRoutes = ["/login", "/register"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get token from Authorization header or cookie
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "") || request.cookies.get("token")?.value

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Verify token if it exists
  const user = token ? verifyToken(token) : null

  // Redirect logic
  if (isProtectedRoute && !user) {
    // Redirect to login if accessing protected route without valid token
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthRoute && user) {
    // Redirect to workspace selection if already authenticated
    return NextResponse.redirect(new URL("/workspace", request.url))
  }

  // Add user info to headers for API routes
  if (user && pathname.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", user.userId)
    requestHeaders.set("x-user-email", user.email)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
