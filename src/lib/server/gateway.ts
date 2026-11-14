import "server-only";

/** The Lumo API gateway (svc-gateway). Only the Next.js server talks to it. */
export const GATEWAY_URL = (process.env.GATEWAY_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export type Tokens = {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  session_id: string;
};

export type Device = { device_id: string; device_name: string; platform: "web" };

/**
 * Call the gateway. Pass `from` (the incoming request) so the gateway's
 * per-IP rate limits apply to the real visitor, not to this server: without
 * it every web sign-in would share one limit.
 */
export async function gateway(path: string, init: RequestInit & { token?: string; from?: { headers: Headers } } = {}): Promise<Response> {
  const { from, token, ...rest } = init;
  init = { ...rest, token };
  const headers = new Headers(init.headers);
  // The load balancer appends the visitor's address to X-Forwarded-For; the
  // gateway reads the chain right to left and skips trusted proxies, so
  // anything a visitor puts on the left is ignored.
  const xff = from?.headers.get("x-forwarded-for");
  if (xff) headers.set("x-forwarded-for", xff.slice(0, 512));
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  try {
    return await fetch(GATEWAY_URL + path, {
      ...init,
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: init.signal ?? AbortSignal.timeout(30_000),
    });
  } catch (err) {
    // Network failure or timeout: answer like an unhealthy upstream instead of throwing a bare 500.
    console.error("gateway unreachable", path.split("?")[0], err instanceof Error ? err.message : err);
    return Response.json({ error: { code: "unavailable", message: "Lumo is having trouble right now. Try again." } }, { status: 502 });
  }
}
