import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET() {
  const res = await backendFetch("/branches/import/sample");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  const buf = await res.arrayBuffer();
  const ct =
    res.headers.get("content-type") ??
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const cd =
    res.headers.get("content-disposition") ??
    'attachment; filename="branch-import-sample.xlsx"';
  return new NextResponse(buf, {
    headers: {
      "Content-Type": ct,
      "Content-Disposition": cd,
    },
  });
}
