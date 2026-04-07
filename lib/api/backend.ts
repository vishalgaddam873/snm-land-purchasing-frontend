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
    throw new Error(
      `Cannot reach API at ${url} (${original}). Start the Nest API (land-purchasing-backend) and set BACKEND_URL in .env.local if it is not on 127.0.0.1:3000.`,
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
