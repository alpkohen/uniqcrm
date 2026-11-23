"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { backupCompanyMerge, mergeCompanyGroups, type MergeSelection } from "@/actions/company-merge";
import type { MergeGroup } from "@/lib/company-merge";
import { Button } from "@/components/ui/button";

const PAGE = 15;

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

type State = { included: boolean; primaryId: string; name: string | null; sector: string | null };

// Sector the merged company gets unless edited: the kept company's own, else the first one among the others.
function defaultSector(g: MergeGroup, primaryId: string) {
  const primary = g.members.find((m) => m.id === primaryId);
  return primary?.sector ?? g.members.find((m) => m.sector)?.sector ?? "";
}

export function CompanyMergeTool({ groups, sectors }: { groups: MergeGroup[]; sectors: string[] }) {
  const [state, setState] = useState<Record<string, State>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, { included: true, primaryId: g.suggestedId, name: null, sector: null }])),
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [backupFor, setBackupFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<{ groups: number; removed: number; contacts: number; deals: number; cards: number } | null>(null);

  const nameOf = (g: MergeGroup, s: State) => s.name ?? g.members.find((m) => m.id === s.primaryId)!.name;

  const selection: MergeSelection[] = useMemo(
    () =>
      groups
        .filter((g) => state[g.key].included)
        .map((g) => {
          const s = state[g.key];
          return {
            primaryId: s.primaryId,
            name: s.name ?? g.members.find((m) => m.id === s.primaryId)!.name,
            mergeIds: g.members.filter((m) => m.id !== s.primaryId).map((m) => m.id),
            sector: s.sector ?? defaultSector(g, s.primaryId),
          };
        }),
    [groups, state],
  );
  const signature = JSON.stringify(selection);
  const backedUp = backupFor === signature;

  const summary = useMemo(() => {
    let removed = 0;
    let contacts = 0;
    let deals = 0;
    for (const g of groups) {
      const s = state[g.key];
      if (!s.included) continue;
      for (const m of g.members) {
        if (m.id === s.primaryId) continue;
        removed += 1;
        contacts += m.contacts;
        deals += m.deals;
      }
    }
    return { groups: selection.length, removed, contacts, deals };
  }, [groups, state, selection.length]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return q ? groups.filter((g) => g.members.some((m) => m.name.toLocaleLowerCase("tr").includes(q))) : groups;
  }, [groups, query]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE));
  const current = Math.min(page, pageCount);
  const shown = visible.slice((current - 1) * PAGE, current * PAGE);

  const patch = (key: string, next: Partial<State>) => setState((prev) => ({ ...prev, [key]: { ...prev[key], ...next } }));
  const setAll = (included: boolean) =>
    setState((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, included }])));

  async function backup() {
    setBusy(true);
    try {
      const result = await backupCompanyMerge(selection);
      if (result.error) return void toast.error(result.error);
      download(result.filename, result.base64);
      setBackupFor(signature);
      toast.success("Yedek indirildi.");
    } catch {
      toast.error("Yedek alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function merge() {
    setBusy(true);
    const total = { groups: 0, removed: 0, contacts: 0, deals: 0, cards: 0 };
    try {
      for (let i = 0; i < selection.length; i += 10) {
        setProgress(`${Math.min(i + 10, selection.length)} / ${selection.length} grup işleniyor…`);
        const result = await mergeCompanyGroups(selection.slice(i, i + 10), confirm);
        if (result.error) {
          toast.error(result.error);
          if (total.groups > 0) setDone(total);
          return;
        }
        total.groups += result.groups;
        total.removed += result.removed;
        total.contacts += result.contacts;
        total.deals += result.deals;
        total.cards += result.cards;
      }
      setDone(total);
      toast.success(`${total.groups} grup birleştirildi.`);
    } catch {
      toast.error("Birleştirme sırasında hata oluştu. İşlenen gruplar korunur; sayfayı yenileyip kalanları tekrar deneyin.");
      if (total.groups > 0) setDone(total);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm">
        <p className="text-base font-medium">Birleştirme tamamlandı</p>
        <ul className="mt-3 grid gap-1 text-muted-foreground">
          <li>{done.groups} grup birleştirildi, {done.removed} yinelenen firma silindi.</li>
          <li>{done.contacts} kişi, {done.deals} fırsat, {done.cards} iş akışı kartı kalan firmaya bağlandı.</li>
        </ul>
        <div className="mt-4">
          <Button render={<Link href="/company-analysis?seg=dup" />} nativeButton={false} variant="outline">
            Firma Analizi’ne dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border bg-card p-4 text-sm">
        <p className="text-muted-foreground">
          Her grupta <strong>kalacak</strong> firmayı seçin (varsayılan: en çok kişisi olan). Diğerlerindeki kişiler, fırsatlar ve kartlar kalan firmaya taşınır,
          kalan firmanın boş alanları (sektör, şehir, web, telefon) diğerlerinden doldurulur, notlar birleştirilir ve yinelenen firmalar silinir. Grubu
          birleştirmek istemiyorsanız işaretini kaldırın.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Firma ara…"
            className="field-input h-9 w-56"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)}>
            Hepsini seç
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(false)}>
            Hiçbirini seçme
          </Button>
          <span className="text-xs text-muted-foreground">{visible.length} grup listeleniyor</span>
        </div>
      </div>

      <ul className="grid gap-3">
        {shown.map((g) => {
          const s = state[g.key];
          return (
            <li key={g.key} className={`rounded-xl border bg-card p-4 ${s.included ? "" : "opacity-60"}`}>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={s.included} onChange={(e) => patch(g.key, { included: e.target.checked })} />
                  Birleştir
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Sektör
                  <select
                    value={s.sector ?? defaultSector(g, s.primaryId)}
                    onChange={(e) => patch(g.key, { sector: e.target.value })}
                    disabled={!s.included}
                    className="field-select h-8 w-56 text-sm text-foreground"
                  >
                    <option value="">Sektör seçin…</option>
                    {sectors.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Birleşik firma adı
                  <input
                    value={nameOf(g, s)}
                    onChange={(e) => patch(g.key, { name: e.target.value })}
                    disabled={!s.included}
                    className="field-input h-8 w-72 text-sm text-foreground"
                  />
                </label>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {g.members.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="w-24 py-1.5 pr-2">
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="radio"
                            name={`keep-${g.key}`}
                            checked={s.primaryId === m.id}
                            disabled={!s.included}
                            onChange={() => patch(g.key, { primaryId: m.id, name: null, sector: null })}
                          />
                          Kalacak
                        </label>
                      </td>
                      <td className="py-1.5 pr-2">
                        <Link href={`/companies/${m.id}`} target="_blank" className="hover:underline">
                          {m.name}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-2 text-xs text-muted-foreground">{[m.sector, m.city].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="py-1.5 text-right text-xs tabular-nums text-muted-foreground">
                        {m.contacts} kişi · {m.deals} fırsat
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          );
        })}
      </ul>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Sayfa {current} / {pageCount}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              Önceki
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
              Sonraki
            </Button>
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 grid gap-3 rounded-xl border border-destructive/40 bg-card p-4 text-sm shadow-sm">
        <p>
          <strong>{summary.groups}</strong> grup seçili · <strong className="text-destructive">{summary.removed}</strong> firma silinecek ·{" "}
          {summary.contacts} kişi ve {summary.deals} fırsat taşınacak. <strong>Bu işlem geri alınamaz.</strong>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={backup} disabled={busy || summary.groups === 0}>
            1. Yedeği indir (Excel)
          </Button>
          <span className="text-xs text-muted-foreground">{backedUp ? "Yedek indirildi ✓" : "Seçim değişirse yedek yenilenmeli."}</span>
          <label className="flex items-center gap-2 text-xs">
            <span className="font-medium">2. Onay için BİRLEŞTİR yazın</span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field-input h-9 w-36" autoComplete="off" />
          </label>
          <Button
            type="button"
            variant="destructive"
            onClick={merge}
            disabled={busy || !backedUp || summary.groups === 0 || confirm.trim().toLocaleLowerCase("tr") !== "birleştir"}
          >
            {busy ? progress ?? "İşleniyor…" : `${summary.groups} grubu birleştir`}
          </Button>
        </div>
      </div>
    </div>
  );
}
