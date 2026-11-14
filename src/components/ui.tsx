import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Kind = "primary" | "secondary" | "ghost" | "danger" | "light";
const kinds: Record<Kind, string> = {
  primary: "bg-live text-white hover:brightness-110",
  secondary: "bg-surface2 text-ink hover:bg-line",
  ghost: "border border-line text-ink hover:bg-surface2",
  danger: "text-danger hover:bg-surface2",
  light: "bg-ink text-bg hover:brightness-95",
};

export function Button({
  kind = "primary",
  busy,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${kinds[kind]} ${className}`}
    >
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

export function Card({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Field({ label, error, id, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const fid = id ?? rest.name ?? label?.toLowerCase().replace(/\W+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={fid} className="text-xs font-semibold text-muted">
          {label}
        </label>
      ) : null}
      <input
        id={fid}
        {...rest}
        aria-invalid={!!error || undefined}
        className={`h-11 rounded-xl border bg-bg px-3.5 text-[15px] text-ink placeholder:text-inactive ${error ? "border-danger" : "border-line"} ${className}`}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function Avatar({ src, name, size = 36 }: { src?: string | null; name?: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full bg-surface2 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface2 font-semibold text-muted-strong"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-display text-[28px] font-bold leading-none" style={color ? { color } : undefined}>
        {value}
      </span>
      {sub ? <span className="text-xs text-muted">{sub}</span> : null}
    </div>
  );
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

export function Logo({ suffix }: { suffix?: string }) {
  return (
    <span className="font-display text-2xl font-bold tracking-tight">
      lumo<span className="text-live">.</span>
      {suffix ? <span className="ml-1.5 text-[15px] font-semibold text-muted">{suffix}</span> : null}
    </span>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {error instanceof Error ? error.message : "Something went wrong."}
    </p>
  );
}
