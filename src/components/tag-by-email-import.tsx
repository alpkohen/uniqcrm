"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { tagContactsByEmail, type TagByEmailResult } from "@/actions/tag-by-email";
import { Button } from "@/components/ui/button";

export function TagByEmailImport() {
  const [file, setFile] = useState<File | null>(null);
  const [tag, setTag] = useState("risky");
  const [result, setResult] = useState<TagByEmailResult | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function run(apply: boolean, selected: File | null = file, tagName: string = tag) {
    if (!selected) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file", selected);
      data.set("tag", tagName);
      if (apply) data.set("apply", "1");
      const next = await tagContactsByEmail(data);
      setResult(next);
      if (next.error) toast.error(next.error);
      else if (apply) toast.success(`${next.tagged} kişiye “${next.tagName}” etiketi eklendi.`);
    } catch {
      toast.error("İşlem başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="mb-3 text-sm text-muted-foreground">
        E-posta listesi içeren bir Excel (.xlsx) ya da CSV yükleyin. Listedeki adresleri CRM’deki kişilerle
        eşleştirir; etiketi olmayanlara etiketi ekler. Başka hiçbir alan değişmez. Önce önizleme gösterir.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <input
          ref={input}
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setResult(null);
            if (selected) void run(false, selected);
          }}
          className="field-input h-9"
        />
        <input
          value={tag}
          onChange={(event) => {
            setTag(event.target.value);
            setResult(null);
          }}
          placeholder="Etiket adı"
          className="field-input h-9"
          aria-label="Etiket adı"
        />
      </div>

      {file && !result && busy ? <p className="mt-3 text-sm text-muted-foreground">Dosya inceleniyor…</p> : null}
      {result?.error ? <p className="mt-3 text-sm text-destructive">{result.error}</p> : null}

      {result && !result.error ? (
        <div className="mt-4 grid gap-3 text-sm">
          <p className="font-medium">
            {result.applied ? "Etiketleme tamamlandı" : "Önizleme — henüz hiçbir şey değişmedi"}
            <span className="ml-2 font-normal text-muted-foreground">
              etiket: {result.tagName}
              {!result.tagExists ? " (yeni oluşturulacak)" : ""}
            </span>
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Listedeki e-posta</dt>
              <dd className="font-medium tabular-nums">{result.totalEmails}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CRM’de eşleşen kişi</dt>
              <dd className="font-medium tabular-nums">{result.matchedContacts}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Zaten etiketli</dt>
              <dd className="font-medium tabular-nums">{result.alreadyTagged}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{result.applied ? "Etiketlenen" : "Etiketlenecek"}</dt>
              <dd className="font-medium tabular-nums">{result.applied ? result.tagged : result.willTag}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CRM’de bulunamayan e-posta</dt>
              <dd className="font-medium tabular-nums">{result.unmatched}</dd>
            </div>
          </dl>

          {result.unmatchedSample.length > 0 ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="mb-1 font-medium">CRM’de bulunamayanlardan örnekler:</p>
              <p className="break-all text-muted-foreground">{result.unmatchedSample.join(" · ")}</p>
            </div>
          ) : null}

          {!result.applied ? (
            <div>
              <Button type="button" onClick={() => run(true)} disabled={busy || result.willTag === 0}>
                {busy ? "Uygulanıyor…" : `${result.willTag} kişiye “${result.tagName}” etiketi ekle`}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
