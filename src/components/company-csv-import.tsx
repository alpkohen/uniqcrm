"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { importCompanies, type CompanyImportRow } from "@/actions/import";
import { Button } from "@/components/ui/button";

const ALIASES: Record<string, keyof CompanyImportRow> = {
  name: "name",
  firma: "name",
  "firma adı": "name",
  website: "website",
  web: "website",
  phone: "phone",
  telefon: "phone",
  city: "city",
  sehir: "city",
  şehir: "city",
  sector: "sector",
  sektor: "sector",
  sektör: "sector",
  notes: "notes",
  notlar: "notes",
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function CompanyCsvImport() {
  const [rows, setRows] = useState<CompanyImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const mapped = results.data.map((raw) => {
          const row: CompanyImportRow = {};
          for (const [key, value] of Object.entries(raw)) {
            const field = ALIASES[normalizeHeader(key)];
            if (field) row[field] = String(value ?? "").trim();
          }
          return row;
        });
        setRows(mapped);
      },
    });
  }

  async function runImport() {
    setBusy(true);
    try {
      const result = await importCompanies(rows);
      toast.success(`${result.created} firma eklendi, ${result.skipped} satır atlandı.`);
      if (result.errors.length) {
        toast.message(result.errors.slice(0, 4).join(" · "));
      }
      setRows([]);
      setFileName(null);
    } catch {
      toast.error("İçe aktarma başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-10 text-center">
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        <p className="font-medium">CSV dosyası seçin</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sütunlar: firma/name, website, telefon, sehir, sektor, notlar
        </p>
        {fileName ? <p className="mt-3 text-sm text-primary">{fileName}</p> : null}
      </label>

      {rows.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Firma</th>
                  <th className="px-3 py-2 font-medium">Sektör</th>
                  <th className="px-3 py-2 font-medium">Şehir</th>
                  <th className="px-3 py-2 font-medium">Website</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.sector}</td>
                    <td className="px-3 py-2">{row.city}</td>
                    <td className="px-3 py-2">{row.website}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            {rows.length} satır hazır. İlk 8 satır önizleniyor.
          </p>
          <Button onClick={runImport} disabled={busy}>
            {busy ? "Aktarılıyor…" : "Firmaları içe aktar"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
