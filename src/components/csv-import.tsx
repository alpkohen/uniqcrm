"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { importContacts, type ImportRow } from "@/actions/import";
import { Button } from "@/components/ui/button";

const ALIASES: Record<string, keyof ImportRow> = {
  firstname: "firstName",
  first_name: "firstName",
  ad: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  soyad: "lastName",
  email: "email",
  eposta: "email",
  "e-posta": "email",
  phone: "phone",
  telefon: "phone",
  title: "title",
  unvan: "title",
  company: "company",
  firma: "company",
  city: "city",
  sehir: "city",
  şehir: "city",
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

export function CsvImport() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const mapped = results.data.map((raw) => {
          const row: ImportRow = {};
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
      const result = await importContacts(rows);
      toast.success(`${result.created} kişi eklendi, ${result.skipped} satır atlandı.`);
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
          Sütunlar: ad/firstName, soyad/lastName, eposta, telefon, unvan, firma, sehir
        </p>
        {fileName ? <p className="mt-3 text-sm text-primary">{fileName}</p> : null}
      </label>

      {rows.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Ad</th>
                  <th className="px-3 py-2 font-medium">Soyad</th>
                  <th className="px-3 py-2 font-medium">E-posta</th>
                  <th className="px-3 py-2 font-medium">Firma</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.firstName}</td>
                    <td className="px-3 py-2">{row.lastName}</td>
                    <td className="px-3 py-2">{row.email}</td>
                    <td className="px-3 py-2">{row.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            {rows.length} satır hazır. İlk 8 satır önizleniyor.
          </p>
          <Button onClick={runImport} disabled={busy}>
            {busy ? "Aktarılıyor…" : "Kişileri içe aktar"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
