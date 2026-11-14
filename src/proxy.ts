import { NextResponse, type NextRequest } from "next/server";

/** /@handle → /u/handle (the app shares profile links as lumo.app/@handle). */
export function proxy(req: NextRequest) {
  const m = /^\/@([A-Za-z0-9._]{2,30})\/?$/.exec(req.nextUrl.pathname);
  if (!m) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/u/${m[1]}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/@:path*"] };
