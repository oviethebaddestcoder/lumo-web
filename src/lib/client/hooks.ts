"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, ApiError } from "./api";

/** The signed-in user; sends signed-out visitors to /login and back. */
export function useMe({ required = true } = {}) {
  const router = useRouter();
  const path = usePathname();
  const q = useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 60_000, retry: false });
  const unauth = q.error instanceof ApiError && q.error.status === 401;
  useEffect(() => {
    if (required && unauth) router.replace(`/login?next=${encodeURIComponent(path)}`);
    if (required && q.data && !q.data.birth_date) router.replace(`/birthday?next=${encodeURIComponent(path)}`);
  }, [required, unauth, q.data, router, path]);
  return q;
}

export const newKey = () => crypto.randomUUID();
