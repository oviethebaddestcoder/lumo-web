"use client";

import { useEffect, useRef } from "react";

/** HLS playback: native on Safari, hls.js elsewhere. */
export function HlsPlayer({ src, poster, portrait }: { src: string; poster?: string; portrait?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
      return;
    }
    let destroy = () => {};
    void import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) {
        v.src = src;
        return;
      }
      const hls = new Hls({ capLevelToPlayerSize: true });
      hls.loadSource(src);
      hls.attachMedia(v);
      destroy = () => hls.destroy();
    });
    return () => destroy();
  }, [src]);
  return (
    <video
      ref={ref}
      poster={poster}
      controls
      playsInline
      className={`w-full rounded-2xl bg-black ${portrait ? "mx-auto aspect-[9/16] max-h-[80vh] w-auto" : "aspect-video"}`}
    />
  );
}
