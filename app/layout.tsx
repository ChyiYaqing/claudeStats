import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Vendored Lora woff2 (app/fonts) so builds never fetch from Google. Unlike
// system Georgia, Lora defaults to lining figures, so digits sit level with
// all-caps labels.
const serif = localFont({
  src: "./fonts/lora-latin.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Claude Console",
  description: "Claude Code usage + system telemetry — an e-ink desktop companion.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable}>
      <body>{children}</body>
    </html>
  );
}
