import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Kind = "primary" | "secondary" | "ghost" | "danger" | "light";
const kinds: Record<Kind, string> = {
  primary: "bg-live text-white shadow-sm hover:brightness-110 active:brightness-95",
  secondary: "bg-surface2 text-ink hover:bg-line",
  ghost: "border border-line bg-surface text-ink hover:bg-surface2",
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
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 ${kinds[kind]} ${className}`}
    >
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

export function Card({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
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
        className={`h-11 w-full min-w-0 rounded-xl border bg-bg px-3.5 text-[15px] text-ink placeholder:text-inactive focus:border-ink/40 focus:outline-none ${error ? "border-danger" : "border-line"} ${className}`}
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
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="truncate font-display text-[30px] font-semibold leading-none tabular-nums" style={color ? { color } : undefined}>
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
    <span className="inline-flex items-baseline font-display text-[26px] font-semibold tracking-tight">
      lumo<span className="text-live">.</span>
      {suffix ? <span className="ml-2 font-sans text-sm font-medium tracking-normal text-muted">{suffix}</span> : null}
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

/** Page heading used by every Studio page: serif title, optional note and actions. */
export function PageHeader({ title, note, children }: { title: string; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[34px]">{title}</h1>
        {note ? <span className="text-sm text-muted">{note}</span> : null}
      </div>
      {children ? <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
