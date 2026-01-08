"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  EmployeeHoursSummary,
  DailyHours,
  VerificationMethod,
} from "@/types/time-clock";
import { formatHoursDecimal, formatDate, formatTime, getDayOfWeek } from "./hours-calculator";

interface ReportOptions {
  startDate: string;
  endDate: string;
  companyName?: string;
}

/**
 * Generate a summary payroll report PDF
 * Shows: Employee, daily hours for each day, weekly total
 */
export function generateSummaryReport(
  summaries: EmployeeHoursSummary[],
  options: ReportOptions
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.text("Payroll Summary Report", pageWidth / 2, 20, { align: "center" });

  // Subtitle with date range
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(
    `Period: ${formatDate(options.startDate)} - ${formatDate(options.endDate)}`,
    pageWidth / 2,
    28,
    { align: "center" }
  );

  if (options.companyName) {
    doc.text(options.companyName, pageWidth / 2, 35, { align: "center" });
  }

  doc.setTextColor(0);

  // Get all unique dates across all employees
  const allDates = new Set<string>();
  summaries.forEach((summary) => {
    summary.dailyHours.forEach((day) => {
      allDates.add(day.date);
    });
  });
  const sortedDates = Array.from(allDates).sort();

  // Table headers
  const headers = ["Employee", ...sortedDates.map((d) => getDayOfWeek(d)), "Total"];

  // Table rows
  const rows = summaries.map((summary) => {
    const row = [`${summary.firstName} ${summary.lastName}`];

    // Add hours for each date
    sortedDates.forEach((date) => {
      const dayData = summary.dailyHours.find((d) => d.date === date);
      row.push(dayData ? formatHoursDecimal(dayData.totalHours) : "-");
    });

    // Add total
    row.push(formatHoursDecimal(summary.weeklyTotal));

    return row;
  });

  // Add totals row
  const totalsRow = ["TOTAL"];
  sortedDates.forEach((date) => {
    const dayTotal = summaries.reduce((sum, s) => {
      const dayData = s.dailyHours.find((d) => d.date === date);
      return sum + (dayData?.totalHours || 0);
    }, 0);
    totalsRow.push(formatHoursDecimal(dayTotal));
  });
  const grandTotal = summaries.reduce((sum, s) => sum + s.weeklyTotal, 0);
  totalsRow.push(formatHoursDecimal(grandTotal));
  rows.push(totalsRow);

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 45,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    // Style the totals row
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 220, 220];
      }
    },
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    footerY
  );
  doc.text(
    `Page 1 of 1`,
    pageWidth - 14,
    footerY,
    { align: "right" }
  );

  return doc;
}

/**
 * Generate a detailed payroll report PDF
 * Shows: All punches per employee with times, verification status, daily/weekly totals
 */
export function generateDetailedReport(
  summaries: EmployeeHoursSummary[],
  options: ReportOptions
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.text("Detailed Payroll Report", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 8;

  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(
    `Period: ${formatDate(options.startDate)} - ${formatDate(options.endDate)}`,
    pageWidth / 2,
    yPosition,
    { align: "center" }
  );
  yPosition += 15;

  doc.setTextColor(0);

  // Process each employee
  summaries.forEach((summary, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Employee header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${summary.firstName} ${summary.lastName} (${summary.employeeId})`,
      14,
      yPosition
    );
    yPosition += 7;

    // Employee stats
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(
      `Total Hours: ${formatHoursDecimal(summary.weeklyTotal)} | Unverified: ${summary.unverifiedCount} | Manual: ${summary.manualCount}`,
      14,
      yPosition
    );
    yPosition += 5;
    doc.setTextColor(0);

    // Punches table for this employee
    const punchRows: string[][] = [];

    summary.dailyHours.forEach((day) => {
      day.pairs.forEach((pair) => {
        punchRows.push([
          formatDate(day.date),
          formatTime(pair.clockIn.punchTime),
          pair.clockOut ? formatTime(pair.clockOut.punchTime) : "Missing",
          pair.hours ? formatHoursDecimal(pair.hours) : "-",
          getVerificationLabel(pair.clockIn.verificationMethod, pair.clockIn.isManual),
          pair.clockIn.manualNote || "-",
        ]);
      });

      // Daily subtotal row
      punchRows.push([
        "",
        "",
        "Day Total:",
        formatHoursDecimal(day.totalHours),
        "",
        "",
      ]);
    });

    autoTable(doc, {
      head: [["Date", "In", "Out", "Hours", "Status", "Note"]],
      body: punchRows,
      startY: yPosition,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 },
        5: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        // Style subtotal rows
        if (data.row.raw && (data.row.raw as string[])[2] === "Day Total:") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    // Get the final Y position after the table
    yPosition = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPosition;
    yPosition += 10;

    // Add separator between employees
    if (index < summaries.length - 1) {
      doc.setDrawColor(200);
      doc.line(14, yPosition - 5, pageWidth - 14, yPosition - 5);
    }
  });

  // Add page numbers
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      footerY
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      footerY,
      { align: "right" }
    );
  }

  return doc;
}

/**
 * Get a human-readable verification label
 */
function getVerificationLabel(method: string, isManual: boolean): string {
  if (isManual) return "Manual";
  if (method === VerificationMethod.FACE_VERIFIED) return "Verified";
  return "PIN";
}

/**
 * Download the PDF
 */
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}
