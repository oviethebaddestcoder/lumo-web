import { NextResponse, type NextRequest } from "next/server";
import { copyCookies, cookieJar, jsonError } from "@/lib/server/cookies";
import { gateway } from "@/lib/server/gateway";
import { AT, RT, clearTokens, csrfOk, refresh, setTokens } from "@/lib/server/session";

/**
 * Same-origin proxy to the gateway for the browser: /api/v1/* → /v1/*.
 * Attaches the access token from the httpOnly cookie and refreshes it when
 * needed. Endpoints that return tokens are never reachable through here; they
 * go through /api/auth/* which stores tokens in cookies instead.
 */
const BLOCKED = [/^auth\//, /\/webhooks\//, /^internal\//, /^rt\//];
const FORWARD_HEADERS = ["content-type", "idempotency-key", "accept-language"];
const RETURN_HEADERS = ["content-type", "cache-control", "x-trace-id", "retry-after", "etag"];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!csrfOk(req)) return jsonError(403, "csrf", "Missing request header.");
  const { path } = await ctx.params;
  // Segments arrive decoded: refuse anything that could change meaning once
  // re-joined ("..", "x/../internal" from an encoded slash, backslashes).
  if (path.some((seg) => seg === "" || seg === "." || seg === ".." || /[\/\\\u0000]/.test(seg))) {
    return jsonError(400, "bad_path", "Invalid request path.");
  }
  const rel = path.map(encodeURIComponent).join("/");
  if (BLOCKED.some((re) => re.test(rel))) return jsonError(404, "not_found", "Not found.");

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const headers = new Headers();
  for (const h of FORWARD_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }

  const jar = cookieJar();
  let token = req.cookies.get(AT)?.value;
  let refreshed = false;
  let signedOut = false;

  const doRefresh = async () => {
    const r = await refresh(req, jar);
    if (r.status === "ok" && r.tokens) {
      setTokens(jar, r.tokens);
      token = r.tokens.access_token;
      refreshed = true;
      return true;
    }
    if (r.status === "race") return "race" as const;
    if (r.status === "signed_out") signedOut = true;
    return false;
  };

  if (!token && req.cookies.get(RT)) {
    const r = await doRefresh();
    if (r === "race") return copyCookies(jar, jsonError(409, "refresh_in_progress", "Retry."));
  }
  const send = () =>
    gateway(`/v1/${rel}${req.nextUrl.search}`, { method: req.method, headers, from: req, body: body && body.byteLength ? body : undefined, token });
  let up = await send();
  if (up.status === 401 && !refreshed && req.cookies.get(RT)) {
    const r = await doRefresh();
    if (r === "race") return copyCookies(jar, jsonError(409, "refresh_in_progress", "Retry."));
    if (r) up = await send();
  }

  const out = new NextResponse(up.status === 204 ? null : up.body, { status: up.status });
  for (const h of RETURN_HEADERS) {
    const v = up.headers.get(h);
    if (v) out.headers.set(h, v);
  }
  if (!out.headers.has("cache-control")) out.headers.set("cache-control", "no-store");
  copyCookies(jar, out);
  if (signedOut) clearTokens(out);
  return out;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
