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

export async function gateway(path: string, init: RequestInit & { token?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
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
