"use client";

import type * as T from "@/lib/types";

/** Error from the gateway (or network), with the gateway's error envelope. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Opts = { body?: unknown; query?: Record<string, string | number | undefined | null>; idempotencyKey?: string; signal?: AbortSignal };

/**
 * Calls the same-origin BFF (/api/v1/* or /api/auth/*). Cookies carry the
 * session; the CSRF header marks the call as ours. A 409 refresh race (two
 * tabs refreshing at once) is retried once after the other tab's cookie lands.
 */
export async function call<R>(method: string, path: string, o: Opts = {}): Promise<R> {
  let url = path;
  if (o.query) {
    const qs = Object.entries(o.query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  const headers: Record<string, string> = { Accept: "application/json", "x-lumo-csrf": "1" };
  if (o.body !== undefined) headers["Content-Type"] = "application/json";
  if (o.idempotencyKey) headers["Idempotency-Key"] = o.idempotencyKey;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), signal: o.signal, credentials: "same-origin" });
    } catch {
      throw new ApiError(0, "network", "No connection. Check your internet and try again.");
    }
    if (res.ok) {
      if (res.status === 204) return undefined as R;
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as R;
    }
    const data = (await res.json().catch(() => null)) as T.ErrorBody | null;
    const e = data?.error;
    if (res.status === 409 && e?.code === "refresh_in_progress" && attempt === 0) {
      await sleep(400);
      continue;
    }
    throw new ApiError(res.status, e?.code ?? `http_${res.status}`, e?.message ?? defaultMessage(res.status), e?.fields);
  }
}

function defaultMessage(status: number) {
  if (status === 401) return "Sign in to continue.";
  if (status === 403) return "You can't do that.";
  if (status === 404) return "Not found.";
  if (status === 429) return "Too many requests. Wait a moment.";
  return status >= 500 ? "Something went wrong on our side. Try again." : "Request failed.";
}

const enc = encodeURIComponent;
const v1 = (p: string) => `/api/v1${p}`;
const get = <R>(p: string, query?: Opts["query"]) => call<R>("GET", v1(p), { query });
const post = <R>(p: string, body?: unknown, o?: Omit<Opts, "body">) => call<R>("POST", v1(p), { ...o, body });

/** Every gateway call the web app makes, grouped by service. */
export const api = {
  auth: {
    sendOtp: (channel: T.OtpChannel, target: string) => call<{ expires_in: number }>("POST", "/api/auth/otp-send", { body: { channel, target } }),
    verifyOtp: (channel: T.OtpChannel, target: string, code: string) =>
      call<{ user: T.UserPublic; needs_birth_date: boolean }>("POST", "/api/auth/otp-verify", { body: { channel, target, code } }),
    google: (id_token: string) => call<{ user: T.UserPublic; needs_birth_date: boolean }>("POST", "/api/auth/google", { body: { id_token } }),
    password: (login: string, password: string) =>
      call<{ user: T.UserPublic; needs_birth_date: boolean }>("POST", "/api/auth/password", { body: { login, password } }),
    qrCreate: () => call<T.QrCreate>("POST", "/api/auth/qr-create", { body: {} }),
    qrPoll: (id: string, poll_token: string) =>
      call<{ status: string; needs_birth_date?: boolean }>("GET", "/api/auth/qr-poll", { query: { id, poll_token } }),
    logout: (everywhere = false) => call<void>("POST", everywhere ? "/api/auth/logout-all" : "/api/auth/logout", { body: {} }),
  },
  me: () => get<T.Me>("/me"),
  updateMe: (patch: T.MePatch) => call<T.Me>("PATCH", v1("/me"), { body: patch }),
  wallet: {
    balance: () => get<T.Balance>("/wallet"),
    catalog: () => get<T.Catalog>("/wallet/catalog"),
    stats: () => get<T.WalletStats>("/wallet/stats"),
    earnings: (days = 7) => get<{ items: Array<{ day: string; diamonds: number }> }>("/wallet/earnings", { days }),
    history: (cursor?: string) => get<T.Page<T.LedgerEntry>>("/wallet/history", { cursor }),
    payouts: () => get<{ items: T.Payout[] }>("/wallet/payouts"),
    payout: (diamonds: number, key: string) => post<T.PayoutResult>("/wallet/payouts", { diamonds }, { idempotencyKey: key }),
    banks: () => get<{ items: T.Bank[] }>("/wallet/banks"),
    payoutAccount: () => get<{ account: T.PayoutAccount | null }>("/wallet/payout-account"),
    setPayoutAccount: (bank_code: string, account_number: string) =>
      call<{ account: T.PayoutAccount }>("PUT", v1("/wallet/payout-account"), { body: { bank_code, account_number } }),
    webCheckout: (pack_id: string, email: string, callback_url: string) =>
      post<{ authorization_url: string; reference: string }>("/wallet/web/checkout", { pack_id, email, callback_url }),
    adminPayouts: (status: string) => get<{ items: T.Payout[] }>("/wallet/admin/payouts", { status }),
    approve: (id: string) => post<T.Payout>(`/wallet/admin/payouts/${enc(id)}/approve`),
    reject: (id: string, reason: string) => post<T.Payout>(`/wallet/admin/payouts/${enc(id)}/reject`, { reason }),
  },
  live: {
    categories: () => get<{ items: T.LiveCategory[] }>("/live/categories"),
    create: (input: T.CreateRoomInput) => post<T.CreateRoomResult>("/live/rooms", input),
    room: (id: string) => get<T.Room>(`/live/rooms/${enc(id)}`),
    end: (id: string) => post<void>(`/live/rooms/${enc(id)}/end`),
    streamKey: () => get<T.StreamKey>("/live/stream-key"),
    rotateKey: () => post<T.StreamKey>("/live/stream-key/rotate"),
    myRooms: (cursor?: string) => get<T.Page<HostRoom>>("/live/me/rooms", { cursor }),
    summary: (days = 7) => get<HostSummary>("/live/me/summary", { days }),
  },
  social: {
    counts: (id: string) => get<T.FollowCounts>(`/social/users/${enc(id)}/counts`),
    followers: (id: string, cursor?: string) => get<T.Page<T.Edge>>(`/social/users/${enc(id)}/followers`, { cursor }),
    gained: (days = 7) => get<{ count: number }>("/social/me/followers-gained", { days }),
    commentsOnMine: (cursor?: string) => get<T.Page<T.Comment>>("/social/me/comments", { cursor }),
    deleteComment: (id: string) => call<void>("DELETE", v1(`/social/comments/${enc(id)}`)),
    block: (userId: string) => post<void>(`/social/blocks/${enc(userId)}`),
  },
  media: {
    myVideos: (userId: string, kind?: T.VideoKind, cursor?: string) =>
      get<T.Page<T.Video>>(`/media/users/${enc(userId)}/videos`, { kind, cursor }),
    update: (id: string, patch: Partial<Pick<T.Video, "title" | "description" | "visibility">>) =>
      call<T.Video>("PATCH", v1(`/media/videos/${enc(id)}`), { body: patch }),
    remove: (id: string) => call<void>("DELETE", v1(`/media/videos/${enc(id)}`)),
    startUpload: (input: T.UploadStartInput) => post<T.UploadStart>("/media/uploads", input),
    partUrls: (id: string, from: number, to: number) => post<{ from: number; part_urls: string[] }>(`/media/uploads/${enc(id)}/parts`, { from, to }),
    complete: (id: string, parts: T.UploadedPart[]) => post<T.Video>(`/media/uploads/${enc(id)}/complete`, { parts }),
    image: (purpose: "avatar" | "thumbnail", content_type: string, size_bytes: number) =>
      post<T.ImageUpload>("/media/images", { purpose, content_type, size_bytes }),
  },
};

export type HostRoom = {
  id: string;
  title: string;
  category: string;
  source: "app" | "rtmp";
  status: "live" | "ended";
  peak_viewers: number;
  gift_coins: number;
  save_replay: boolean;
  started_at: string;
  ended_at?: string;
  duration_sec: number;
};

export type HostSummary = {
  days: number;
  sessions: number;
  live_seconds: number;
  avg_peak_viewers: number;
  max_peak_viewers: number;
  gift_coins: number;
};
