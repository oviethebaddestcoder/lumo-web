"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field } from "@/components/ui";
import { api } from "@/lib/client/api";

export function BirthdayForm() {
  const router = useRouter();
  const n = useSearchParams().get("next");
  const next = n && n.startsWith("/") && !n.startsWith("//") ? n : "/studio";
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-line bg-surface p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api.updateMe({ birth_date: date });
          router.replace(next);
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="font-display text-2xl font-bold">When&apos;s your birthday?</h1>
      <p className="text-sm text-muted">It isn&apos;t shown on your profile. Gifting and some live features are for 18+.</p>
      <Field label="Date of birth" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
      <ErrorText error={error} />
      <Button type="submit" busy={busy} disabled={!date}>
        Continue
      </Button>
    </form>
  );
}
