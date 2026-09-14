"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { importDeals, type DealImportRow } from "@/actions/import";
import { Button } from "@/components/ui/button";

const ALIASES: Record<string, keyof DealImportRow> = {
  title: "title",
  baslik: "title",
  başlık: "title",
  amount: "amount",
  tutar: "amount",
  company: "company",
  firma: "company",
  contact: "contact",
  kisi: "contact",
  kişi: "contact",
  stage: "stage",
  asama: "stage",
  aşama: "stage",
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function DealCsvImport() {
  const [rows, setRows] = useState<DealImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const mapped = results.data.map((raw) => {
          const row: DealImportRow = {};
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
      const result = await importDeals(rows);
      toast.success(`${result.created} fırsat eklendi, ${result.skipped} satır atlandı.`);
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
          Sütunlar: baslik/title, tutar, firma, kisi, asama (aşama adıyla eşleşmezse ilk aşamaya eklenir)
        </p>
        {fileName ? <p className="mt-3 text-sm text-primary">{fileName}</p> : null}
      </label>

      {rows.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Başlık</th>
                  <th className="px-3 py-2 font-medium">Tutar</th>
                  <th className="px-3 py-2 font-medium">Firma</th>
                  <th className="px-3 py-2 font-medium">Aşama</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2">{row.amount}</td>
                    <td className="px-3 py-2">{row.company}</td>
                    <td className="px-3 py-2">{row.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            {rows.length} satır hazır. İlk 8 satır önizleniyor.
          </p>
          <Button onClick={runImport} disabled={busy}>
            {busy ? "Aktarılıyor…" : "Fırsatları içe aktar"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
