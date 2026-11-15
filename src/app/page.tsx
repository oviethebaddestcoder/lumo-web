import Link from "next/link";
import { ThemeSwitch } from "@/components/Theme";
import { Logo } from "@/components/ui";

const FEATURES = [
  ["Go live", "Stream from your phone or from OBS on a computer. Battle other hosts in PK rounds and set coin goals with your fans."],
  ["Post short videos", "A For You feed that learns what each viewer finishes watching, so new creators get seen, not just the famous ones."],
  ["Get gifted, get paid", "Fans send gifts with coins. You earn diamonds and cash them out to your Nigerian bank account."],
] as const;

const TILES = [
  { label: "LIVE", title: "Friday karaoke", tone: "from-[#3a2a4f] to-[#1d1a2b]", offset: "sm:mt-10" },
  { label: "", title: "Jollof, the right way", tone: "from-[#5a3a24] to-[#2a1c14]", offset: "" },
  { label: "LIVE", title: "PK: Lagos vs Abuja", tone: "from-[#1f3d4a] to-[#14222b]", offset: "sm:mt-16" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-4">
          <Link href="/wallet" className="hidden text-muted hover:text-ink sm:inline">
            Buy coins
          </Link>
          <Link href="/login" className="text-muted hover:text-ink">
            Sign in
          </Link>
          <Link href="/studio" className="rounded-full bg-ink px-4 py-2 text-bg hover:opacity-90">
            Creator Studio
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-live-ink uppercase">Live · Short video · Watch</p>
            <h1 className="font-display text-[42px] leading-[1.02] font-medium tracking-tight sm:text-6xl lg:text-[68px]">
              Go live, post, and get gifted by people who love what you make.
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-muted-strong">
              Lumo puts live streaming, short videos and long-form Watch in one app. Creators earn diamonds from gifts and cash out to their bank.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/studio" className="rounded-full bg-live px-6 py-3 font-semibold text-white shadow-sm hover:brightness-110">
                Open Creator Studio
              </Link>
              <Link href="/wallet" className="rounded-full border border-line bg-surface px-6 py-3 font-semibold hover:bg-surface2">
                Buy coins
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4" aria-hidden>
            {TILES.map((t) => (
              <div key={t.title} className={`relative aspect-[9/16] overflow-hidden rounded-2xl bg-gradient-to-b ${t.tone} shadow-card ring-1 ring-black/5 ${t.offset}`}>
                {t.label ? <span className="absolute left-2 top-2 rounded bg-live px-1.5 py-0.5 text-[10px] font-bold text-white">{t.label}</span> : null}
                <span className="absolute inset-x-2 bottom-2 text-[11px] leading-tight font-semibold text-white/90 sm:text-xs">{t.title}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="flex flex-col gap-2 bg-surface p-6">
              <h2 className="font-display text-2xl font-medium">{title}</h2>
              <p className="text-[15px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto mt-12 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-8 text-xs text-muted sm:px-6">
        <span>Get the Lumo app on Google Play and the App Store.</span>
        <ThemeSwitch />
      </footer>
    </div>
  );
}
