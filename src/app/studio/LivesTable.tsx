"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, Empty } from "@/components/ui";
import { api } from "@/lib/client/api";
import { compact, duration, shortDate } from "@/lib/format";

/** Past lives. Gifts are coins; the host received half as diamonds by default. */
export function LivesTable({ limit }: { limit?: number }) {
  const q = useInfiniteQuery({
    queryKey: ["myRooms"],
    queryFn: ({ pageParam }) => api.live.myRooms(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.next_cursor || undefined,
  });
  const rows = (q.data?.pages.flatMap((p) => p.items) ?? []).slice(0, limit ?? Infinity);
  if (q.isPending) return <div className="h-32 animate-pulse rounded-xl bg-surface2" />;
  if (!rows.length) return <Empty title="No lives yet" hint="Go live from the app or with OBS and your sessions show up here." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            {["Date", "Title", "Duration", "Peak viewers", "Gift coins", "Replay"].map((h) => (
              <th key={h} className="px-1.5 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line-soft">
              <td className="px-1.5 py-3 text-muted-strong">{shortDate(r.started_at)}</td>
              <td className="px-1.5 py-3 font-semibold">
                {r.title}
                {r.status === "live" ? <span className="ml-2 rounded bg-live px-1.5 py-0.5 text-[10px] font-bold text-white">LIVE</span> : null}
              </td>
              <td className="px-1.5 py-3 text-muted-strong">{duration(r.duration_sec)}</td>
              <td className="px-1.5 py-3">{compact(r.peak_viewers)}</td>
              <td className="px-1.5 py-3 font-bold text-coin">{compact(r.gift_coins)}</td>
              <td className="px-1.5 py-3">
                <span
                  className="rounded-md bg-surface2 px-2 py-0.5 text-xs font-bold"
                  style={{ color: r.save_replay ? (r.status === "live" ? "var(--color-coin)" : "var(--color-success)") : "var(--color-muted)" }}
                >
                  {r.save_replay ? (r.status === "live" ? "Recording" : "Saved") : "Off"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!limit && q.hasNextPage ? (
        <Button kind="ghost" className="mt-3" busy={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
