"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Empty, ErrorText, Field, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { contentTypeOf, uploadFile, type Progress } from "@/lib/client/upload";
import { compact } from "@/lib/format";
import type { Video, VideoKind, Visibility } from "@/lib/types";

export default function VideosPage() {
  return (
    <Suspense>
      <Videos />
    </Suspense>
  );
}

function Videos() {
  const me = useMe();
  const [kind, setKind] = useState<VideoKind>("short");
  const [showUpload, setShowUpload] = useState(useSearchParams().get("upload") === "1");
  const id = me.data?.id;
  const q = useInfiniteQuery({
    queryKey: ["myVideos", id, kind],
    queryFn: ({ pageParam }) => api.media.myVideos(id!, kind, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.next_cursor || undefined,
    enabled: !!id,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Videos">
        <Button onClick={() => setShowUpload((s) => !s)}>{showUpload ? "Close upload" : "Upload video"}</Button>
      </PageHeader>
      {showUpload ? <UploadCard onDone={() => setShowUpload(false)} /> : null}
      <div role="tablist" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line">
        {(["short", "long", "replay"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold ${kind === k ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {{ short: "Short videos", long: "Long videos", replay: "Replays" }[k]}
          </button>
        ))}
      </div>
      <Card>
        {q.isPending ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface2" />
        ) : items.length === 0 ? (
          <Empty title="Nothing here yet" hint="Upload a video or go live with replays on." />
        ) : (
          <ul className="divide-y divide-line-soft">
            {items.map((v) => (
              <VideoRow key={v.id} v={v} />
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

function VideoRow({ v }: { v: Video }) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (visibility: Visibility) => api.media.update(v.id, { visibility }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["myVideos"] }),
  });
  const remove = useMutation({ mutationFn: () => api.media.remove(v.id), onSuccess: () => void qc.invalidateQueries({ queryKey: ["myVideos"] }) });
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-surface2">
        {v.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-[1_1_180px]">
        <a href={`/v/${v.id}`} target="_blank" rel="noreferrer" className="block truncate font-semibold hover:underline">
          {v.title || "Untitled"}
        </a>
        <p className="text-xs text-muted">
          {new Date(v.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })} · {compact(v.views)} views ·{" "}
          <span className={v.status === "ready" ? "text-success" : v.status === "failed" ? "text-danger" : "text-coin"}>{v.status}</span>
        </p>
        <ErrorText error={update.error ?? remove.error} />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <label className="sr-only" htmlFor={`vis-${v.id}`}>
          Visibility
        </label>
        <select
          id={`vis-${v.id}`}
          value={update.isPending ? update.variables : v.visibility}
          disabled={update.isPending || remove.isPending}
          onChange={(e) => update.mutate(e.target.value as Visibility)}
          className="h-9 rounded-lg border border-line bg-bg px-2 text-sm"
        >
          <option value="public">Everyone</option>
          <option value="followers">Followers</option>
          <option value="private">Only me</option>
        </select>
        <button
          className="text-sm font-medium text-danger disabled:opacity-50"
          disabled={remove.isPending}
          onClick={() => confirm("Delete this video for good?") && remove.mutate()}
        >
          {remove.isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </li>
  );
}

function UploadCard({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [kind, setKind] = useState<"short" | "long">("long");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<unknown>(null);
  const busy = !!progress && progress.partsDone < progress.parts;
  // Closing the card mid-upload must not leave the upload running unseen.
  useEffect(() => () => abort.current?.abort(), []);

  async function start() {
    if (!file) return;
    setError(null);
    abort.current = new AbortController();
    try {
      await uploadFile(api.media, file, { kind, content_type: contentTypeOf(file), title: title.trim(), description: description.trim(), visibility }, {
        onProgress: setProgress,
        signal: abort.current.signal,
      });
      await qc.invalidateQueries({ queryKey: ["myVideos"] });
      onDone();
    } catch (e) {
      setProgress(null);
      if (!abort.current?.signal.aborted) setError(e);
    }
  }

  const pct = progress ? Math.round((progress.sent / Math.max(1, progress.total)) * 100) : 0;
  return (
    <Card title="Upload a video">
      <div className="flex flex-col gap-4">
        <input
          ref={input}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 120));
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-28 items-center justify-center rounded-2xl border-2 border-dashed border-line text-sm text-muted hover:border-muted"
        >
          {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "Choose an MP4, MOV or WebM file"}
        </button>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="up-kind" className="text-xs font-semibold text-muted">
              Type
            </label>
            <select id="up-kind" value={kind} onChange={(e) => setKind(e.target.value as "short" | "long")} className="h-11 rounded-xl border border-line bg-bg px-3">
              <option value="long">Long video (Watch)</option>
              <option value="short">Short video (feed, up to 3 min)</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="up-desc" className="text-xs font-semibold text-muted">
            Description
          </label>
          <textarea
            id="up-desc"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add #hashtags to reach more people"
            className="min-h-24 rounded-xl border border-line bg-bg p-3 text-[15px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="up-vis" className="text-xs font-semibold text-muted">
            Who can watch
          </label>
          <select id="up-vis" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)} className="h-9 rounded-lg border border-line bg-bg px-2 text-sm">
            <option value="public">Everyone</option>
            <option value="followers">Followers</option>
            <option value="private">Only me</option>
          </select>
        </div>
        {progress ? (
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <div className="h-2 overflow-hidden rounded bg-surface2">
              <div className="h-2 bg-live transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted">
              Uploading {pct}% · part {progress.partsDone} of {progress.parts}
            </p>
          </div>
        ) : null}
        <ErrorText error={error} />
        <div className="flex gap-3">
          <Button onClick={() => void start()} disabled={!file || busy} busy={busy}>
            Upload
          </Button>
          {busy ? (
            <Button kind="ghost" onClick={() => abort.current?.abort()}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
