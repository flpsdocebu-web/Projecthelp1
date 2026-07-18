import type { Metadata } from "next";
import "./globals.css";
import "./upload-modal.css";
import "./resource-admin.css";
import "./report-modal.css";
import "./typography-enhancements.css";
import "./home-stats.css";
import "./user-management.css";
import "./admin-loader.css";
import ResourceReset from "@/components/ResourceReset";

export const metadata: Metadata = {
  title: "Project HELPS | SDO Cebu Province",
  description: "Learning Activity Sheets for flexible, accessible learning.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ResourceReset/>{children}</body>
    </html>
  );
}
