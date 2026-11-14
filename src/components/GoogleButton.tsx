"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type GsiResponse = { credential?: string };
type Gsi = {
  accounts: {
    id: {
      initialize(o: { client_id: string; callback: (r: GsiResponse) => void; ux_mode?: string; use_fedcm_for_prompt?: boolean }): void;
      renderButton(el: HTMLElement, o: Record<string, unknown>): void;
    };
  };
};

/** "Sign in with Google" via Google Identity Services; hands back an ID token. */
export function GoogleButton({ onToken }: { onToken: (idToken: string) => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const el = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const g = (window as unknown as { google?: Gsi }).google;
    if (!loaded || !g || !el.current || !clientId) return;
    g.accounts.id.initialize({ client_id: clientId, callback: (r) => r.credential && cb.current(r.credential), use_fedcm_for_prompt: true });
    g.accounts.id.renderButton(el.current, { theme: "filled_black", size: "large", shape: "pill", width: 320, text: "continue_with" });
  }, [loaded, clientId]);

  if (!clientId) return null;
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setLoaded(true)} />
      <div ref={el} className="flex min-h-11 justify-center" />
    </>
  );
}
