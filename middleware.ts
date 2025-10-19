import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Allow access to register page
    if (req.nextUrl.pathname === "/auth/register") {
      return NextResponse.next()
    }

    // Redirect authenticated users trying to access sign-in
    if (req.nextUrl.pathname === "/auth/sign-in") {
      if (req.nextauth.token) {
        return NextResponse.redirect(new URL("/", req.url))
      }
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Always allow access to register page
        if (req.nextUrl.pathname === "/auth/register") {
          return true
        }
        return !!token
      }
    },
    pages: {
      signIn: "/auth/sign-in",
    }
  }
)

export const config = {
  matcher: [
    "/",
    "/workspace/:path*",
    "/auth/sign-in"  // Only protect frontend routes, not API routes
  ]
}