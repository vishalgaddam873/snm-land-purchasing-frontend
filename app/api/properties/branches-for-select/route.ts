import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  const zoneId = searchParams.get("zoneId");
  if (zoneId) qs.set("zoneId", zoneId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await backendFetch(`/properties/branches-for-select${suffix}`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

