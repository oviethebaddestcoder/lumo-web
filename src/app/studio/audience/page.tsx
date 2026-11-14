"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Avatar, Button, Card, Empty, Stat } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { compact } from "@/lib/format";

export default function AudiencePage() {
  const me = useMe();
  const id = me.data?.id;
  const counts = useQuery({ queryKey: ["counts", id], queryFn: () => api.social.counts(id!), enabled: !!id });
  const week = useQuery({ queryKey: ["gained", 7], queryFn: () => api.social.gained(7) });
  const month = useQuery({ queryKey: ["gained", 30], queryFn: () => api.social.gained(30) });
  const followers = useInfiniteQuery({
    queryKey: ["followers", id],
    queryFn: ({ pageParam }) => api.social.followers(id!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.next_cursor || undefined,
    enabled: !!id,
  });
  const list = followers.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Audience</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <Stat label="Followers" value={compact(counts.data?.followers)} />
        <Stat label="New this week" value={week.data ? `+${compact(week.data.count)}` : "–"} />
        <Stat label="New in 30 days" value={month.data ? `+${compact(month.data.count)}` : "–"} />
        <Stat label="Likes received" value={compact(counts.data?.likes_received)} color="var(--color-live)" />
      </div>
      <Card title="Newest followers">
        {list.length === 0 && !followers.isPending ? (
          <Empty title="No followers yet" hint="Go live and post regularly to grow your audience." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <li key={e.user.id} className="flex items-center gap-3 rounded-xl bg-bg p-3">
                <Avatar src={e.user.avatar_url} name={e.user.display_name} size={40} />
                <div className="min-w-0">
                  <a href={`/@${e.user.handle}`} className="block truncate font-semibold hover:underline">
                    {e.user.display_name}
                  </a>
                  <p className="truncate text-xs text-muted">
                    @{e.user.handle} · {new Date(e.followed_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {followers.hasNextPage ? (
          <Button kind="ghost" className="mt-3" busy={followers.isFetchingNextPage} onClick={() => void followers.fetchNextPage()}>
            Load more
          </Button>
        ) : null}
      </Card>
    </>
  );
}
