import { NextResponse, type NextRequest } from "next/server";
import { copyCookies, cookieJar, jsonError } from "@/lib/server/cookies";
import { gateway, type Tokens } from "@/lib/server/gateway";
import { AT, clearTokens, csrfOk, device, setTokens } from "@/lib/server/session";

type SignInResult = { tokens: Tokens; user: unknown; is_new: boolean; needs_birth_date: boolean };

async function readJSON(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Forward a sign-in call, keep the tokens in cookies, return only the user. */
async function signIn(req: NextRequest, path: string, body: Record<string, unknown>) {
  const jar = cookieJar();
  const r = await gateway(path, { method: "POST", body: JSON.stringify({ ...body, device: device(req, jar) }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return copyCookies(jar, NextResponse.json(data, { status: r.status }));
  const res = data as SignInResult;
  const out = NextResponse.json({ user: res.user, is_new: res.is_new, needs_birth_date: res.needs_birth_date });
  setTokens(out, res.tokens);
  return copyCookies(jar, out);
}

const pick = (b: Record<string, unknown>, ...keys: string[]) =>
  Object.fromEntries(keys.filter((k) => typeof b[k] === "string" && b[k] !== "").map((k) => [k, b[k]]));

export async function POST(req: NextRequest, ctx: RouteContext<"/api/auth/[action]">) {
  if (!csrfOk(req)) return jsonError(403, "csrf", "Missing request header.");
  const { action } = await ctx.params;
  const b = await readJSON(req);
  switch (action) {
    case "otp-send": {
      const r = await gateway("/v1/auth/otp/send", { method: "POST", body: JSON.stringify(pick(b, "channel", "target")) });
      return new NextResponse(r.body, { status: r.status, headers: { "content-type": "application/json" } });
    }
    case "otp-verify":
      return signIn(req, "/v1/auth/otp/verify", pick(b, "channel", "target", "code", "birth_date", "display_name"));
    case "password":
      return signIn(req, "/v1/auth/password/login", pick(b, "login", "password"));
    case "google":
      // Google Identity Services gives the browser an ID token for our web client ID.
      return signIn(req, "/v1/auth/oauth/google", pick(b, "id_token", "birth_date", "display_name"));
    case "qr-create": {
      const r = await gateway("/v1/auth/qr", { method: "POST", body: "{}" });
      return new NextResponse(r.body, { status: r.status, headers: { "content-type": "application/json" } });
    }
    case "logout":
    case "logout-all": {
      const token = req.cookies.get(AT)?.value;
      if (token) {
        await gateway(action === "logout" ? "/v1/auth/logout" : "/v1/auth/logout-all", {
          method: "POST",
          token,
          body: action === "logout-all" ? JSON.stringify({ keep_current: false }) : undefined,
        }).catch(() => undefined);
      }
      const out = new NextResponse(null, { status: 204 });
      clearTokens(out);
      return out;
    }
  }
  return jsonError(404, "not_found", "Unknown action.");
}

/** QR sign-in: the web page polls until a phone approves, then gets a session. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params;
  if (action !== "qr-poll") return jsonError(404, "not_found", "Unknown action.");
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const pollToken = req.nextUrl.searchParams.get("poll_token") ?? "";
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) return jsonError(400, "bad_request", "Bad QR id.");
  const r = await gateway(`/v1/auth/qr/${id}?poll_token=${encodeURIComponent(pollToken)}`);
  const data = (await r.json().catch(() => ({}))) as { status?: string; result?: SignInResult };
  if (!r.ok) return NextResponse.json(data, { status: r.status });
  if (data.status === "approved" && data.result?.tokens) {
    const out = NextResponse.json({ status: "approved", user: data.result.user, needs_birth_date: data.result.needs_birth_date });
    setTokens(out, data.result.tokens);
    return out;
  }
  return NextResponse.json({ status: data.status ?? "pending" });
}
