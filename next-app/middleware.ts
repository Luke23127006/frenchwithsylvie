import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  // Only protect /dashboard routes (defensive check alongside the matcher)
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // If no token exists, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the JWT token
  const payload = await verifyToken(token);

  // If verification fails (expired or invalid), delete cookie and redirect
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  // Allow the request to proceed if token is valid
  return NextResponse.next();
}

// Ensure the middleware only runs for /dashboard and its sub-routes
export const config = {
  matcher: ['/dashboard/:path*'],
};
