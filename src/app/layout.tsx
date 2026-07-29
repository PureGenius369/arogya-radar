import type { Metadata } from "next";
import Link from "next/link";
import ResetButton from "@/components/ResetButton";
import Logo from "@/components/Logo";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const DESCRIPTION =
  "AI-powered early warning for disease outbreaks, heat waves and medicine shortages across Gujarat's PHCs and CHCs. Live pilot: Dahod, covering all 33 districts.";

export const metadata: Metadata = {
  metadataBase: new URL("https://arogya-radar-117722238113.asia-south1.run.app"),
  title: "Arogya Radar — Gujarat State Health Radar",
  description: DESCRIPTION,
  openGraph: {
    title: "Arogya Radar — Gujarat State Health Radar",
    description: DESCRIPTION,
    url: "/",
    siteName: "Arogya Radar",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Arogya Radar — Gujarat state health radar" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arogya Radar — Gujarat State Health Radar",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="brand">
              <Logo size={40} />
              <span>
                <span className="brand-name">Arogya Radar</span>
                <span className="brand-sub">Gujarat State Health Radar · pilot: Dahod</span>
              </span>
            </Link>
            <nav className="site-nav">
              <Link href="/">State radar</Link>
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
