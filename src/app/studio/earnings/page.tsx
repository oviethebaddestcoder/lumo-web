"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button, Card, ErrorText, Field, Stat, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/client/api";
import { newKey } from "@/lib/client/hooks";
import { compact, naira } from "@/lib/format";

const STATUS: Record<string, [string, string]> = {
  pending_review: ["In review", "var(--color-coin)"],
  processing: ["Sending", "var(--color-coin)"],
  paid: ["Paid", "var(--color-success)"],
  rejected: ["Declined", "var(--color-danger)"],
  failed: ["Failed", "var(--color-danger)"],
};

export default function EarningsPage() {
  const qc = useQueryClient();
  const balance = useQuery({ queryKey: ["balance"], queryFn: api.wallet.balance });
  const stats = useQuery({ queryKey: ["stats"], queryFn: api.wallet.stats });
  const earnings = useQuery({ queryKey: ["earnings", 30], queryFn: () => api.wallet.earnings(30) });
  const payouts = useQuery({ queryKey: ["payouts"], queryFn: api.wallet.payouts });
  const account = useQuery({ queryKey: ["payoutAccount"], queryFn: api.wallet.payoutAccount });
  const [amount, setAmount] = useState("");
  const [key, setKey] = useState(newKey);
  const diamonds = parseInt(amount, 10) || 0;

  const cashout = useMutation({
    mutationFn: () => api.wallet.payout(diamonds, key),
    onSuccess: () => {
      setAmount("");
      setKey(newKey());
      void qc.invalidateQueries({ queryKey: ["balance"] });
      void qc.invalidateQueries({ queryKey: ["payouts"] });
    },
  });

  const days = earnings.data?.items ?? [];
  const max = Math.max(1, ...days.map((d) => d.diamonds));

  return (
    <>
      <PageHeader title="Earnings" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Diamonds to cash out" value={compact(balance.data?.diamonds)} color="var(--color-diamond)" />
        <Stat label="This week" value={compact(stats.data?.diamonds_week)} sub="Diamonds from gifts" />
        <Stat label="All time" value={compact(stats.data?.diamonds_earned_total)} sub="Diamonds earned" />
        <Stat label="Your coins" value={compact(balance.data?.coins)} sub={`Level ${stats.data?.level ?? 1} gifter`} color="var(--color-coin)" />
      </div>

      <Card title="Last 30 days">
        <div className="flex h-40 items-end gap-1" role="img" aria-label="Diamonds per day for the last 30 days">
          {days.map((d) => (
            <div key={d.day} title={`${d.day}: ${d.diamonds}`} className="flex-1 rounded-t bg-diamond" style={{ height: Math.max(2, (d.diamonds / max) * 150) }} />
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Card title="Cash out" className="flex-[1_1_320px]">
          <div className="flex flex-col gap-4">
            <BankAccount />
            <Field
              label="Diamonds"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                // A different amount is a different request: a fresh idempotency
                // key, or the server would replay the earlier attempt.
                setAmount(e.target.value.replace(/\D/g, ""));
                setKey(newKey());
              }}
              placeholder="e.g. 10000"
            />
            {diamonds > 0 && account.data?.kobo_per_diamond ? (
              <p className="-mt-2 text-xs text-muted">≈ {naira(diamonds * account.data.kobo_per_diamond)} before review. Finance confirms the final amount.</p>
            ) : account.data?.min_diamonds ? (
              <p className="-mt-2 text-xs text-muted">Minimum cash-out is {account.data.min_diamonds.toLocaleString()} diamonds.</p>
            ) : null}
            <ErrorText error={cashout.error} />
            {cashout.error instanceof ApiError && cashout.error.code === "payout_account_required" ? (
              <p className="text-sm text-muted">Add a bank account above first.</p>
            ) : null}
            <Button
              className="self-start"
              disabled={diamonds <= 0 || diamonds > (balance.data?.diamonds ?? 0) || diamonds < (account.data?.min_diamonds ?? 0) || !account.data?.account}
              busy={cashout.isPending}
              onClick={() => confirm(`Cash out ${diamonds.toLocaleString()} diamonds? Finance reviews requests within 3 business days.`) && cashout.mutate()}
            >
              Request cash-out
            </Button>
          </div>
        </Card>
        <Card title="Cash-outs" className="min-w-0 flex-[2_1_420px]">
          {(payouts.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted">No cash-outs yet.</p>
          ) : (
            <ul className="divide-y divide-line-soft text-sm">
              {payouts.data!.items.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {p.diamonds.toLocaleString()} diamonds · {naira(p.amount_kobo)}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(p.created_at).toLocaleDateString()} {p.bank_label ? `· ${p.bank_label}` : ""} {p.note ? `· ${p.note}` : ""}
                    </p>
                  </div>
                  <span className="rounded-md bg-surface2 px-2 py-0.5 text-xs font-bold" style={{ color: STATUS[p.status]?.[1] }}>
                    {STATUS[p.status]?.[0] ?? p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function BankAccount() {
  const qc = useQueryClient();
  const account = useQuery({ queryKey: ["payoutAccount"], queryFn: api.wallet.payoutAccount });
  const [editing, setEditing] = useState(false);
  const banks = useQuery({ queryKey: ["banks"], queryFn: api.wallet.banks, enabled: editing, staleTime: 3_600_000 });
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const sorted = useMemo(() => [...(banks.data?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [banks.data]);
  const save = useMutation({
    mutationFn: () => api.wallet.setPayoutAccount(bank, number),
    onSuccess: (r) => {
      qc.setQueryData(["payoutAccount"], r);
      setEditing(false);
    },
  });
  const a = account.data?.account;
  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-bg p-4">
        <div>
          <p className="text-xs text-muted">Pays to</p>
          <p className="font-semibold">{a ? a.account_name : "No bank account yet"}</p>
          {a ? (
            <p className="text-sm text-muted">
              {a.bank_name} ••{a.account_last4}
            </p>
          ) : null}
        </div>
        <Button kind="secondary" onClick={() => setEditing(true)}>
          {a ? "Change" : "Add bank"}
        </Button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-bg p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label htmlFor="bank" className="text-xs font-semibold text-muted">
        Bank
      </label>
      <select id="bank" value={bank} onChange={(e) => setBank(e.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3">
        <option value="">{banks.isPending ? "Loading banks…" : "Choose your bank"}</option>
        {sorted.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>
      <Field label="Account number" inputMode="numeric" maxLength={10} value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} />
      <ErrorText error={save.error ?? banks.error} />
      <div className="flex gap-2">
        <Button type="submit" busy={save.isPending} disabled={!bank || number.length !== 10}>
          Verify and save
        </Button>
        <Button type="button" kind="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-muted">The bank confirms the account name before it&apos;s saved. Only the last 4 digits are stored by Lumo.</p>
    </form>
  );
}
