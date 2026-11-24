import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { features } from "@/lib/brand";
import {
  FILTER_DEFS,
  attachCrmIds,
  buildMatrix,
  filterOptions,
  loadTrainingRows,
  parseTrainingFilters,
  trainingSheetEditUrl,
  type TrainingFilters,
} from "@/lib/training-history";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

function days(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function buildQuery(f: TrainingFilters, sort: string, dir: string) {
  const params = new URLSearchParams();
  for (const def of FILTER_DEFS) for (const v of f[def.key]) params.append(def.key, v);
  if (sort !== "total") params.set("sort", sort);
  if (dir !== "desc") params.set("dir", dir);
  const qs = params.toString();
  return qs ? `/training-history?${qs}` : "/training-history";
}

export default async function TrainingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  if (!features.trainingHistory()) notFound();
  const sp = await searchParams;
  const f = parseTrainingFilters(sp);
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) ?? "total";
  const dir = (Array.isArray(sp.dir) ? sp.dir[0] : sp.dir) === "asc" ? "asc" : "desc";

  let rows;
  try {
    rows = await loadTrainingRows();
  } catch (error) {
    return (
      <div>
        <PageHeader title="Eğitim Geçmişi" description="Firma × yıl eğitim günü" />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
          <p className="font-medium">Google Sheets verisi okunamadı.</p>
          <p className="mt-1 text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </div>
    );
  }

  // Years after the current one are left out until they start (planned trainings for next year).
  const lastYear = new Date().getFullYear();
  const sheetUrl = trainingSheetEditUrl();
  const options = filterOptions(rows);
  const matrix = buildMatrix(rows, f, lastYear);
  await attachCrmIds(matrix.companies);

  const sign = dir === "asc" ? 1 : -1;
  const yearIndex = matrix.years.indexOf(Number(sort));
  const list = [...matrix.companies].sort((a, b) => {
    if (sort === "name") return sign * a.company.localeCompare(b.company, "tr");
    const av = yearIndex >= 0 ? a.byYear[yearIndex] : a.total;
    const bv = yearIndex >= 0 ? b.byYear[yearIndex] : b.total;
    return sign * (av - bv) || b.total - a.total || a.company.localeCompare(b.company, "tr");
  });

  const sortHref = (key: string) => buildQuery(f, key, sort === key && dir === "desc" ? "asc" : key === "name" ? "asc" : "desc");
  const sortIcon = (k: string) =>
    sort === k ? dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null;

  const activeFilters = FILTER_DEFS.some((d) => f[d.key].length > 0);

  return (
    <div>
      <PageHeader
        title="Eğitim Geçmişi"
        description={`Firma × yıl eğitim günü (${matrix.years[0]}+). Kaynak: Data Analiz tablosu, sayfa her açılışta güncel veriyi çeker.`}
        actions={
          sheetUrl ? (
            <Button render={<a href={sheetUrl} target="_blank" rel="noreferrer" />} variant="outline" nativeButton={false}>
              <ExternalLink />
              Tabloyu aç
            </Button>
          ) : null
        }
      />

      <form action="/training-history" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        {sort !== "total" ? <input type="hidden" name="sort" value={sort} /> : null}
        {dir !== "desc" ? <input type="hidden" name="dir" value={dir} /> : null}
        {FILTER_DEFS.map((def) => {
          const selected = f[def.key];
          return (
            <div key={def.key} className="grid gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{def.label}</span>
              <details className="group relative">
                <summary className="flex min-w-40 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-muted/60">
                  <span>{def.label}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    {selected.length === 0 ? "Tümü" : selected.length === 1 ? (options[def.key].find((o) => o.value === selected[0])?.label ?? selected[0]) : `${selected.length} seçili`}
                  </span>
                </summary>
                <div className="absolute left-0 z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-md">
                  {options[def.key].map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                      <input type="checkbox" name={def.key} value={o.value} defaultChecked={selected.includes(o.value)} />
                      <span className="flex-1 truncate">{o.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{o.count.toLocaleString("tr-TR")}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          );
        })}
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Uygula
          </Button>
          {activeFilters ? (
            <Button render={<Link href={buildQuery({ statu: [], durum: [], icerik: [], hizmet: [] }, sort, dir)} />} variant="ghost" size="sm" nativeButton={false}>
              Temizle
            </Button>
          ) : null}
        </div>
      </form>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-medium">
            Firma × Yıl — Eğitim Günü ({matrix.years[0]}+)
          </h2>
          <p className="text-xs text-muted-foreground">
            {list.length.toLocaleString("tr-TR")} şirket · {matrix.rowCount.toLocaleString("tr-TR")} satır
          </p>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 border-b bg-muted px-4 py-2.5 text-left font-medium">
                  <Link href={sortHref("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Şirket adı {sortIcon("name")}
                  </Link>
                </th>
                {matrix.years.map((y) => (
                  <th key={y} className="border-b px-3 py-2.5 text-right font-medium">
                    <Link href={sortHref(String(y))} className="inline-flex items-center gap-1 hover:text-foreground">
                      {sortIcon(String(y))} {y}
                    </Link>
                  </th>
                ))}
                <th className="border-b bg-amber-50 px-4 py-2.5 text-right font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <Link href={sortHref("total")} className="inline-flex items-center gap-1">
                    {sortIcon("total")} Toplam
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.company} className="hover:bg-muted/30">
                  <td className="sticky left-0 border-b bg-card px-4 py-2 font-medium">
                    {row.crmId ? (
                      <Link href={`/companies/${row.crmId}`} className="hover:underline" title="CRM'deki firma kaydını aç">
                        {row.company}
                      </Link>
                    ) : (
                      row.company
                    )}
                  </td>
                  {row.byYear.map((v, i) => (
                    <td
                      key={matrix.years[i]}
                      className={cn(
                        "border-b px-3 py-2 text-right tabular-nums",
                        v === 0 && "bg-rose-50 text-rose-400 dark:bg-rose-950/30 dark:text-rose-400/70"
                      )}
                    >
                      {v === 0 ? "–" : days(v)}
                    </td>
                  ))}
                  <td className="border-b bg-amber-50/60 px-4 py-2 text-right font-semibold tabular-nums text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                    {days(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 bg-muted font-semibold">
              <tr>
                <td className="sticky left-0 border-t bg-muted px-4 py-2.5">Toplam</td>
                {matrix.yearTotals.map((v, i) => (
                  <td key={matrix.years[i]} className="border-t px-3 py-2.5 text-right tabular-nums">
                    {days(v)}
                  </td>
                ))}
                <td className="border-t bg-amber-100 px-4 py-2.5 text-right tabular-nums text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  {days(matrix.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Değerler eğitim günü sayısıdır (tablodaki “BI için Gün Sayısı” sütunu). Pembe hücreler o firmayla o yıl hiç çalışılmadığını
        gösterir. Yıl başlıklarına tıklayarak sıralayabilirsiniz. İçinde bulunulan yıldan sonraki yıllar, yıl başlamadan gösterilmez.
        Adı CRM’deki bir firmayla eşleşen şirketler tıklanabilir.
      </p>
    </div>
  );
}
