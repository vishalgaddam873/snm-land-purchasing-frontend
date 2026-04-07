import { cookies } from "next/headers";

export const AUTH_COOKIE = "lp_auth";

export async function getAuthToken() {
  const jar = await cookies();
  return jar.get(AUTH_COOKIE)?.value ?? null;
}

