// Tests the real built app (`npm run build` first) against a fake gateway:
// the backend-for-frontend is security-critical, so it is tested end to end
// over HTTP rather than by mocking its pieces.
//
//   npm run build && npm test
import { spawn } from "node:child_process";
import http from "node:http";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const APP_PORT = 3907;
const GW_PORT = 18907;
const APP = `http://127.0.0.1:${APP_PORT}`;

// ---- fake gateway ----
const seen = []; // requests the gateway received
let refreshCalls = 0;
const later = (s) => new Date(Date.now() + s * 1000).toISOString();
const tokens = (n) => ({ access_token: `at${n}`, refresh_token: `rt${n}`, access_expires_at: later(900), refresh_expires_at: later(86400) });

const gw = http.createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  seen.push({ method: req.method, url: req.url, headers: req.headers, body });
  const json = (status, v) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(v));
  };
  const auth = req.headers.authorization ?? "";
  switch (`${req.method} ${req.url.split("?")[0]}`) {
    case "POST /v1/auth/otp/verify": {
      const b = JSON.parse(body);
      if (b.code !== "123456") return json(401, { error: { code: "otp_invalid" } });
      return json(200, { tokens: tokens(1), user: { id: "u1", handle: "ada" }, is_new: false, needs_birth_date: false });
    }
    case "POST /v1/auth/refresh": {
      refreshCalls++;
      const b = JSON.parse(body);
      if (b.refresh_token !== "rt1") return json(401, { error: { code: "refresh_invalid" } });
      return json(200, tokens(2));
    }
    case "GET /v1/me":
      if (auth === "Bearer at2") return json(200, { id: "u1", handle: "ada" });
      return json(401, { error: { code: "token_expired" } }); // at1 counts as expired
    case "GET /v1/users/by-handle/ada":
      return json(200, { id: "u1", handle: "ada", display_name: "Ada's Kitchen", bio: "", status: "active" });
    case "GET /v1/social/users/u1/counts":
      return json(200, { followers: 8, following: 0, likes: 12 });
    case "GET /v1/media/users/u1/videos":
      return json(200, { items: [] });
    case "POST /v1/social/follows/u2":
      return auth ? (res.writeHead(204), res.end()) : json(401, {});
    default:
      return json(404, { error: { code: "not_found", url: req.url } });
  }
});

let app;
before(async () => {
  await new Promise((r) => gw.listen(GW_PORT, "127.0.0.1", r));
  app = spawn("npx", ["next", "start", "-p", String(APP_PORT), "-H", "127.0.0.1"], {
    env: { ...process.env, GATEWAY_URL: `http://127.0.0.1:${GW_PORT}`, NODE_ENV: "production" },
    stdio: "ignore",
    detached: true,
  });
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(APP);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error("next start did not come up (did you run npm run build?)");
});
after(() => {
  try {
    process.kill(-app.pid);
  } catch {}
  gw.close();
});

const CSRF = { "x-lumo-csrf": "1", "content-type": "application/json" };

/** Collect Set-Cookie headers into {name: {value, attrs}}. */
function cookies(res) {
  const out = {};
  for (const c of res.headers.getSetCookie()) {
    const [pair, ...attrs] = c.split(";").map((s) => s.trim());
    const [name, ...v] = pair.split("=");
    out[name] = { value: v.join("="), attrs: attrs.map((a) => a.toLowerCase()) };
  }
  return out;
}

describe("sign-in", () => {
  test("keeps tokens in httpOnly cookies scoped to /api, never in the body", async () => {
    const res = await fetch(`${APP}/api/auth/otp-verify`, {
      method: "POST",
      headers: CSRF,
      body: JSON.stringify({ channel: "email", target: "a@b.c", code: "123456" }),
    });
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(!body.includes("at1") && !body.includes("rt1"), "tokens leaked into the response body");
    const c = cookies(res);
    for (const name of ["lumo_at", "lumo_rt"]) {
      assert.ok(c[name], `${name} not set`);
      assert.ok(c[name].attrs.includes("httponly"), `${name} must be httpOnly`);
      assert.ok(c[name].attrs.includes("path=/api"), `${name} must be scoped to /api`);
      assert.ok(c[name].attrs.includes("secure"), `${name} must be Secure in production`);
      assert.ok(c[name].attrs.includes("samesite=lax"), `${name} must be SameSite=Lax`);
    }
    // The device ID sent upstream is stable and generated server-side.
    const up = JSON.parse(seen.findLast((r) => r.url === "/v1/auth/otp/verify").body);
    assert.match(up.device.device_id, /^[0-9a-f-]{36}$/);
    assert.equal(up.device.platform, "web");
  });

  test("passes a wrong code through as the gateway's error", async () => {
    const res = await fetch(`${APP}/api/auth/otp-verify`, { method: "POST", headers: CSRF, body: JSON.stringify({ channel: "email", target: "a@b.c", code: "000000" }) });
    assert.equal(res.status, 401);
    assert.equal(cookies(res).lumo_at, undefined);
  });

  test("refuses writes without the CSRF header", async () => {
    for (const path of ["/api/auth/otp-verify", "/api/v1/social/follows/u2"]) {
      const res = await fetch(APP + path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      assert.equal(res.status, 403, path);
    }
  });
});

describe("share links", () => {
  // The apps share profiles as lumo.app/@handle. This route once 404'd for
  // every profile because the proxy matcher never matched "@".
  test("/@handle shows the public profile", async () => {
    const res = await fetch(`${APP}/@ada`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Ada(&#x27;|')s Kitchen/);
  });

  test("an unknown handle shows the not-found page and is not indexed", async () => {
    // The profile streams in (Partial Prerender), so the status line is sent
    // before the lookup finishes; the page itself says not found + noindex.
    const html = await (await fetch(`${APP}/@nobody_here`)).text();
    assert.match(html, /Nothing here/);
    assert.match(html, /<meta name="robots" content="noindex"/);
  });
});

describe("proxy", () => {
  const session = "lumo_at=at1; lumo_rt=rt1";

  test("refreshes an expired access token once and retries, rotating cookies", async () => {
    refreshCalls = 0;
    const res = await fetch(`${APP}/api/v1/me`, { headers: { cookie: session } });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).handle, "ada");
    assert.equal(refreshCalls, 1);
    const c = cookies(res);
    assert.equal(c.lumo_at.value, "at2");
    assert.equal(c.lumo_rt.value, "rt2");
  });

  test("a dead refresh token signs the browser out", async () => {
    const res = await fetch(`${APP}/api/v1/me`, { headers: { cookie: "lumo_at=at1; lumo_rt=stolen" } });
    assert.equal(res.status, 401);
    const c = cookies(res);
    assert.equal(c.lumo_at?.value, "", "access cookie must be cleared");
  });

  test("never exposes token, internal, webhook or realtime routes", async () => {
    for (const p of ["auth/refresh", "auth/otp/verify", "internal/social/users/u1/following-ids", "wallet/webhooks/paystack", "rt/me"]) {
      const before = seen.length;
      const res = await fetch(`${APP}/api/v1/${p}`, { headers: { cookie: session } });
      assert.equal(res.status, 404, p);
      assert.equal(seen.length, before, `${p} reached the gateway`);
    }
  });

  test("refuses path segments that change meaning when re-joined", async () => {
    for (const p of ["x%2f..%2f..%2finternal", "media%5c..%5cauth", "feed/%2e%2e%2finternal"]) {
      const before = seen.length;
      const res = await fetch(`${APP}/api/v1/${p}`, { headers: { cookie: session } });
      assert.ok(res.status === 400 || res.status === 404, `${p}: ${res.status}`);
      assert.equal(seen.length, before, `${p} reached the gateway`);
    }
  });

  test("forwards the visitor's address so rate limits are per visitor", async () => {
    await fetch(`${APP}/api/auth/otp-verify`, {
      method: "POST",
      headers: { ...CSRF, "x-forwarded-for": "41.58.10.20" },
      body: JSON.stringify({ channel: "email", target: "a@b.c", code: "123456" }),
    });
    assert.equal(seen.findLast((r) => r.url === "/v1/auth/otp/verify").headers["x-forwarded-for"], "41.58.10.20");
  });

  test("does not forward browser cookies or arbitrary headers upstream", async () => {
    await fetch(`${APP}/api/v1/social/follows/u2`, { method: "POST", headers: { ...CSRF, cookie: "lumo_at=at2; other=secret", "x-evil": "1" } });
    const up = seen.findLast((r) => r.url === "/v1/social/follows/u2");
    assert.equal(up.headers.cookie, undefined);
    assert.equal(up.headers["x-evil"], undefined);
    assert.equal(up.headers.authorization, "Bearer at2");
  });

  test("answers JSON 502 when the gateway is down", async () => {
    gw.close();
    gw.closeAllConnections();
    await new Promise((r) => setTimeout(r, 100));
    const res = await fetch(`${APP}/api/v1/me`, { headers: { cookie: "lumo_at=at2" } });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error.code, "unavailable");
  });
});

describe("security headers", () => {
  test("every page carries the CSP and hardening headers", async () => {
    const res = await fetch(`${APP}/login`);
    const csp = res.headers.get("content-security-policy") ?? "";
    for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
      assert.ok(csp.includes(d), `CSP missing ${d}`);
    }
    assert.ok(!/connect-src[^;]*\*/.test(csp), "connect-src must not allow every origin");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.match(res.headers.get("strict-transport-security") ?? "", /max-age=\d{7,}/);
  });
});
