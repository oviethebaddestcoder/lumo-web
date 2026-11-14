export function compact(n: number | undefined | null): string {
  const v = n ?? 0;
  const a = Math.abs(v);
  const t = (x: number) => (x >= 100 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, ""));
  if (a >= 1e9) return t(v / 1e9) + "B";
  if (a >= 1e6) return t(v / 1e6) + "M";
  if (a >= 1e4) return t(v / 1e3) + "K";
  return v.toLocaleString("en-US");
}

export function hours(sec: number): string {
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1).replace(/\.0$/, "")}h`;
}

export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function naira(kobo: number): string {
  return "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
