import { NextResponse } from "next/server";
import { backendPostUnauthenticated } from "@/lib/api/backend";
import { AUTH_COOKIE } from "@/lib/auth/session";

export async function POST(req: Request) {
  const body = await req.json();

  const res = await backendPostUnauthenticated("/auth/login", {
    emailOrUsername:
      body.emailOrUsername ?? body.email ?? body.username ?? "",
    password: body.password ?? "",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { message: data?.message ?? "Login failed" },
      { status: res.status },
    );
  }

  const token: string | undefined = data?.token;
  if (!token) {
    return NextResponse.json(
      { message: "Login failed (token missing)" },
      { status: 500 },
    );
  }

  const out = NextResponse.json({ user: data?.user ?? null });
  out.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return out;
}
