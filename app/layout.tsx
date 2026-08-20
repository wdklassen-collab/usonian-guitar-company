import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Usonian Guitar Co. | Tools for Guitar Builders",
  description: "Practical jigs, templates, and digital tools for acoustic-guitar builders, made by Usonian Guitar Co. in Colorado.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
