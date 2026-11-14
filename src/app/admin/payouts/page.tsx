"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, Empty, ErrorText, Logo } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { naira } from "@/lib/format";

const TABS = ["pending_review", "processing", "paid", "failed", "rejected"] as const;

/** Finance console: approve (sends the Paystack transfer) or reject (returns diamonds). Needs the "finance" role. */
export default function AdminPayouts() {
  const me = useMe();
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof TABS)[number]>("pending_review");
  const list = useQuery({ queryKey: ["adminPayouts", status], queryFn: () => api.wallet.adminPayouts(status), enabled: !!me.data?.roles?.includes("finance") });
  const done = () => void qc.invalidateQueries({ queryKey: ["adminPayouts"] });
  const approve = useMutation({ mutationFn: api.wallet.approve, onSettled: done });
  const reject = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.wallet.reject(id, reason), onSettled: done });

  if (me.data && !me.data.roles?.includes("finance")) {
    return (
      <main className="p-8">
        <Empty title="Finance access only" hint="Ask an admin to give your account the finance role." />
      </main>
    );
  }
  const items = list.data?.items ?? [];
  const total = items.reduce((a, p) => a + p.amount_kobo, 0);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <Link href="/studio">
          <Logo suffix="Finance" />
        </Link>
      </header>
      <h1 className="font-display text-3xl font-bold">Cash-outs</h1>
      <div role="tablist" className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={status === t}
            onClick={() => setStatus(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === t ? "bg-ink text-bg" : "bg-surface text-muted"}`}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>
      <ErrorText error={approve.error ?? reject.error ?? list.error} />
      <Card title={`${items.length} cash-outs · ${naira(total)}`}>
        {items.length === 0 ? (
          <Empty title="Nothing here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["Requested", "User", "Diamonds", "Amount", "Bank", ""].map((h) => (
                    <th key={h} className="px-2 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-[#22222B]">
                    <td className="px-2 py-3">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="px-2 py-3 font-mono text-xs">{p.user_id.slice(0, 8)}…</td>
                    <td className="px-2 py-3">{p.diamonds.toLocaleString()}</td>
                    <td className="px-2 py-3 font-bold">{naira(p.amount_kobo)}</td>
                    <td className="px-2 py-3">{p.bank_label || "—"}</td>
                    <td className="px-2 py-3 text-right">
                      {p.status === "pending_review" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            className="h-9 px-3"
                            busy={approve.isPending && approve.variables === p.id}
                            onClick={() => confirm(`Send ${naira(p.amount_kobo)} to ${p.bank_label}?`) && approve.mutate(p.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            kind="ghost"
                            className="h-9 px-3"
                            onClick={() => {
                              const reason = prompt("Reason (shown to the creator):");
                              if (reason) reject.mutate({ id: p.id, reason });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">{p.note}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
