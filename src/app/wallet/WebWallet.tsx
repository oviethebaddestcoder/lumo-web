"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeSwitch } from "@/components/Theme";
import { Button, Card, ErrorText, Field, Logo } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { naira } from "@/lib/format";

/**
 * Web top-up via Paystack (card, bank transfer, USSD). The wallet credits
 * coins from the Paystack webhook after verifying the charge, so returning
 * here is only for showing the new balance.
 */
export function WebWallet() {
  const me = useMe();
  const returned = useSearchParams().get("reference");
  // After Paystack sends the buyer back, poll for the webhook's credit for a
  // minute, then stop: a closed tab is not the only way this page ends.
  const [polling, setPolling] = useState(!!returned);
  useEffect(() => {
    if (!returned) return;
    const t = setTimeout(() => setPolling(false), 60_000);
    return () => clearTimeout(t);
  }, [returned]);
  const balance = useQuery({ queryKey: ["balance"], queryFn: api.wallet.balance, refetchInterval: polling ? 3000 : false });
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: api.wallet.catalog });
  const [typed, setEmail] = useState<string | null>(null);
  const email = typed ?? me.data?.email ?? "";

  const [leaving, setLeaving] = useState(false);
  const pay = useMutation({
    mutationFn: (packId: string) => api.wallet.webCheckout(packId, email.trim(), `${window.location.origin}/wallet`),
    onSuccess: (r) => {
      setLeaving(true); // keep the packs disabled until the browser leaves
      window.location.assign(r.authorization_url);
    },
  });
  const packs = (catalog.data?.packs ?? []).filter((p) => p.web_amount_kobo > 0);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <ThemeSwitch />
          </span>
          <Link href="/studio" className="text-sm font-semibold text-muted hover:text-ink">
            Studio
          </Link>
        </div>
      </header>
      <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[34px]">Buy coins</h1>
      {returned ? (
        <p className="rounded-xl bg-surface p-4 text-sm" role="status">
          {polling ? "Checking your payment… " : ""}If the payment went through, your coins appear here as soon as Paystack confirms it, usually within a minute.
        </p>
      ) : null}
      <Card>
        <p className="text-sm text-muted">Your balance</p>
        <p className="font-display text-4xl font-semibold tabular-nums text-coin">{(balance.data?.coins ?? 0).toLocaleString()} coins</p>
      </Card>
      <Card title="Coin packs">
        <div className="mb-4 max-w-sm">
          <Field label="Receipt email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {packs.map((p) => (
            <button
              key={p.id}
              disabled={!emailOk || pay.isPending || leaving}
              onClick={() => pay.mutate(p.id)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-bg p-4 transition hover:border-coin disabled:opacity-50 sm:p-5"
            >
              <span className="font-display text-[26px] font-semibold leading-tight">{p.coins.toLocaleString()}</span>
              <span className="text-xs text-muted">coins</span>
              <span className="rounded-full bg-coin px-3 py-1 text-sm font-bold text-bg">{naira(p.web_amount_kobo)}</span>
            </button>
          ))}
        </div>
        <ErrorText error={pay.error} />
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Paid securely with Paystack. Coins are for sending gifts and have no cash value. In the mobile app, coins are bought through Google Play or the App Store.
        </p>
      </Card>
      {pay.isPending || leaving ? <Button busy className="self-start">Opening Paystack…</Button> : null}
    </div>
  );
}
