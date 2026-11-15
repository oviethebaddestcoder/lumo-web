import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar, Logo } from "@/components/ui";
import { compact } from "@/lib/format";
import { getCounts, getUserByHandle, getUserVideos } from "@/lib/server/public";

/** Public profile. Served at /@handle (rewritten in proxy.ts). */
export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const u = await getUserByHandle(decodeURIComponent(handle));
  if (!u) return { title: "Profile not found" };
  return {
    title: `${u.display_name} (@${u.handle})`,
    description: u.bio || `Watch ${u.display_name} on Lumo.`,
    alternates: { canonical: `/@${u.handle}` },
    openGraph: { title: `${u.display_name} on Lumo`, images: u.avatar_url ? [{ url: u.avatar_url }] : undefined },
  };
}

export default function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <a href="https://lumo.app/download" className="rounded-full bg-live px-4 py-2 text-sm font-semibold text-white">
          Follow in app
        </a>
      </header>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-surface" />}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const u = await getUserByHandle(decodeURIComponent(handle));
  if (!u) notFound();
  const [counts, videos] = await Promise.all([getCounts(u.id), getUserVideos(u.id)]);
  return (
    <>
      <section className="flex flex-col items-center gap-2 text-center">
        <Avatar src={u.avatar_url} name={u.display_name} size={96} />
        <h1 className="font-display text-[26px] font-semibold leading-tight">{u.display_name}</h1>
        <p className="text-muted">@{u.handle}</p>
        <div className="my-2 flex gap-8">
          {[
            ["Following", counts?.following],
            ["Followers", counts?.followers],
            ["Likes", counts?.likes_received],
          ].map(([label, n]) => (
            <div key={label as string}>
              <p className="font-bold">{compact(n as number)}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        {u.bio ? <p className="max-w-md text-[15px] text-muted-strong">{u.bio}</p> : null}
      </section>
      <section className="mt-8 grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl sm:grid-cols-4">
        {videos.map((v) => (
          <Link key={v.id} href={`/v/${v.id}`} className="relative block aspect-[3/4] bg-surface2">
            {v.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" />
            ) : null}
            <span className="absolute bottom-1.5 left-1.5 text-xs font-bold text-white drop-shadow">▶ {compact(v.views)}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
