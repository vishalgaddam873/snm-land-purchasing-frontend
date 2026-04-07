import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth/session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/reports",
  "/settings",
  "/departments",
  "/zones",
  "/sectors",
  "/branches",
  "/properties",
  "/admin",
];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/zones",
    "/dashboard/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/departments/:path*",
    "/zones/:path*",
    "/sectors",
    "/sectors/:path*",
    "/branches",
    "/branches/:path*",
    "/properties",
    "/properties/:path*",
    "/admin/:path*",
  ],
};
