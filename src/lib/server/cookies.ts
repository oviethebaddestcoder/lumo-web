import "server-only";
import { NextResponse } from "next/server";

/** A scratch response used to collect Set-Cookie values before the real response exists. */
export const cookieJar = () => new NextResponse(null);

export function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) to.cookies.set(c);
  return to;
}

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
