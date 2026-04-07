import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET() {
  const res = await backendFetch("/zones/active/names");
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
