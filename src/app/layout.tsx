import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { themeBootScript } from "@/components/Theme";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumo.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Lumo · Go live, post, get gifted", template: "%s · Lumo" },
  description: "Live streams, short videos and long-form Watch. Support creators with gifts.",
  openGraph: { siteName: "Lumo", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0C0F" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set before paint by the boot script, so React must not
    // complain that the server HTML lacked it.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
