"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { StreamKey } from "@/components/StreamKey";
import { Card, PageHeader, Stat } from "@/components/ui";
import { api } from "@/lib/client/api";
import { compact, duration, hours, shortDate } from "@/lib/format";
import { LivesTable } from "./LivesTable";

export default function Dashboard() {
  const earnings = useQuery({ queryKey: ["earnings", 7], queryFn: () => api.wallet.earnings(7) });
  const summary = useQuery({ queryKey: ["liveSummary", 7], queryFn: () => api.live.summary(7) });
  const gained = useQuery({ queryKey: ["gained", 7], queryFn: () => api.social.gained(7) });
  const days = earnings.data?.items ?? [];
  const total = days.reduce((a, d) => a + d.diamonds, 0);
  const max = Math.max(1, ...days.map((d) => d.diamonds));
  const best = days.reduce((a, d) => (d.diamonds > (a?.diamonds ?? -1) ? d : a), days[0]);
  const s = summary.data;

  return (
    <>
      <PageHeader title="Dashboard" note="Last 7 days">
        <Link href="/studio/live" className="flex h-11 items-center gap-2 rounded-full bg-live px-5 text-sm font-semibold text-white shadow-sm hover:brightness-110">
          <span className="h-2 w-2 rounded-full bg-white" />
          Go live
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Diamonds earned" value={compact(total)} sub={<Link href="/studio/earnings">Cash out →</Link>} color="var(--color-diamond)" />
        <Stat label="New followers" value={gained.data ? `+${compact(gained.data.count)}` : "–"} sub={s ? `From ${s.sessions} lives` : undefined} />
        <Stat label="Live hours" value={s ? hours(s.live_seconds) : "–"} sub={s && s.sessions ? `Avg session ${duration(s.live_seconds / s.sessions)}` : "No lives yet"} />
        <Stat label="Avg peak viewers" value={s ? compact(s.avg_peak_viewers) : "–"} sub={s && s.max_peak_viewers ? `Best ${compact(s.max_peak_viewers)}` : undefined} />
      </div>

      <div className="flex flex-wrap gap-4">
        <Card title="Diamonds by day" className="min-w-0 flex-[2_1_320px]">
          <div className="flex h-[200px] items-end gap-2 border-b border-line pb-1 sm:gap-3.5" role="img" aria-label={`Diamonds by day, total ${total}`}>
            {days.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] text-muted">{compact(d.diamonds)}</span>
                <div className="w-full max-w-12 rounded-t-md bg-diamond" style={{ height: Math.max(2, Math.round((d.diamonds / max) * 160)) }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2 sm:gap-3.5">
            {days.map((d) => (
              <span key={d.day} className="flex-1 text-center text-xs text-muted">
                {new Date(d.day + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
              </span>
            ))}
          </div>
          {best && best.diamonds > 0 ? <p className="mt-3 text-xs text-muted">Best day: {shortDate(best.day + "T12:00:00Z")}</p> : null}
        </Card>
        <Card title="Stream from OBS / desktop" className="min-w-0 flex-[1_1_280px]">
          <StreamKey />
        </Card>
      </div>

      <Card title="Recent lives">
        <LivesTable limit={5} />
      </Card>
    </>
  );
}
