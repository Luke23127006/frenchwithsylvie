import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Protect /dashboard, /student, and /assignment routes
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/student') || 
                           pathname.startsWith('/assignment');

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // If no token exists, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the JWT token
  const payload = await verifyToken(token);

  // If verification fails (expired or invalid), delete cookie and redirect
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  const role = payload.role as string;

  // RBAC Checks
  if (role === 'student' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/student', request.url));
  }

  if (role === 'teacher' && (pathname.startsWith('/student') || pathname.startsWith('/assignment'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow the request to proceed if token and role are valid
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/student/:path*',
    '/assignment/:path*'
  ],
};
