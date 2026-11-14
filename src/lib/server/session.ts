import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { gateway, type Device, type Tokens } from "./gateway";

/**
 * Backend-for-frontend session. The browser never sees Lumo tokens: the
 * access token and the rotating refresh token live in httpOnly cookies scoped
 * to /api, and route handlers attach them to gateway calls.
 */
export const AT = "lumo_at";
export const RT = "lumo_rt";
export const DID = "lumo_did";
const secure = process.env.NODE_ENV === "production";

export function setTokens(res: NextResponse, t: Tokens) {
  const at = new Date(t.access_expires_at);
  const rt = new Date(t.refresh_expires_at);
  res.cookies.set(AT, t.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/api", expires: at });
  res.cookies.set(RT, t.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/api", expires: rt });
  // Non-secret hint so pages can tell "probably signed in" without an API call.
  res.cookies.set("lumo_signed_in", "1", { secure, sameSite: "lax", path: "/", expires: rt });
}

export function clearTokens(res: NextResponse) {
  for (const [name, path] of [[AT, "/api"], [RT, "/api"], ["lumo_signed_in", "/"]] as const) {
    res.cookies.set(name, "", { httpOnly: name !== "lumo_signed_in", secure, sameSite: "lax", path, maxAge: 0 });
  }
}

/** A stable per-browser device ID (sessions are bound to it). */
export function device(req: NextRequest, res: NextResponse): Device {
  let id = req.cookies.get(DID)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    res.cookies.set(DID, id, { httpOnly: true, secure, sameSite: "lax", path: "/api", maxAge: 60 * 60 * 24 * 400 });
  }
  return { device_id: id, device_name: browserName(req.headers.get("user-agent") ?? ""), platform: "web" };
}

export function browserName(ua: string): string {
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${b}${os ? ` on ${os}` : ""}`.slice(0, 80);
}

export type Refreshed = { tokens?: Tokens; status: "ok" | "race" | "signed_out" | "error" };

export async function refresh(req: NextRequest, res: NextResponse): Promise<Refreshed> {
  const rt = req.cookies.get(RT)?.value;
  if (!rt) return { status: "signed_out" };
  const r = await gateway("/v1/auth/refresh", {
    method: "POST",
    from: req,
    body: JSON.stringify({ refresh_token: rt, device: device(req, res) }),
  });
  if (r.ok) return { status: "ok", tokens: (await r.json()) as Tokens };
  if (r.status === 409) return { status: "race" };
  if (r.status === 401 || r.status === 403) return { status: "signed_out" };
  return { status: "error" };
}

/** State-changing requests must carry this header (blocks cross-site form posts). */
export const CSRF_HEADER = "x-lumo-csrf";
export function csrfOk(req: NextRequest): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  return req.headers.get(CSRF_HEADER) === "1";
}
