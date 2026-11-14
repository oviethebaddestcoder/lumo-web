"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar, Logo } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";

const NAV = [
  ["/studio", "Dashboard"],
  ["/studio/live", "Live"],
  ["/studio/videos", "Videos"],
  ["/studio/earnings", "Earnings"],
  ["/studio/audience", "Audience"],
  ["/studio/moderation", "Moderation"],
  ["/studio/settings", "Settings"],
] as const;

export function StudioShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const finance = me.data?.roles?.includes("finance");

  return (
    <div className="min-h-screen">
      <header className="flex h-16 flex-wrap items-center gap-4 border-b border-surface2 px-6">
        <Link href="/studio">
          <Logo suffix="Studio" />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/studio/videos?upload=1" className="h-10 rounded-xl border border-line bg-surface px-4 text-sm font-semibold leading-10">
            Upload
          </Link>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu" className="rounded-full">
              <Avatar src={me.data?.avatar_url} name={me.data?.display_name} size={36} />
            </button>
            {menu ? (
              <div role="menu" className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-line bg-surface p-1 text-sm shadow-xl">
                <p className="px-3 py-2 text-muted">@{me.data?.handle}</p>
                <Link role="menuitem" href="/wallet" className="block rounded-lg px-3 py-2 hover:bg-surface2">
                  Buy coins
                </Link>
                {finance ? (
                  <Link role="menuitem" href="/admin/payouts" className="block rounded-lg px-3 py-2 hover:bg-surface2">
                    Finance: payouts
                  </Link>
                ) : null}
                <button
                  role="menuitem"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-surface2"
                  onClick={async () => {
                    await api.auth.logout().catch(() => undefined);
                    router.replace("/login");
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px] flex-wrap gap-6 p-6">
        <nav aria-label="Studio" className="flex max-w-[240px] flex-[1_1_200px] flex-col gap-1">
          {NAV.map(([href, label]) => {
            const on = href === "/studio" ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`h-[42px] rounded-xl px-3.5 text-sm leading-[42px] ${on ? "bg-surface2 font-bold text-white" : "font-semibold text-muted hover:text-ink"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          {me.isPending ? <div className="h-40 animate-pulse rounded-2xl bg-surface" /> : me.data ? children : null}
        </main>
      </div>
    </div>
  );
}
