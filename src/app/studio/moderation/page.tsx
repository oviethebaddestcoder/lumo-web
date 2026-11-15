"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, Card, Empty, ErrorText, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";

/** Comments across the creator's videos: remove them or block the author. */
export default function ModerationPage() {
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ["commentsOnMine"],
    queryFn: ({ pageParam }) => api.social.commentsOnMine(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.next_cursor || undefined,
  });
  const del = useMutation({ mutationFn: api.social.deleteComment, onSuccess: () => void qc.invalidateQueries({ queryKey: ["commentsOnMine"] }) });
  const block = useMutation({ mutationFn: api.social.block, onSuccess: () => void qc.invalidateQueries({ queryKey: ["commentsOnMine"] }) });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <PageHeader title="Moderation" />
      <p className="text-sm text-muted">
        Newest comments on your videos. Removing a comment hides it for everyone; blocking stops that account from commenting, messaging or joining your LIVEs.
      </p>
      <ErrorText error={del.error ?? block.error} />
      <Card>
        {q.isPending ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface2" />
        ) : items.length === 0 ? (
          <Empty title="No comments yet" />
        ) : (
          <ul className="divide-y divide-line-soft">
            {items.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-3 py-3">
                <Avatar src={c.user.avatar_url} name={c.user.display_name} size={36} />
                <div className="min-w-0 flex-[1_1_200px]">
                  <p className="text-xs text-muted">
                    <b className="text-ink">{c.user.display_name || "Lumo user"}</b> on{" "}
                    <a href={`/v/${c.video_id}`} target="_blank" rel="noreferrer" className="underline">
                      your video
                    </a>{" "}
                    · {new Date(c.created_at).toLocaleString()}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                </div>
                <div className="ml-auto flex shrink-0 gap-1">
                  <Button kind="ghost" className="h-9 px-3" busy={del.isPending && del.variables === c.id} onClick={() => del.mutate(c.id)}>
                    Remove
                  </Button>
                  <Button
                    kind="danger"
                    className="h-9 px-3"
                    busy={block.isPending && block.variables === c.user.id}
                    onClick={() => confirm(`Block ${c.user.display_name || "this account"}?`) && block.mutate(c.user.id)}
                  >
                    Block
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {q.hasNextPage ? (
          <Button kind="ghost" className="mt-3" busy={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
            Load more
          </Button>
        ) : null}
      </Card>
    </>
  );
}
