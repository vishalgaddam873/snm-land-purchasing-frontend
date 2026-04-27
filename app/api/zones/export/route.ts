import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    qs.append(k, v);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const res = await backendFetch(`/zones/export${suffix}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  const headers = new Headers();
  const ct = res.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const cd = res.headers.get("content-disposition");
  if (cd) headers.set("content-disposition", cd);

  return new NextResponse(buf, { status: 200, headers });
}
