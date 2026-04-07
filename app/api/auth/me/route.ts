import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";
import { AUTH_COOKIE } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  const res = await backendFetch("/auth/me");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({ user: data?.user ?? null });
}
