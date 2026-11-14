import type { Metadata } from "next";
import { Suspense } from "react";
import { WebWallet } from "./WebWallet";

export const metadata: Metadata = { title: "Buy coins" };

export default function WalletPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Suspense>
        <WebWallet />
      </Suspense>
    </main>
  );
}
