import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HlsPlayer } from "@/components/HlsPlayer";
import { Avatar, Logo } from "@/components/ui";
import { compact } from "@/lib/format";
import { getUser, getVideo } from "@/lib/server/public";

export async function generateMetadata({ params }: PageProps<"/v/[id]">): Promise<Metadata> {
  const { id } = await params;
  const v = await getVideo(id);
  if (!v) return { title: "Video not found" };
  const title = v.title || "Video on Lumo";
  return {
    title,
    description: v.description?.slice(0, 160) || "Watch on Lumo",
    alternates: { canonical: `/v/${v.id}` },
    openGraph: { title, type: "video.other", images: v.thumbnail_url ? [{ url: v.thumbnail_url }] : undefined },
    twitter: { card: "summary_large_image", title },
  };
}

export default function VideoPage({ params }: PageProps<"/v/[id]">) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <a href="https://lumo.app/download" className="rounded-full bg-live px-4 py-2 text-sm font-semibold text-white">
          Open in app
        </a>
      </header>
      <Suspense fallback={<div className="aspect-video animate-pulse rounded-2xl bg-surface" />}>
        <VideoContent params={params} />
      </Suspense>
    </main>
  );
}

async function VideoContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getVideo(id);
  if (!v) notFound();
  const author = await getUser(v.owner_id);
  return (
    <article className="flex flex-col gap-4">
      {v.status === "ready" && v.hls_url ? (
        <HlsPlayer src={v.hls_url} poster={v.thumbnail_url} portrait={v.height > v.width} />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl bg-surface text-muted">This video is still processing.</div>
      )}
      <h1 className="font-display text-[26px] font-semibold leading-tight">{v.title || "Untitled"}</h1>
      <p className="text-sm text-muted">
        {compact(v.views)} views · {new Date(v.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
      </p>
      {author ? (
        <Link href={`/@${author.handle}`} className="flex items-center gap-3 self-start">
          <Avatar src={author.avatar_url} name={author.display_name} size={44} />
          <span>
            <span className="block font-semibold">{author.display_name}</span>
            <span className="block text-sm text-muted">@{author.handle}</span>
          </span>
        </Link>
      ) : null}
      {v.description ? <p className="whitespace-pre-wrap break-words rounded-xl border border-line bg-surface p-4 text-[15px]">{v.description}</p> : null}
    </article>
  );
}
