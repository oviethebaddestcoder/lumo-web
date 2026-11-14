import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="font-display text-3xl font-bold">Nothing here</h1>
      <p className="max-w-sm text-muted">This video or profile may have been removed, made private, or the link is wrong.</p>
      <Link href="/" className="rounded-full bg-live px-5 py-2.5 font-semibold text-white">
        Go home
      </Link>
    </main>
  );
}
