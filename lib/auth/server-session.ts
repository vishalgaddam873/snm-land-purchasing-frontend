import { backendFetch, getBackendBaseUrl } from "@/lib/api/backend";

export type ServerSessionUser = {
  role?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

export type ServerSessionResult =
  | { ok: true; user: ServerSessionUser | null }
  | { ok: false; error: string; hint: string };

/** Used by server components; does not throw if Nest is unreachable. */
export async function getServerSessionUser(): Promise<ServerSessionResult> {
  const base = getBackendBaseUrl();
  try {
    const meRes = await backendFetch("/auth/me");
    const meJson = await meRes.json().catch(() => ({}));
    if (!meRes.ok) {
      return { ok: true, user: null };
    }
    return { ok: true, user: (meJson?.user as ServerSessionUser) ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg,
      hint: `Next.js could not reach the API at ${base}. In land-purchasing-backend run npm run start:dev (default port 3000). In land-purchasing-frontend/.env.local set BACKEND_URL to match, e.g. http://127.0.0.1:3000`,
    };
  }
}
