import "server-only";
import { cacheLife } from "next/cache";
import { gateway } from "./gateway";
import type { UserPublic, Video } from "@/lib/types";

/** Public, anonymous reads for share pages. Cached briefly on the server. */
export async function getVideo(id: string): Promise<Video | null> {
  "use cache";
  cacheLife("minutes");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await gateway(`/v1/media/videos/${id}`);
  if (!r.ok) return null;
  const v = (await r.json()) as Video;
  return v.visibility === "public" && v.status !== "removed" ? v : null;
}

export async function getUser(id: string): Promise<UserPublic | null> {
  "use cache";
  cacheLife("minutes");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await gateway(`/v1/users/${id}`);
  return r.ok ? ((await r.json()) as UserPublic) : null;
}

export async function getUserByHandle(handle: string): Promise<UserPublic | null> {
  "use cache";
  cacheLife("minutes");
  if (!/^[a-z0-9._]{2,30}$/i.test(handle)) return null;
  const r = await gateway(`/v1/users/by-handle/${encodeURIComponent(handle.toLowerCase())}`);
  return r.ok ? ((await r.json()) as UserPublic) : null;
}

export async function getCounts(id: string): Promise<{ followers: number; following: number; likes_received: number } | null> {
  "use cache";
  cacheLife("minutes");
  const r = await gateway(`/v1/social/users/${id}/counts`);
  return r.ok ? await r.json() : null;
}

export async function getUserVideos(id: string): Promise<Video[]> {
  "use cache";
  cacheLife("minutes");
  const r = await gateway(`/v1/media/users/${id}/videos?limit=30`);
  if (!r.ok) return [];
  const page = (await r.json()) as { items: Video[] };
  return page.items.filter((v) => v.status === "ready" && v.visibility === "public");
}
