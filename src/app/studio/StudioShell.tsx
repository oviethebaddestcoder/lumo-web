"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeSwitch } from "@/components/Theme";
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

function isOn(path: string, href: string) {
  return href === "/studio" ? path === href : path === href || path.startsWith(href + "/");
}

/**
 * Studio frame. Phones and tablets get a sticky header with the sections as a
 * horizontally scrolling tab row; from 1024px the sections move to a sidebar.
 */
export function StudioShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const path = usePathname();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/studio" aria-label="Studio home">
            <Logo suffix="Studio" />
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/studio/videos?upload=1"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface2 sm:h-10 sm:px-4"
            >
              <span aria-hidden className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Upload</span>
              <span className="sr-only sm:hidden">Upload</span>
            </Link>
            <AccountMenu />
          </div>
        </div>
        <nav aria-label="Studio" className="scrollbar-none -mb-px flex gap-1 overflow-x-auto px-3 lg:hidden">
          {NAV.map(([href, label]) => {
            const on = isOn(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition ${on ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="mx-auto flex max-w-[1440px] gap-8 px-4 py-5 sm:px-6 sm:py-6 lg:py-8">
        <nav aria-label="Studio" className="sticky top-24 hidden h-fit w-[208px] shrink-0 flex-col gap-0.5 lg:flex">
          {NAV.map(([href, label]) => {
            const on = isOn(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative flex h-10 items-center rounded-lg px-3 text-sm transition ${on ? "bg-surface font-semibold text-ink shadow-card ring-1 ring-line" : "font-medium text-muted hover:bg-surface2 hover:text-ink"}`}
              >
                {on ? <span aria-hidden className="absolute left-0 top-2.5 h-5 w-0.5 rounded-full bg-live" /> : null}
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="flex min-w-0 flex-1 flex-col gap-5">
          {me.isPending ? <div className="h-40 animate-pulse rounded-2xl bg-surface" /> : me.data ? children : null}
        </main>
      </div>
    </div>
  );
}

/** Avatar menu. Closes on outside click, Escape and navigation. */
function AccountMenu() {
  const me = useMe();
  const router = useRouter();
  const path = usePathname();
  // Remember which page the menu was opened on: navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenOn((typeof v === "function" ? v(open) : v) ? path : null);
  const box = useRef<HTMLDivElement>(null);
  const finance = me.data?.roles?.includes("finance");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((m) => !m)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="flex rounded-full">
        <Avatar src={me.data?.avatar_url} name={me.data?.display_name} size={36} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-line bg-surface p-1.5 text-sm shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate font-semibold">{me.data?.display_name}</p>
            <p className="truncate text-muted">@{me.data?.handle}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/wallet" className="block rounded-lg px-3 py-2 hover:bg-surface2">
            Buy coins
          </Link>
          {me.data?.handle ? (
            <Link role="menuitem" href={`/@${me.data.handle}`} className="block rounded-lg px-3 py-2 hover:bg-surface2">
              View public profile
            </Link>
          ) : null}
          {finance ? (
            <Link role="menuitem" href="/admin/payouts" className="block rounded-lg px-3 py-2 hover:bg-surface2">
              Finance: payouts
            </Link>
          ) : null}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-muted">Theme</span>
            <ThemeSwitch />
          </div>
          <div className="my-1 h-px bg-line" />
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
  );
}
