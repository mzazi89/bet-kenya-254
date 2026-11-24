import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Bet Kenya 254 · Aviator & Sportsbook",
  description:
    "Play the Aviator-style crash game and a demo Kenyan sportsbook. Play-money credits only — no real wagering.",
};

export const viewport: Viewport = {
  themeColor: "#060b09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app-shell">
            <SiteHeader />
            <main className="page">
              <div className="container">{children}</div>
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
