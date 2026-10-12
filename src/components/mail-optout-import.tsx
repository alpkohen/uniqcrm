"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { markMailOptOut, type MailOptOutResult, type MailOptOutRow } from "@/actions/mail-optout-import";
import { Button } from "@/components/ui/button";

// Nimble headers are lowercase and some carry a combining dot ("i̇"); fold to plain ASCII-ish.
function fold(text: string) {
  return text
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/̇/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

const EMAIL_COLUMNS = ["work email", "other email 1", "other email 2", "other email 3", "other email 4"];
const TRUTHY = new Set(["true", "evet", "yes", "1", "x"]);

export function MailOptOutImport() {
  const [rows, setRows] = useState<MailOptOutRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<MailOptOutResult | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setProblem(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(parsed) {
        const headers = parsed.meta.fields ?? [];
        const flagHeader = headers.find((header) => fold(header).startsWith("mail almak"));
        if (!flagHeader) {
          setRows([]);
          setProblem("Dosyada “mail almak istemiyor” sütunu bulunamadı.");
          return;
        }
        const byFolded = new Map(headers.map((header) => [fold(header), header]));
        const nameHeader = (name: string) => byFolded.get(name);

        const flagged: MailOptOutRow[] = [];
        for (const raw of parsed.data) {
          if (!TRUTHY.has(fold(String(raw[flagHeader] ?? "")))) continue;
          const emails = EMAIL_COLUMNS.map((column) => {
            const header = nameHeader(column);
            return header ? String(raw[header] ?? "").trim() : "";
          }).filter(Boolean);
          flagged.push({
            firstName: String(raw[nameHeader("first name") ?? ""] ?? "").trim(),
            lastName: String(raw[nameHeader("last name") ?? ""] ?? "").trim(),
            emails,
          });
        }
        setRows(flagged);
        setBusy(true);
        markMailOptOut(flagged, { apply: false })
          .then(setResult)
          .catch(() => toast.error("Önizleme alınamadı."))
          .finally(() => setBusy(false));
      },
    });
  }

  async function apply() {
    setBusy(true);
    try {
      const done = await markMailOptOut(rows, { apply: true });
      setResult(done);
      toast.success(`${done.marked} kişi “Mail almak istemiyor: Evet” olarak işaretlendi.`);
    } catch {
      toast.error("İşaretleme başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="mb-3 text-sm text-muted-foreground">
        Nimble kişi dışa aktarımını (CSV) yükleyin. “Mail almak istemiyor” işaretli kişiler CRM’de
        <strong> Mail almak istemiyor = Evet</strong> olarak işaretlenir. Kişiler e-postaya, bulunamazsa ad-soyada göre
        eşleşir; başka hiçbir alan değişmez.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
        className="field-input h-9"
      />

      {problem ? <p className="mt-3 text-sm text-destructive">{problem}</p> : null}
      {fileName && busy && !result ? <p className="mt-3 text-sm text-muted-foreground">Dosya inceleniyor…</p> : null}

      {result ? (
        <div className="mt-4 grid gap-3 text-sm">
          <p className="font-medium">
            {result.applied ? "İşaretleme tamamlandı" : "Önizleme — henüz hiçbir şey değişmedi"}
            <span className="ml-2 font-normal text-muted-foreground">{fileName}</span>
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">CSV’de işaretli</dt>
              <dd className="font-medium tabular-nums">{result.total}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-postaya göre eşleşen</dt>
              <dd className="font-medium tabular-nums">{result.matchedByEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ad-soyada göre eşleşen</dt>
              <dd className="font-medium tabular-nums">{result.matchedByName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{result.applied ? "İşaretlenen" : "İşaretlenecek"}</dt>
              <dd className="font-medium tabular-nums">{result.applied ? result.marked : result.willMark}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Zaten işaretli</dt>
              <dd className="font-medium tabular-nums">{result.alreadyMarked}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Bulunamayan / belirsiz</dt>
              <dd className="font-medium tabular-nums">{result.unmatched.length + result.ambiguous.length}</dd>
            </div>
          </dl>

          {result.fieldWillBeCreated && !result.applied ? (
            <p className="text-xs text-muted-foreground">
              “Mail almak istemiyor” alanı henüz yok; uygulayınca Evet/Hayır alanı olarak otomatik oluşturulur.
            </p>
          ) : null}

          {result.unmatched.length > 0 ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="mb-1 font-medium">CRM’de bulunamayan kişiler:</p>
              <p className="text-muted-foreground">{result.unmatched.slice(0, 20).join(" · ")}</p>
            </div>
          ) : null}
          {result.ambiguous.length > 0 ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="mb-1 font-medium">Aynı ada sahip birden çok kişi olduğu için atlananlar:</p>
              <p className="text-muted-foreground">{result.ambiguous.slice(0, 20).join(" · ")}</p>
            </div>
          ) : null}

          {!result.applied ? (
            <div>
              <Button type="button" onClick={apply} disabled={busy || result.willMark === 0}>
                {busy ? "Uygulanıyor…" : `${result.willMark} kişiyi işaretle`}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
