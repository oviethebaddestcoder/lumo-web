"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/client/api";

function CopyRow({ id, label, value, secret }: { id: string; label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          readOnly
          type={secret ? "password" : "text"}
          value={value}
          className="h-10 min-w-0 flex-auto rounded-xl border border-line bg-bg px-3 font-mono text-[13px]"
        />
        <button
          className="h-10 rounded-xl bg-line px-3.5 text-[13px] font-semibold"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </>
  );
}

/** RTMP server + stream key for OBS, with reset. */
export function StreamKey() {
  const qc = useQueryClient();
  const key = useQuery({ queryKey: ["streamKey"], queryFn: api.live.streamKey });
  const rotate = useMutation({ mutationFn: api.live.rotateKey, onSuccess: (k) => qc.setQueryData(["streamKey"], k) });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-relaxed text-muted">Paste these into your encoder. Your phone stays free for chat.</p>
      {key.data ? (
        <>
          <CopyRow id="rtmp" label="Server URL" value={key.data.rtmp_url} />
          <CopyRow id="skey" label="Stream key" value={key.data.stream_key} secret />
          <button
            className="self-start text-[13px] font-semibold text-danger"
            disabled={rotate.isPending}
            onClick={() => confirm("Reset your stream key? Your encoder will stop working until you paste the new key.") && rotate.mutate()}
          >
            {rotate.isPending ? "Resetting…" : "Reset key"}
          </button>
        </>
      ) : key.isError ? (
        <p className="text-sm text-danger">{(key.error as Error).message}</p>
      ) : (
        <div className="h-24 animate-pulse rounded-xl bg-surface2" />
      )}
    </div>
  );
}
