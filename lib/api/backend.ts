import { AUTH_COOKIE } from "@/lib/auth/session";
import { cookies } from "next/headers";

/** Must match Nest `PORT` (see land-purchasing-backend `main.ts` / `.env.example`). */
const DEFAULT_BACKEND_URL = "http://127.0.0.1:3000";

/**
 * Server-side `fetch` often resolves `localhost` to IPv6 (::1) while Nest may only
 * accept IPv4 — use 127.0.0.1 for local dev to avoid opaque `fetch failed` errors.
 */
export function getBackendBaseUrl(): string {
  const raw = (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).trim();
  const noTrailingSlash = raw.replace(/\/$/, "");
  const withProtocol = noTrailingSlash.includes("://")
    ? noTrailingSlash
    : `http://${noTrailingSlash}`;

  try {
    const u = new URL(withProtocol);
    if (u.hostname === "localhost" || u.hostname === "::1") {
      u.hostname = "127.0.0.1";
    }
    return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return noTrailingSlash;
  }
}

async function backendRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = getBackendBaseUrl();
  const rel = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${rel}`;

  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
    });
  } catch (err) {
    const original = err instanceof Error ? err.message : String(err);
    const base = getBackendBaseUrl();
    throw new Error(
      `Cannot reach API at ${url} (${original}). ` +
        `Start the Nest server: cd land-purchasing-backend && npm run start:dev — ` +
        `its PORT (see backend .env, default 3000) must match BACKEND_URL in land-purchasing-frontend/.env.local (currently ${base}).`,
    );
  }
}

/** Forward cookie JWT as Bearer (for authenticated calls to Nest). */
export async function backendFetch(path: string, init?: RequestInit) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;

  const headers = new Headers(init?.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }

  return backendRequest(path, {
    ...init,
    headers,
  });
}

/** POST `multipart/form-data` with JWT; do not set Content-Type (boundary is set automatically). */
export async function backendFetchFormData(path: string, formData: FormData) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);

  return backendRequest(path, {
    method: "POST",
    body: formData,
    headers,
  });
}

/** POST JSON without auth header (login / signup). */
export async function backendPostUnauthenticated(
  path: string,
  body: Record<string, unknown>,
) {
  return backendRequest(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
