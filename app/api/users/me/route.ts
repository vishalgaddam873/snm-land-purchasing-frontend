import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await backendFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
