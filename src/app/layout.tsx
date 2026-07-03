import type { Metadata } from "next";
import Link from "next/link";
import ResetButton from "@/components/ResetButton";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arogya Radar — Kalahandi District Health Command Centre",
  description:
    "AI-powered intake, outbreak early-warning and medicine redistribution for PHCs and CHCs. Built for Build with AI: Code for Communities, Track 3 Smart Health.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">⌖</span>
              <span>
                <span className="brand-name">Arogya Radar</span>
                <span className="brand-sub">Kalahandi District Health Command Centre · Odisha</span>
              </span>
            </Link>
            <nav className="site-nav">
              <Link href="/">Command centre</Link>
              <Link href="/intake">Submit report</Link>
              <Link href="/register-template">Register template</Link>
            </nav>
          </div>
        </header>
        <main className="shell">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <span>
              Prototype for <strong>Build with AI: Code for Communities</strong> — Track 3 Smart
              Health. Facility activity is synthetic, calibrated on HMIS/IDSP public data; see
              README for data provenance.
            </span>
            <ResetButton className="btn sm secondary no-print" />
          </div>
        </footer>
      </body>
    </html>
  );
}
