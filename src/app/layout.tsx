import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumo.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Lumo · Go live, post, get gifted", template: "%s · Lumo" },
  description: "Live streams, short videos and long-form Watch. Support creators with gifts.",
  openGraph: { siteName: "Lumo", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0B0B0F", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
