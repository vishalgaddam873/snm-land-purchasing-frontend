import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET() {
  const res = await backendFetch("/reports/departments-with-zones");
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
