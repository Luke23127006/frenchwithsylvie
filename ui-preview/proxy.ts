import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const headers = new Headers(request.headers);
  headers.set("x-preview-role", path.startsWith("/dashboard") || path === "/onboarding" ? "teacher" : "student");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/student", "/assignment/:path*", "/onboarding"],
};
