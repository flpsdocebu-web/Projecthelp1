"use client";

import { useState } from "react";
import { normalizedDistrict } from "@/lib/district";

type ReportUser = {
  id: string;
  username: string;
  email: string;
  role: "administrator" | "school" | "student";
  name: string;
  district?: string;
  schoolName?: string;
  schoolId?: string;
  lrn?: string;
  suspended: boolean;
  online: boolean;
  createdAt?: string;
};

export default function ExportUsersExcel({ users }: { users: ReportUser[] }) {
  const [exporting, setExporting] = useState(false);

  async function exportReport() {
    setExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Project HELPS Website";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet("User Management Report", {
        pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
        views: [{ showGridLines: false, state: "frozen", ySplit: 15 }],
      });
      const lastColumn = "K";
      const merge = (row: number, value: string) => {
        sheet.mergeCells(`A${row}:${lastColumn}${row}`);
        const cell = sheet.getCell(`A${row}`);
        cell.value = value;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      };
      merge(5, "Republic of the Philippines");
      merge(6, "Department of Education");
      merge(7, "Region VII – Central Visayas");
      merge(8, "Schools Division of Cebu Province");
      merge(9, "IPHO Bldg, Sudlon, Lahug, Cebu City");
      merge(11, "PROJECT HELPS USER MANAGEMENT REPORT");
      merge(12, "Note: Generated data from Project Helps Website");
      sheet.getCell("A11").font = { name: "Bookman Old Style", size: 14, bold: true };
      sheet.getCell("A12").font = { name: "Bookman Old Style", size: 11, italic: true };
      [5, 6, 7, 8, 9].forEach((row) => { sheet.getCell(`A${row}`).font = { name: "Bookman Old Style", size: 11 }; });
      sheet.getRow(11).height = 24;
      sheet.getRow(12).height = 20;

      const headers = ["No.", "Account Type", "Name", "Username", "Email", "District", "School Name", "School ID / LRN", "Account Status", "Online Status", "Date and Time Created"];
      sheet.getRow(14).values = headers;
      sheet.getRow(14).height = 30;
      sheet.getRow(14).eachCell((cell) => {
        cell.font = { name: "Bookman Old Style", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6F50" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      const roleLabel = { administrator: "Division Personnel", school: "Teacher / School", student: "Student" } as const;
      users.forEach((user, index) => {
        const identifier = user.role === "student" ? user.lrn : user.schoolId;
        const created = user.createdAt ? new Date(user.createdAt) : null;
        const row = sheet.addRow([
          index + 1, roleLabel[user.role], user.name || "—", user.username, user.email,
          normalizedDistrict(user.district).label || "—", user.schoolName || "—", identifier || "—",
          user.suspended ? "Suspended" : "Active", user.online && !user.suspended ? "Online" : "Offline", created,
        ]);
        row.height = 24;
        row.eachCell((cell) => {
          cell.font = { name: "Bookman Old Style", size: 11 };
          cell.alignment = { vertical: "middle", wrapText: true };
          cell.border = { top: { style: "thin", color: { argb: "FFB7C9C0" } }, left: { style: "thin", color: { argb: "FFB7C9C0" } }, bottom: { style: "thin", color: { argb: "FFB7C9C0" } }, right: { style: "thin", color: { argb: "FFB7C9C0" } } };
        });
        if (created) row.getCell(11).numFmt = "mmm d, yyyy h:mm AM/PM";
      });
      sheet.autoFilter = { from: "A14", to: `${lastColumn}${Math.max(14, 14 + users.length)}` };
      sheet.columns = [
        { width: 7 }, { width: 19 }, { width: 27 }, { width: 20 }, { width: 30 }, { width: 22 },
        { width: 31 }, { width: 19 }, { width: 17 }, { width: 15 }, { width: 24 },
      ];
      sheet.pageSetup.printArea = `A1:${lastColumn}${Math.max(14, 14 + users.length)}`;
      sheet.headerFooter.oddFooter = "&CProject HELPS User Management Report&RPage &P of &N";
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Project-HELPS-User-Management-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExporting(false);
    }
  }

  return <button className="export-excel-button" type="button" onClick={exportReport} disabled={exporting || users.length === 0} aria-label="Export User Management report to Excel"><span aria-hidden="true">X</span>{exporting ? "Preparing report…" : "Export Excel"}</button>;
}
