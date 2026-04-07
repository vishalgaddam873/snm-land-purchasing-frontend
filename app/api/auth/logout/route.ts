import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return out;
}

