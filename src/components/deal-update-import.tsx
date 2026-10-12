"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  updateDealsFromCsv,
  type DealUpdateResult,
  type DealUpdateRow,
} from "@/actions/deal-update-import";
import { Button } from "@/components/ui/button";

// Nimble "deals" export headers -> row keys.
const ALIASES: Record<string, keyof DealUpdateRow> = {
  "deal name": "title",
  amount: "amount",
  stage: "stage",
  "deal status": "status",
  "lost reason": "lostReason",
  "closed date": "closedDate",
  "date created": "createdDate",
  "related nimble contact 1": "contact",
};

function normalizeHeader(header: string) {
  return header.replace(/^﻿/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function DealUpdateImport() {
  const [rows, setRows] = useState<DealUpdateRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<DealUpdateResult | null>(null);
  const [createMissing, setCreateMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<DealUpdateResult | null>(null);

  function onFile(file: File) {
    setFileName(file.name);
    setPreview(null);
    setDone(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const mapped = results.data.map((raw) => {
          const row: DealUpdateRow = {};
          for (const [key, value] of Object.entries(raw)) {
            const field = ALIASES[normalizeHeader(key)];
            if (field) row[field] = String(value ?? "").trim();
          }
          return row;
        });
        setRows(mapped);
        setBusy(true);
        updateDealsFromCsv(mapped, { apply: false, createMissing: false })
          .then(setPreview)
          .catch(() => toast.error("Önizleme alınamadı."))
          .finally(() => setBusy(false));
      },
    });
  }

  async function apply() {
    setBusy(true);
    try {
      const result = await updateDealsFromCsv(rows, { apply: true, createMissing });
      setDone(result);
      toast.success(
        `${result.matched} fırsat eşleşti, ${result.created} yeni fırsat eklendi.`,
      );
      if (result.createdErrors.length) toast.message(result.createdErrors.slice(0, 4).join(" · "));
    } catch {
      toast.error("Güncelleme başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  const shown = done ?? preview;

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="mb-3 text-sm text-muted-foreground">
        Nimble fırsat dışa aktarımını (CSV) yükleyin. Mevcut fırsatlar <strong>başlığa göre eşleşir</strong>;
        kayıp nedeni, kapanış tarihi ve oluşturulma tarihi işlenir. Bağlantılar, dosyalar, aşama ve tutarlar
        değişmez (tutar yalnızca 0 ise doldurulur).
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

      {fileName && busy && !shown ? (
        <p className="mt-3 text-sm text-muted-foreground">Dosya inceleniyor…</p>
      ) : null}

      {shown ? (
        <div className="mt-4 grid gap-3 text-sm">
          <p className="font-medium">
            {done ? "Güncelleme tamamlandı" : "Önizleme — henüz hiçbir şey değişmedi"}
            <span className="ml-2 font-normal text-muted-foreground">{fileName}</span>
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">CSV satırı</dt>
              <dd className="font-medium tabular-nums">{shown.total}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mevcut fırsatla eşleşen</dt>
              <dd className="font-medium tabular-nums">{shown.matched}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Eşleşmeyen</dt>
              <dd className="font-medium tabular-nums">{shown.unmatchedCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Kayıp nedeni yazılacak</dt>
              <dd className="font-medium tabular-nums">{shown.willSetReason}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Kapanış tarihi yazılacak</dt>
              <dd className="font-medium tabular-nums">{shown.willSetClosed}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Oluşturulma tarihi yazılacak</dt>
              <dd className="font-medium tabular-nums">{shown.willSetCreated}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tutarı 0 iken doldurulacak</dt>
              <dd className="font-medium tabular-nums">{shown.willSetAmount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Durumu CSV’den farklı olan</dt>
              <dd className="font-medium tabular-nums">{shown.statusDiffers}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Kayıp ama nedeni boş kalacak</dt>
              <dd className="font-medium tabular-nums">{shown.lostStillWithoutReason}</dd>
            </div>
          </dl>

          {shown.ambiguous > 0 ? (
            <p className="text-xs text-muted-foreground">
              {shown.ambiguous} satır aynı başlıklı birden çok fırsatla eşleştiği için atlandı.
            </p>
          ) : null}

          {shown.unmatchedCount > 0 ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="mb-1 font-medium">CRM’de bulunamayan fırsatlar:</p>
              <p className="text-muted-foreground">
                {shown.unmatched.join(" · ")}
                {shown.unmatchedCount > shown.unmatched.length
                  ? ` … +${shown.unmatchedCount - shown.unmatched.length}`
                  : ""}
              </p>
            </div>
          ) : null}

          {done ? (
            <p className="text-xs text-muted-foreground">
              {done.created} yeni fırsat eklendi
              {done.createdErrors.length ? `, ${done.createdErrors.length} eklenemedi` : ""}.
            </p>
          ) : (
            <>
              {shown.unmatchedCount > 0 ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createMissing}
                    onChange={(event) => setCreateMissing(event.target.checked)}
                  />
                  Eşleşmeyen {shown.unmatchedCount} fırsatı yeni fırsat olarak ekle
                </label>
              ) : null}
              <div>
                <Button type="button" onClick={apply} disabled={busy}>
                  {busy ? "Uygulanıyor…" : "Uygula"}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
