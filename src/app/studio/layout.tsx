import type { Metadata } from "next";
import { StudioShell } from "./StudioShell";

export const metadata: Metadata = { title: { default: "Creator Studio", template: "%s · Lumo Studio" }, robots: { index: false } };

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return <StudioShell>{children}</StudioShell>;
}
