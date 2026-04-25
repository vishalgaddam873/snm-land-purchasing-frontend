import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  const departmentId = searchParams.get("departmentId");
  if (departmentId) qs.set("departmentId", departmentId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await backendFetch(`/properties/zones-for-select${suffix}`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

