import "server-only";

import ExcelJS from "exceljs";
import Papa from "papaparse";

const EMAIL_HEADERS = ["email", "e-mail", "e-posta", "eposta", "mail", "work email"];

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result != null) return String(value.result);
    return "";
  }
  return String(value);
}

// Reads the distinct, lower-cased e-mail addresses from an uploaded .xlsx or .csv. The address column is
// the one headed "email"/"e-posta"/…; without a recognisable header, the first column holding an "@".
export async function readEmails(file: File): Promise<string[]> {
  const rows: string[][] = [];
  const buffer = await file.arrayBuffer();

  if (/\.csv$/i.test(file.name)) {
    const parsed = Papa.parse<string[]>(new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, ""), {
      skipEmptyLines: true,
    });
    for (const row of parsed.data) rows.push(row.map((cell) => String(cell ?? "")));
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      for (let col = 1; col <= sheet.columnCount; col += 1) cells.push(cellText(row.getCell(col).value));
      rows.push(cells);
    });
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  let column = header.findIndex((cell) => EMAIL_HEADERS.includes(cell));
  let start = 1;
  if (column === -1) {
    column = rows[0].findIndex((cell) => cell.includes("@"));
    if (column === -1) return [];
    start = 0;
  }

  const emails = new Set<string>();
  for (const row of rows.slice(start)) {
    const email = (row[column] ?? "").trim().toLowerCase();
    if (email.includes("@")) emails.add(email);
  }
  return [...emails];
}
