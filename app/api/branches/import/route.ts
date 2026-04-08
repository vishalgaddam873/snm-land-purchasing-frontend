import { NextResponse } from "next/server";
import { backendFetchFormData } from "@/lib/api/backend";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { message: "Missing file (use field name: file)." },
      { status: 400 },
    );
  }

  const forward = new FormData();
  forward.append("file", file, file.name);

  const res = await backendFetchFormData("/branches/import", forward);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
