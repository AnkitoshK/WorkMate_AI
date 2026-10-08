import ExcelJS from "exceljs";
import { Response } from "express";

export interface ServerExcelColumnDef {
  header: string;
  key: string;
  width?: number;
  alignment?: Partial<ExcelJS.Alignment>;
}

export interface ServerExcelExportOptions {
  res: Response;
  filename: string;
  sheetName?: string;
  columns: ServerExcelColumnDef[];
  data: Record<string, any>[];
  theme?: "emerald" | "indigo" | "navy" | "purple" | "blue";
  statusColumnKey?: string;
}

const THEME_HEADER_FILLS = {
  emerald: { argb: "FF065F46" }, // Deep Emerald (Attendance)
  indigo: { argb: "FF312E81" },  // Deep Indigo (Closed Archive)
  navy: { argb: "FF0F172A" },    // Slate/Navy (Tickets)
  purple: { argb: "FF581C87" },  // Royal Purple (Team/Users)
  blue: { argb: "FF1E40AF" },    // Classic Blue (Tasks)
};

export async function sendStyledExcelStream({
  res,
  filename,
  sheetName = "Sheet1",
  columns,
  data,
  theme = "blue",
  statusColumnKey,
}: ServerExcelExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WorkMate AI Enterprise";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  worksheet.columns = columns.map((col) => {
    let maxLen = col.header.length;
    data.forEach((row) => {
      const val = row[col.key];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        if (strVal.length > maxLen) {
          maxLen = Math.min(strVal.length, 60);
        }
      }
    });

    return {
      header: col.header,
      key: col.key,
      width: col.width || Math.max(maxLen + 4, 14),
    };
  });

  // Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  const primaryFillColor = THEME_HEADER_FILLS[theme] || THEME_HEADER_FILLS.blue;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: primaryFillColor,
    };
    cell.font = {
      name: "Segoe UI",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF475569" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      bottom: { style: "medium", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  });

  // Data rows
  data.forEach((rowData, index) => {
    const row = worksheet.addRow(rowData);
    row.height = 23;
    const isEven = index % 2 === 0;
    const zebraBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

    row.eachCell((cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      const isStatusCol = colDef && colDef.key === statusColumnKey;
      const cellValue = String(cell.value || "").toUpperCase();

      cell.font = {
        name: "Segoe UI",
        size: 10,
        color: { argb: "FF1E293B" },
      };
      cell.alignment = colDef?.alignment || {
        vertical: "middle",
        horizontal: typeof cell.value === "number" ? "right" : "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (isStatusCol) {
        if (
          cellValue.includes("ON_TIME") ||
          cellValue.includes("RESOLVED") ||
          cellValue.includes("CLOSED") ||
          cellValue.includes("COMPLETED") ||
          cellValue.includes("OPERATIONAL") ||
          cellValue.includes("DONE")
        ) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF166534" } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (
          cellValue.includes("LATE") ||
          cellValue.includes("URGENT") ||
          cellValue.includes("CRITICAL") ||
          cellValue.includes("OUTAGE") ||
          cellValue.includes("HALF_DAY") ||
          cellValue.includes("EARLY_LOGOUT")
        ) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF9F1239" } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (
          cellValue.includes("IN_PROGRESS") ||
          cellValue.includes("ASSIGNED") ||
          cellValue.includes("HIGH") ||
          cellValue.includes("DEGRADED") ||
          cellValue.includes("RE_ENTRY")
        ) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF92400E" } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
        }
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
      }
    });
  });

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}"`);

  await workbook.xlsx.write(res);
  res.end();
}
