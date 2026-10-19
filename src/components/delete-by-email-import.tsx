"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  backupDeleteByEmail,
  deleteContactsByEmail,
  previewDeleteByEmail,
  type DeleteByEmailPreview,
} from "@/actions/delete-by-email";
import { Button } from "@/components/ui/button";

function download(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DeleteByEmailImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DeleteByEmailPreview | null>(null);
  const [backedUp, setBackedUp] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleted, setDeleted] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function formFor(selected: File) {
    const data = new FormData();
    data.set("file", selected);
    return data;
  }

  async function onFile(selected: File | null) {
    setFile(selected);
    setPreview(null);
    setBackedUp(false);
    setConfirm("");
    setDeleted(null);
    if (!selected) return;
    setBusy(true);
    try {
      const result = await previewDeleteByEmail(formFor(selected));
      setPreview(result);
      if (result.error) toast.error(result.error);
    } catch {
      toast.error("Önizleme alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function backup() {
    if (!file) return;
    setBusy(true);
    try {
      const result = await backupDeleteByEmail(formFor(file));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      download(result.filename, result.base64);
      setBackedUp(true);
      toast.success("Yedek indirildi.");
    } catch {
      toast.error("Yedek alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!file || !preview) return;
    setBusy(true);
    try {
      const data = formFor(file);
      data.set("confirm", confirm);
      data.set("expected", String(preview.matched));
      data.set("backup", backedUp ? "1" : "");
      const result = await deleteContactsByEmail(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDeleted(result.deleted);
      toast.success(`${result.deleted} kişi silindi.`);
    } catch {
      toast.error("Silme başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  const canDelete = Boolean(preview && !preview.error && preview.matched > 0 && backedUp && confirm.trim().toLocaleLowerCase("tr") === "sil");

  return (
    <div className="rounded-xl border border-destructive/40 bg-card p-5">
      <p className="mb-3 text-sm text-muted-foreground">
        E-posta listesi içeren bir Excel (.xlsx) ya da CSV yükleyin. Listedeki adreslerle <strong>birebir aynı</strong>{" "}
        e-postaya sahip kişiler silinir. <strong>Bu işlem geri alınamaz.</strong> Önce önizleme gösterilir, silmeden
        önce yedek indirmeniz gerekir.
      </p>
      <input
        type="file"
        accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
        className="field-input h-9"
      />

      {file && !preview && busy ? <p className="mt-3 text-sm text-muted-foreground">Dosya inceleniyor…</p> : null}
      {preview?.error ? <p className="mt-3 text-sm text-destructive">{preview.error}</p> : null}

      {deleted !== null ? (
        <p className="mt-4 text-sm font-medium">{deleted} kişi silindi.</p>
      ) : preview && !preview.error ? (
        <div className="mt-4 grid gap-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Listedeki e-posta</dt>
              <dd className="font-medium tabular-nums">{preview.totalEmails}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Silinecek kişi</dt>
              <dd className="font-medium tabular-nums text-destructive">{preview.matched}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CRM’de bulunamayan</dt>
              <dd className="font-medium tabular-nums">{preview.unmatched}</dd>
            </div>
          </dl>

          {preview.sample.length > 0 ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="mb-1 font-medium">Silinecek kişilerden örnekler (ilk {preview.sample.length}):</p>
              <ul className="grid gap-0.5 text-muted-foreground">
                {preview.sample.map((p) => (
                  <li key={p.email} className="break-all">
                    {p.name} · {p.email}
                    {p.company ? ` · ${p.company}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.impact.activities + preview.impact.tasks + preview.impact.meetings + preview.impact.deals + preview.impact.cards >
          0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="mb-1 font-medium">Bu kişilere bağlı kayıtlar var:</p>
              <ul className="list-disc pl-4">
                {preview.impact.activities > 0 ? (
                  <li>{preview.impact.activities} not / aktivite kişiyle birlikte silinir</li>
                ) : null}
                {preview.impact.deals > 0 ? <li>{preview.impact.deals} fırsat kalır, kişi bağlantısı kalkar</li> : null}
                {preview.impact.tasks > 0 ? <li>{preview.impact.tasks} görev kalır, kişi bağlantısı kalkar</li> : null}
                {preview.impact.meetings > 0 ? (
                  <li>{preview.impact.meetings} toplantı kalır, kişi bağlantısı kalkar</li>
                ) : null}
                {preview.impact.cards > 0 ? (
                  <li>{preview.impact.cards} iş akışı kartı kalır, kişi bağlantısı kalkar</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {preview.matched > 0 ? (
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={backup} disabled={busy}>
                  1. Yedeği indir (Excel)
                </Button>
                <span className="text-xs text-muted-foreground">
                  {backedUp ? "Yedek indirildi ✓" : "Silmeden önce zorunlu."}
                </span>
              </div>
              <label className="grid gap-1.5 text-xs">
                <span className="font-medium">2. Onay için SİL yazın</span>
                <input
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="field-input h-9 w-40"
                  autoComplete="off"
                />
              </label>
              <div>
                <Button type="button" variant="destructive" onClick={remove} disabled={busy || !canDelete}>
                  {busy ? "Siliniyor…" : `${preview.matched} kişiyi kalıcı olarak sil`}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
