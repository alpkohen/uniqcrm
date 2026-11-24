import Link from "next/link";
import { ArrowDown, ArrowUp, Download, X } from "lucide-react";
import { requireUser } from "@/lib/session";
import { PAGE_SIZE } from "@/lib/constants";
import { formatDate, formatTry } from "@/lib/format";
import {
  NO_VALUE,
  SEGMENTS,
  SIZES,
  attachTraining,
  computeFacets,
  computeStats,
  duplicateGroups,
  filterRows,
  loadCompanyRows,
  monthlyAdds,
  parseCompanyFilters,
  sortRows,
  workedLabel,
  type CompanyFilters,
  type SortKey,
} from "@/lib/company-analysis";
import { PageHeader, EmptyState, Pagination } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { PeopleFacetCard, type FacetEntry } from "@/components/people-facet-card";
import { LinkPending } from "@/components/link-pending";
import { RaiseToggle } from "@/components/raise-toggle";
import { features } from "@/lib/brand";
import { cn } from "cn";

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const num = (n: number) => n.toLocaleString("tr-TR");

type Overrides = Partial<Record<keyof CompanyFilters | "page", string>>;

function queryString(f: CompanyFilters, overrides: Overrides = {}) {
  const merged: Record<string, string> = {
    seg: f.seg === "all" ? "" : f.seg,
    sector: f.sector,
    city: f.city,
    size: f.size,
    worked: f.worked,
    q: f.q,
    sort: f.sort === "contacts" ? "" : f.sort,
    dir: f.dir === "desc" ? "" : f.dir,
    page: "",
    ...overrides,
  };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
  return params.toString();
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="w-32 rounded-lg border bg-card px-2.5 py-1.5" title={sub}>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold leading-tight tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}

export default async function CompanyAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const f = parseCompanyFilters(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);

  const hrefFor = (overrides: Overrides = {}) => {
    const qs = queryString(f, overrides);
    return qs ? `/company-analysis?${qs}` : "/company-analysis";
  };

  const all = await loadCompanyRows();
  // UNIQ-only parts: training history (Data Analiz sheet) and RAISE target picking.
  const showTraining = features.trainingHistory();
  const showRaise = features.raiseTargets();
  const trainingError = showTraining ? await attachTraining(all) : null;
  const trainingOk = showTraining && !trainingError;
  const segments = SEGMENTS.filter((s) => (s.key !== "trained" || trainingOk) && (s.key !== "raise" || showRaise));
  const { stats, segmentCounts } = computeStats(all);
  const facets = computeFacets(all, f);
  const filtered = sortRows(filterRows(all, f), f);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toEntries = (items: { key: string; label: string; color: string; count: number }[], param: "sector" | "city" | "size" | "worked"): FacetEntry[] =>
    items.map((item) => {
      const active = f[param] === item.key;
      return { ...item, active, href: hrefFor({ [param]: active ? "" : item.key }) };
    });
  const sectorEntries = toEntries(facets.sectors, "sector");
  const cityEntries = toEntries(facets.cities, "city");
  const sizeEntries = toEntries(facets.sizes, "size");
  const workedEntries = toEntries(facets.worked, "worked");
  const sum = (entries: FacetEntry[]) => entries.reduce((n, e) => n + e.count, 0);

  const chips: { label: string; href: string }[] = [];
  if (f.sector) chips.push({ label: `Sektör: ${f.sector === NO_VALUE ? "girilmemiş" : f.sector}`, href: hrefFor({ sector: "" }) });
  if (f.city) chips.push({ label: `Şehir: ${f.city === NO_VALUE ? "girilmemiş" : f.city}`, href: hrefFor({ city: "" }) });
  if (f.size) chips.push({ label: `Büyüklük: ${SIZES.find((s) => s.key === f.size)?.label ?? f.size}`, href: hrefFor({ size: "" }) });
  if (f.worked) chips.push({ label: `Eğitim: ${workedLabel(f.worked)}`, href: hrefFor({ worked: "" }) });
  if (f.q) chips.push({ label: `Arama: “${f.q}”`, href: hrefFor({ q: "" }) });

  const monthly = monthlyAdds(all, 12);
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.count));
  const topByPeople = [...all].sort((a, b) => b.contacts - a.contacts).slice(0, 8);
  const maxPeople = Math.max(1, topByPeople[0]?.contacts ?? 1);
  const dupes = duplicateGroups(all, 6);

  const quality = [
    { label: "Sektör girilmiş", value: stats.withSector },
    { label: "Şehir girilmiş", value: stats.withCity },
    { label: "Web sitesi var", value: stats.withWebsite },
    { label: "Telefon var", value: stats.withPhone },
    { label: "Kişisi var", value: stats.withContacts },
  ];

  const exportQuery = queryString(f);

  const sortHeader = (key: SortKey, label: string, align = "text-left") => {
    const active = f.sort === key;
    const nextDir = active ? (f.dir === "asc" ? "desc" : "asc") : key === "name" || key === "sector" || key === "city" ? "asc" : "desc";
    return (
      <th className={cn("px-4 py-2.5 font-medium", align)}>
        <Link
          href={hrefFor({ sort: key === "contacts" ? "" : key, dir: nextDir === "desc" ? "" : nextDir, page: "" })}
          prefetch={false}
          className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
        >
          {label}
          {active ? f.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
        </Link>
      </th>
    );
  };

  return (
    <div>
      <PageHeader
        title="Firma Analizi"
        description="Sektör, şehir ve büyüklük kırılımında firmalarınız. Her firma listede bir kez yer alır; bir gruba tıklayın, liste o gruba göre süzülsün."
        actions={
          <>
            <Button
              render={<a href={`/api/company-analysis/export${exportQuery ? `?${exportQuery}` : ""}`} />}
              variant="outline"
              nativeButton={false}
            >
              <Download />
              Listeyi dışa aktar
            </Button>
            {showRaise && segmentCounts.raise > 0 ? (
              <Button render={<a href="/api/raise/export" />} variant="outline" nativeButton={false}>
                <Download />
                RAISE listesi ({num(segmentCounts.raise)})
              </Button>
            ) : null}
            <Button render={<Link href="/companies" />} variant="outline" nativeButton={false}>
              Tüm firmalar
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <Kpi label="Toplam firma" value={num(stats.total)} sub="tekil firma kaydı" />
        <Kpi label="Kişisi olan" value={num(stats.withContacts)} sub={`%${pct(stats.withContacts, stats.total)} oran`} accent="#0d9488" />
        <Kpi label="Açık fırsatı olan" value={num(stats.withOpen)} sub={`%${pct(stats.withOpen, stats.total)} oran`} accent="#4f46e5" />
        <Kpi label="Müşteri" value={num(stats.customers)} sub="en az 1 kazanılmış fırsat" accent="#16a34a" />
        {trainingOk ? (
          <Kpi label="Geçmişte çalışılan" value={num(stats.trained)} sub="eğitim tablosunda var" accent="#0d9488" />
        ) : null}
        <Kpi label="Sektörü girilmiş" value={num(stats.withSector)} sub={`%${pct(stats.withSector, stats.total)} oran`} accent="#2563eb" />
      </div>

      <nav aria-label="Segmentler" className="mb-4 flex flex-wrap gap-1.5 rounded-xl border bg-card p-1.5">
        {segments.map((seg) => {
          const active =
            seg.key === "all"
              ? f.seg === "all" && !f.sector && !f.city && !f.size && !f.worked && !f.q
              : f.seg === seg.key;
          return (
            <Link
              key={seg.key}
              // "Tümü" resets every filter (side groups and search too), not only the segment.
              href={
                seg.key === "all"
                  ? hrefFor({ seg: "", sector: "", city: "", size: "", worked: "", q: "" })
                  : hrefFor({ seg: seg.key })
              }
              prefetch={false}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {seg.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {num(segmentCounts[seg.key])}
              </span>
              <LinkPending className={active ? "text-primary-foreground" : undefined} />
            </Link>
          );
        })}
      </nav>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,310px)_minmax(0,1fr)]">
        <div className="grid gap-4">
          {!trainingOk ? null : (
            <PeopleFacetCard title="Eğitim geçmişi" hint="Firmayla en son çalışılan yıl" items={workedEntries} total={sum(workedEntries)} />
          )}
          <PeopleFacetCard title="Sektörler" hint="Firmanın sektörü" items={sectorEntries} total={sum(sectorEntries)} visible={10} />
          <PeopleFacetCard title="Şehirler" hint="Firmanın şehri" items={cityEntries} total={sum(cityEntries)} visible={8} />
          <PeopleFacetCard title="Büyüklük" hint="Firmadaki kişi sayısına göre" items={sizeEntries} total={sum(sizeEntries)} />
        </div>

        <section className="min-w-0 rounded-xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-medium">Firma listesi</h2>
              <p className="text-xs text-muted-foreground">
                {num(total)} firma{total !== stats.total ? ` · toplam ${num(stats.total)} içinden` : ""}
              </p>
            </div>
            <form action="/company-analysis" className="flex gap-2">
              {f.seg !== "all" ? <input type="hidden" name="seg" value={f.seg} /> : null}
              {f.sector ? <input type="hidden" name="sector" value={f.sector} /> : null}
              {f.city ? <input type="hidden" name="city" value={f.city} /> : null}
              {f.size ? <input type="hidden" name="size" value={f.size} /> : null}
              {f.worked ? <input type="hidden" name="worked" value={f.worked} /> : null}
              <input name="q" defaultValue={f.q} placeholder="Firma adı…" className="field-input sm:w-64" />
              <Button type="submit" variant="outline" size="sm">
                Ara
              </Button>
            </form>
          </div>

          {trainingError ? (
            <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
              Eğitim geçmişi okunamadı, liste onsuz gösteriliyor: {trainingError}
            </p>
          ) : null}

          {chips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-4 py-2">
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-muted"
                >
                  {chip.label}
                  <X className="size-3 text-muted-foreground" />
                </Link>
              ))}
              <Link href="/company-analysis" className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
                Tümünü temizle
              </Link>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Bu filtreyle firma yok" description="Bir filtreyi kaldırın veya aramayı değiştirin." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    {showRaise ? (
                      <th className="w-10 py-2.5 pl-4 text-left text-[11px] font-medium" title="RAISE hedefi">
                        RAISE
                      </th>
                    ) : null}
                    {sortHeader("name", "Firma")}
                    {sortHeader("sector", "Sektör")}
                    {sortHeader("contacts", "Kişi", "text-right")}
                    {sortHeader("open", "Açık fırsat", "text-right")}
                    {sortHeader("won", "Kazanılan", "text-right")}
                    {trainingOk ? sortHeader("training", "Eğitim geçmişi", "text-right") : null}
                    <th className="hidden px-4 py-2.5 text-left font-medium 2xl:table-cell">
                      <Link
                        href={hrefFor({ sort: "created", dir: f.sort === "created" && f.dir === "desc" ? "asc" : "", page: "" })}
                        prefetch={false}
                        className={cn("inline-flex items-center gap-1 hover:text-foreground", f.sort === "created" && "text-foreground")}
                      >
                        Eklenme
                        {f.sort === "created" ? f.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={cn("border-b last:border-0 hover:bg-muted/30", showRaise && row.raiseTarget && "bg-violet-50/60")}>
                      {showRaise ? (
                        <td className="py-2.5 pl-4">
                          <RaiseToggle companyId={row.id} name={row.name} selected={row.raiseTarget} />
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5">
                        <Link href={`/companies/${row.id}`} className="font-medium hover:underline">
                          {row.name}
                        </Link>
                        {row.dupCount > 1 ? (
                          <span
                            className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                            title="Aynı firmanın farklı yazımı olabilir"
                          >
                            olası mükerrer
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">{row.sector ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.contacts > 0 ? num(row.contacts) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.openDeals > 0 ? num(row.openDeals) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.wonDeals > 0 ? (
                          <>
                            {num(row.wonDeals)}
                            {row.wonAmount > 0 ? <span className="block text-xs text-muted-foreground">{formatTry(row.wonAmount)}</span> : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {trainingOk ? (
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.training ? (
                          <span title={`Tablodaki adı: ${row.training.sheetNames.join(", ")}`}>
                            {num(row.training.days)} gün
                            <span className="block text-xs text-muted-foreground">
                              {row.training.firstYear === row.training.lastYear
                                ? row.training.lastYear
                                : `${row.training.firstYear}–${row.training.lastYear}`}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      ) : null}
                      <td className="hidden px-4 py-2.5 text-muted-foreground 2xl:table-cell">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 pb-4">
            <Pagination page={current} pageCount={pageCount} hrefFor={(next) => hrefFor({ page: String(next) })} />
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-sm font-medium">Aylık eklenen firma</h2>
          <p className="mb-4 text-xs text-muted-foreground">Son 12 ay · toplu içe aktarmalar tek ayda yığılır.</p>
          <div className="flex h-32 items-end gap-1.5">
            {monthly.map((m) => (
              <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">{m.count > 0 ? num(m.count) : ""}</span>
                <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(m.count > 0 ? 4 : 0, (m.count / maxMonthly) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {monthly.map((m) => (
              <span key={m.key} className="flex-1 text-center text-[10px] text-muted-foreground">
                {MONTH_LABELS[m.month]}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-sm font-medium">En çok kişisi olan firmalar</h2>
          <p className="mb-4 text-xs text-muted-foreground">İlk 8 firma · firmaya tıklayın.</p>
          {topByPeople.length === 0 || topByPeople[0].contacts === 0 ? (
            <p className="text-sm text-muted-foreground">Firmaya bağlı kişi yok.</p>
          ) : (
            <div className="grid gap-2.5">
              {topByPeople.map((company) => (
                <Link key={company.id} href={`/companies/${company.id}`} className="grid gap-1 hover:opacity-80">
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{company.name}</span>
                    <span className="tabular-nums text-muted-foreground">{num(company.contacts)}</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(company.contacts / maxPeople) * 100}%` }} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-sm font-medium">Veri kalitesi</h2>
          <p className="mb-4 text-xs text-muted-foreground">Firmaların ne kadarında bu bilgi dolu.</p>
          <div className="grid gap-3">
            {quality.map((item) => {
              const p = pct(item.value, stats.total);
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {num(item.value)} · %{p}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", p >= 80 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-destructive")}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {dupes.length > 0 ? (
        <section className="mt-4 rounded-xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">Olası mükerrer firmalar</h2>
              <p className="text-xs text-muted-foreground">
                Büyük/küçük harf, Türkçe karakter ve “A.Ş. / Ltd.” gibi eklere bakmadan aynı görünen firmalar. {num(stats.dupGroups)} grup.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={hrefFor({ seg: "dup" })} prefetch={false} className="text-xs underline-offset-2 hover:underline">
                Hepsini listele
              </Link>
              {isAdmin ? (
                <Button render={<Link href="/company-analysis/merge" />} size="sm" nativeButton={false}>
                  Birleştirme aracını aç
                </Button>
              ) : null}
            </div>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dupes.map((group) => (
              <li key={group[0].dupKey} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                {group.map((company, index) => (
                  <span key={company.id}>
                    {index > 0 ? <span className="text-muted-foreground"> · </span> : null}
                    <Link href={`/companies/${company.id}`} className="hover:underline">
                      {company.name}
                    </Link>
                    <span className="text-xs text-muted-foreground"> ({company.contacts} kişi)</span>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">
        Her satır bir firma kaydıdır. Kişi ve fırsat sayıları firmaya bağlı kayıtlardan hesaplanır; “olası mükerrer” işareti
        yalnızca addan çıkarılır, kayıtların kendisi değişmez.
        {trainingOk
          ? " Eğitim geçmişi Data Analiz tablosundan, firma adı eşleştirilerek gelir (gün = “BI için Gün Sayısı”); adı tablodakinden çok farklı yazılmış firmalar eşleşmeyebilir."
          : null}
      </p>
    </div>
  );
}
