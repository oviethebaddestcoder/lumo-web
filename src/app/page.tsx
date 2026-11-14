import Link from "next/link";
import { Logo } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/wallet" className="text-muted hover:text-ink">
            Buy coins
          </Link>
          <Link href="/studio" className="rounded-full bg-live px-4 py-2 text-white">
            Creator Studio
          </Link>
        </nav>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-6 py-16">
        <h1 className="max-w-2xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Go live, post short videos, and get gifted by people who love what you make.
        </h1>
        <p className="max-w-xl text-lg text-muted-strong">
          Lumo is live streaming, short video and long-form Watch in one app. Creators earn diamonds from gifts and cash out to their bank.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/studio" className="rounded-full bg-live px-6 py-3 font-semibold text-white">
            Open Creator Studio
          </Link>
          <Link href="/login" className="rounded-full border border-line px-6 py-3 font-semibold">
            Sign in
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-md" aria-hidden>
          {["#2B3A55", "#4A2F45", "#2F4A3E"].map((c, i) => (
            <div key={c} className="relative h-40 rounded-2xl" style={{ background: c, marginTop: [32, 0, 56][i] }}>
              {i !== 1 ? <span className="absolute left-2.5 top-2.5 rounded bg-live px-1.5 py-0.5 text-[10px] font-bold">LIVE</span> : null}
            </div>
          ))}
        </div>
      </section>
      <footer className="py-8 text-xs text-muted">Download the Lumo app on Google Play and the App Store.</footer>
    </main>
  );
}
