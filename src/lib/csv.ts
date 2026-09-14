import Papa from "papaparse";

// Turkish Excel expects ';' as the field separator (',' is the decimal separator),
// and a UTF-8 BOM so accented characters render correctly on open.
export function csvResponse(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows, { delimiter: ";" });
  const body = "﻿" + csv;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
