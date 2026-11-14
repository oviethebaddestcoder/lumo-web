"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StreamKey } from "@/components/StreamKey";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { api, type HostRoom } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { compact, duration } from "@/lib/format";
import type { LiveCategory } from "@/lib/types";
import { LivesTable } from "../LivesTable";

export default function LivePage() {
  const me = useMe();
  const qc = useQueryClient();
  const rooms = useQuery({ queryKey: ["myRooms", "current"], queryFn: () => api.live.myRooms(), refetchInterval: 10_000 });
  const current: HostRoom | undefined = rooms.data?.items.find((r) => r.status === "live");
  const room = useQuery({ queryKey: ["room", current?.id], queryFn: () => api.live.room(current!.id), enabled: !!current, refetchInterval: 5000 });
  const cats = useQuery({ queryKey: ["categories"], queryFn: api.live.categories, staleTime: Infinity });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LiveCategory>("talk");
  const [allowPk, setAllowPk] = useState(true);
  const [allowGifts, setAllowGifts] = useState(true);
  const [replay, setReplay] = useState(true);
  const [goal, setGoal] = useState("");
  const [goalLabel, setGoalLabel] = useState("");
  const adult = !!me.data?.adult;

  const start = useMutation({
    mutationFn: () =>
      api.live.create({
        title: title.trim() || `${me.data?.display_name ?? "My"} LIVE`,
        category,
        source: "rtmp",
        allow_pk: allowPk,
        allow_gifts: allowGifts && adult,
        save_replay: replay,
        goal_coins: Math.max(0, parseInt(goal, 10) || 0),
        goal_label: goalLabel.trim(),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["myRooms"] }),
  });
  const end = useMutation({
    mutationFn: (id: string) => api.live.end(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["myRooms"] }),
  });

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Live</h1>
      <div className="flex flex-wrap gap-4">
        {current ? (
          <Card title="You're live" className="flex-[2_1_420px]" action={<span className="rounded bg-live px-2 py-0.5 text-xs font-bold">LIVE</span>}>
            <p className="text-lg font-semibold">{current.title}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted">Watching now</p>
                <p className="font-display text-2xl font-bold">{compact(room.data?.viewers ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted">Gift coins</p>
                <p className="font-display text-2xl font-bold text-coin">{compact(room.data?.gift_coins ?? current.gift_coins)}</p>
              </div>
              <div>
                <p className="text-muted">Live for</p>
                <p className="font-display text-2xl font-bold">{duration(current.duration_sec)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              Viewers see your stream as soon as your encoder connects. Chat and gifts are on your phone in the Lumo app.
            </p>
            <Button kind="ghost" className="mt-4" busy={end.isPending} onClick={() => confirm("End this LIVE?") && end.mutate(current.id)}>
              End LIVE
            </Button>
          </Card>
        ) : (
          <Card title="Go live with OBS" className="flex-[2_1_420px]">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                start.mutate();
              }}
            >
              <Field label="Title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="What's happening?" />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-xs font-semibold text-muted">Category</legend>
                <div className="flex flex-wrap gap-2">
                  {(cats.data?.items ?? ["talk"]).map((c) => (
                    <button
                      type="button"
                      key={c}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium capitalize ${category === c ? "border-ink bg-ink text-bg" : "border-line bg-bg text-muted-strong"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-col gap-2 text-sm">
                <Toggle label="PK battles" hint="Other hosts can invite you" checked={allowPk} onChange={setAllowPk} />
                <Toggle label="Gifts" hint={adult ? "Viewers can send gifts" : "Available at 18+"} checked={allowGifts && adult} onChange={setAllowGifts} disabled={!adult} />
                <Toggle label="Save replay" hint="Keep a recording on your profile" checked={replay} onChange={setReplay} />
              </div>
              <div className="grid grid-cols-[1fr_1.6fr] gap-3">
                <Field label="Coin goal" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ""))} placeholder="0" />
                <Field label="Goal label" value={goalLabel} maxLength={40} onChange={(e) => setGoalLabel(e.target.value)} placeholder="New mic" />
              </div>
              <ErrorText error={start.error} />
              <Button type="submit" busy={start.isPending} className="self-start">
                Start LIVE
              </Button>
            </form>
          </Card>
        )}
        <Card title="Encoder settings" className="flex-[1_1_300px]">
          <StreamKey />
          <p className="mt-4 text-xs leading-relaxed text-muted">Recommended: 1080p or 720p, 30 fps, 2,500–4,500 kbps, keyframe every 2 s.</p>
        </Card>
      </div>
      <Card title="All lives">
        <LivesTable />
      </Card>
    </>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-xl bg-bg px-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 accent-[#D61F52]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
