"use client";

import QRCode from "qrcode";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GoogleButton } from "@/components/GoogleButton";
import { Button, ErrorText, Field, Logo } from "@/components/ui";
import { api } from "@/lib/client/api";
import { normalizePhone } from "@/lib/phone";

type Mode = "phone" | "email" | "qr" | "password";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<Mode>("qr");
  const [error, setError] = useState<unknown>(null);

  const done = useCallback(
    (r: { needs_birth_date?: boolean }) => router.replace(r.needs_birth_date ? `/birthday?next=${encodeURIComponent(next)}` : next),
    [router, next],
  );

  return (
    <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Logo />
        <h1 className="font-display text-[26px] font-semibold leading-tight">Sign in to Lumo</h1>
        <p className="text-sm text-muted">Use the same account as the app.</p>
      </div>
      <div role="tablist" className="mb-5 grid grid-cols-4 gap-1 rounded-xl border border-line-soft bg-surface2 p-1 text-xs font-semibold">
        {(["qr", "phone", "email", "password"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`h-8 rounded-lg transition ${mode === m ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`}
          >
            {{ qr: "QR code", phone: "Phone", email: "Email", password: "Password" }[m]}
          </button>
        ))}
      </div>
      {mode === "qr" ? <QrLogin onDone={done} /> : null}
      {mode === "phone" || mode === "email" ? <OtpLogin channel={mode === "phone" ? "sms" : "email"} onDone={done} onError={setError} /> : null}
      {mode === "password" ? <PasswordLogin onDone={done} onError={setError} /> : null}
      <ErrorText error={error} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton
        onToken={(t) => {
          setError(null);
          api.auth.google(t).then(done, setError);
        }}
      />
      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        By continuing you agree to the Terms and Community Guidelines. You must be 18+ to go live or send gifts.
      </p>
    </div>
  );
}

/** Only allow same-site relative redirects after sign-in. */
function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/studio";
}

function QrLogin({ onDone }: { onDone: (r: { needs_birth_date?: boolean }) => void }) {
  const [qr, setQr] = useState<{ id: string; poll: string; img: string; expires: number } | null>(null);
  const [state, setState] = useState<"loading" | "waiting" | "expired" | "error">("loading");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    api.auth
      .qrCreate()
      .then(async (q) => {
        const img = await QRCode.toDataURL(q.qr_payload, { margin: 1, width: 220, color: { dark: "#000000", light: "#FFFFFF" } });
        if (alive) {
          setQr({ id: q.qr_id, poll: q.poll_token, img, expires: Date.now() + q.expires_in * 1000 });
          setState("waiting");
        }
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [nonce]);

  useEffect(() => {
    if (!qr || state !== "waiting") return;
    const t = setInterval(async () => {
      if (Date.now() > qr.expires) {
        setState("expired");
        return;
      }
      try {
        const r = await api.auth.qrPoll(qr.id, qr.poll);
        if (r.status === "approved") {
          clearInterval(t);
          onDone(r);
        } else if (r.status === "expired" || r.status === "consumed") setState("expired");
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [qr, state, onDone]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-[236px] w-[236px] items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-line">
        {qr && state === "waiting" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr.img} alt="Sign-in QR code" width={220} height={220} />
        ) : state === "expired" || state === "error" ? (
          <Button
            kind="secondary"
            onClick={() => {
              setState("loading");
              setNonce((n) => n + 1);
            }}
          >
            {state === "expired" ? "Get a new code" : "Try again"}
          </Button>
        ) : (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        )}
      </div>
      <p className="text-sm text-muted-strong">
        Open Lumo on your phone, go to <b>Me → QR</b> and scan this code.
      </p>
    </div>
  );
}

function OtpLogin({
  channel,
  onDone,
  onError,
}: {
  channel: "sms" | "email";
  onDone: (r: { needs_birth_date?: boolean }) => void;
  onError: (e: unknown) => void;
}) {
  const [target, setTarget] = useState(channel === "sms" ? "+234" : "");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const norm = channel === "sms" ? normalizePhone(target) : target.trim().toLowerCase();
  const valid = channel === "sms" ? /^\+\d{8,15}$/.test(norm) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm);
  // One code a minute per address (server rule); show when the next is allowed.
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    onError(null);
    try {
      await fn();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!sent) void run(async () => (await api.auth.sendOtp(channel, norm), setSent(true), setWait(60)));
        else void run(async () => onDone(await api.auth.verifyOtp(channel, norm, code)));
      }}
    >
      <Field
        label={channel === "sms" ? "Phone number" : "Email"}
        type={channel === "sms" ? "tel" : "email"}
        autoComplete={channel === "sms" ? "tel" : "email"}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        disabled={sent}
      />
      {sent ? (
        <Field
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
        />
      ) : null}
      <Button type="submit" busy={busy} disabled={sent ? code.length !== 6 : !valid}>
        {sent ? "Verify" : "Send code"}
      </Button>
      {sent ? (
        <div className="flex justify-between text-xs text-muted">
          <button type="button" className="hover:text-ink" onClick={() => (setSent(false), setCode(""))}>
            Use a different {channel === "sms" ? "number" : "email"}
          </button>
          <button
            type="button"
            className="hover:text-ink disabled:opacity-60"
            disabled={wait > 0 || busy}
            onClick={() => void run(async () => (await api.auth.sendOtp(channel, norm), setWait(60)))}
          >
            {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function PasswordLogin({ onDone, onError }: { onDone: (r: { needs_birth_date?: boolean }) => void; onError: (e: unknown) => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        onError(null);
        try {
          onDone(await api.auth.password(login.trim(), password));
        } catch (err) {
          onError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Username, email or phone" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" busy={busy} disabled={!login.trim() || password.length < 8}>
        Sign in
      </Button>
    </form>
  );
}

