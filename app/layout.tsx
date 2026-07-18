import type { Metadata } from "next";
import "./globals.css";
import "./upload-modal.css";
import "./resource-admin.css";
import "./report-modal.css";
import "./typography-enhancements.css";
import "./home-stats.css";
import "./user-management.css";
import "./admin-loader.css";
import "./deployment-fixes-v2.css";

export const metadata: Metadata = {
  title: "Project HELPS | SDO Cebu Province",
  description: "Learning Activity Sheets for flexible, accessible learning.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
