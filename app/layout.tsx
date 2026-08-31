import type { Metadata, Viewport } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";
import "./upload-modal.css";
import "./resource-admin.css";
import "./resource-term-admin.css";
import "./report-modal.css";
import "./typography-enhancements.css";
import "./home-stats.css";
import "./user-management.css";
import "./admin-loader.css";
import "./activity-report.css";
import "./account-greeting.css";

export const metadata: Metadata = {
  title: "Project HELPS | SDO Cebu Province",
  description: "Learning Activity Sheets for flexible, accessible learning.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/project-helps-logo.png", type: "image/png" }],
    shortcut: "/project-helps-logo.png",
    apple: "/project-helps-logo.png",
  },
};

export const viewport: Viewport = { themeColor: "#087d91" };

// Hostinger must render HTML from the active build so it never points to
// stylesheet chunks that belonged to an older deployment.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const embeddedStyles = readFileSync(
  join(process.cwd(), "public", "project-helps-v8.css"),
  "utf8",
);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/project-helps-v8.css" as="style" />
        <link rel="stylesheet" href="/project-helps-v8.css" />
        <style
          data-project-helps-styles="embedded"
          dangerouslySetInnerHTML={{ __html: embeddedStyles }}
        />
      </head>
      <body><div className="site-page-shell">{children}<SiteFooter /></div></body>
    </html>
  );
}
