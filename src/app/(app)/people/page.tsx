import Link from "next/link";
import { Download, Mail, Phone, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PAGE_SIZE } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import {
  SEGMENTS,
  buildPeopleWhere,
  computeFacets,
  computePeopleStats,
  loadMonthlyAdds,
  loadSnapshot,
  loadTopCompanies,
  needsTitleFilter,
  parsePeopleFilters,
  NO_SECTOR,
  type PeopleFilters,
} from "@/lib/people";
import { classifyTitle, deptMeta, levelMeta } from "@/lib/title-groups";
import { PageHeader, EmptyState, Pagination } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { PeopleFacetCard, type FacetEntry } from "@/components/people-facet-card";
import { LinkPending } from "@/components/link-pending";
import { cn } from "cn";

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function num(n: number) {
  return n.toLocaleString("tr-TR");
}

function queryString(f: PeopleFilters, overrides: Partial<Record<keyof PeopleFilters | "page", string>> = {}) {
  const merged: Record<string, string> = {
    level: f.level,
    dept: f.dept,
    sector: f.sector,
    seg: f.seg === "all" ? "" : f.seg,
    q: f.q,
    page: "",
    ...overrides,
  };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl tracking-tight tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const sp = await searchParams;
  const f = parsePeopleFilters(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);

  const hrefFor = (overrides: Parameters<typeof queryString>[1] = {}) => {
    const qs = queryString(f, overrides);
    return qs ? `/people?${qs}` : "/people";
  };

  const snapshotPromise = loadSnapshot();
  const insightsPromise = Promise.all([loadMonthlyAdds(12), loadTopCompanies(8)]);

  const fetchList = (snapshot: Awaited<typeof snapshotPromise> | null) => {
    const where = buildPeopleWhere(f, snapshot);
    return Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        include: { company: { select: { id: true, name: true, sector: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
  };

  // The seniority/department filters are resolved to exact title strings from the
  // snapshot, so the list query has to wait for it; every other case runs in parallel.
  const listPromise = needsTitleFilter(f) ? snapshotPromise.then(fetchList) : fetchList(null);

  const [snapshot, [monthly, topCompanies], [total, contacts]] = await Promise.all([
    snapshotPromise,
    insightsPromise,
    listPromise,
  ]);

  const { stats, segmentCounts } = computePeopleStats(snapshot);
  const facets = computeFacets(snapshot, f);

  const toEntries = (
    items: { key: string; label: string; color: string; count: number }[],
    param: "level" | "dept" | "sector"
  ): FacetEntry[] =>
    items.map((item) => {
      const active = f[param] === item.key;
      return { ...item, active, href: hrefFor({ [param]: active ? "" : item.key }) };
    });

  const levelEntries = toEntries(facets.levels, "level");
  const deptEntries = toEntries(facets.depts, "dept");
  const sectorEntries = toEntries(facets.sectors, "sector");
  const sum = (entries: FacetEntry[]) => entries.reduce((n, e) => n + e.count, 0);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportQuery = queryString(f);

  const chips: { label: string; href: string }[] = [];
  if (f.level) chips.push({ label: `Unvan: ${levelMeta(f.level).label}`, href: hrefFor({ level: "" }) });
  if (f.dept) chips.push({ label: `Bölüm: ${deptMeta(f.dept).label}`, href: hrefFor({ dept: "" }) });
  if (f.sector) chips.push({ label: `Sektör: ${f.sector === NO_SECTOR ? "girilmemiş" : f.sector}`, href: hrefFor({ sector: "" }) });
  if (f.q) chips.push({ label: `Arama: “${f.q}”`, href: hrefFor({ q: "" }) });

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.count));
  const currentMonthAdds = monthly[monthly.length - 1]?.count ?? 0;
  const maxCompany = Math.max(1, ...topCompanies.map((c) => c.n));

  const quality = [
    { label: "E-posta", value: stats.withEmail },
    { label: "Telefon", value: stats.withPhone },
    { label: "Firmaya bağlı", value: stats.withCompany },
    { label: "Unvan girilmiş", value: stats.withTitle },
  ];

  return (
    <div>
      <PageHeader
        title="Kişi Analizi"
        description="Unvan, bölüm ve sektör kırılımında ağınız. Bir gruba tıklayın, ortadaki liste o gruba göre süzülsün."
        actions={
          <>
            <Button
              render={<a href={`/api/people/export${exportQuery ? `?${exportQuery}` : ""}`} />}
              variant="outline"
              nativeButton={false}
            >
              <Download />
              Listeyi dışa aktar
            </Button>
            <Button render={<Link href="/contacts" />} variant="outline" nativeButton={false}>
              Tüm kişiler
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Toplam kişi" value={num(stats.total)} sub="tüm kayıtlar" />
        <Kpi
          label="Karar vericiler"
          value={num(stats.decision)}
          sub={`%${pct(stats.decision, stats.total)} · C-Suite, kurucu, direktör, müdür`}
          accent="#4f46e5"
        />
        <Kpi label="E-postası olan" value={num(stats.withEmail)} sub={`%${pct(stats.withEmail, stats.total)} oran`} accent="#0d9488" />
        <Kpi label="Telefonu olan" value={num(stats.withPhone)} sub={`%${pct(stats.withPhone, stats.total)} oran`} accent="#16a34a" />
        <Kpi label="Firmaya bağlı" value={num(stats.withCompany)} sub={`%${pct(stats.withCompany, stats.total)} oran`} accent="#2563eb" />
        <Kpi label="Bu ay eklenen" value={num(currentMonthAdds)} sub="yeni kişi" accent="#ea580c" />
      </div>

      <nav aria-label="Segmentler" className="mb-4 flex flex-wrap gap-1.5 rounded-xl border bg-card p-1.5">
        {SEGMENTS.map((seg) => {
          const active = f.seg === seg.key;
          return (
            <Link
              key={seg.key}
              href={hrefFor({ seg: seg.key === "all" ? "" : seg.key })}
              prefetch={false}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {seg.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
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
          <PeopleFacetCard
            title="Unvan Grupları"
            hint="Kıdem seviyesine göre"
            items={levelEntries}
            total={sum(levelEntries)}
          />
          <PeopleFacetCard
            title="Bölümler"
            hint="Unvandan çıkarılan fonksiyon"
            items={deptEntries}
            total={sum(deptEntries)}
          />
          <PeopleFacetCard
            title="Sektörler"
            hint="Kişinin firmasının sektörü"
            items={sectorEntries}
            total={sum(sectorEntries)}
            visible={10}
          />
        </div>

        <section className="min-w-0 rounded-xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-medium">Kişi listesi</h2>
              <p className="text-xs text-muted-foreground">
                {num(total)} kişi{total !== stats.total ? ` · toplam ${num(stats.total)} içinden` : ""}
              </p>
            </div>
            <form action="/people" className="flex gap-2">
              {f.level ? <input type="hidden" name="level" value={f.level} /> : null}
              {f.dept ? <input type="hidden" name="dept" value={f.dept} /> : null}
              {f.sector ? <input type="hidden" name="sector" value={f.sector} /> : null}
              {f.seg !== "all" ? <input type="hidden" name="seg" value={f.seg} /> : null}
              <input
                name="q"
                defaultValue={f.q}
                placeholder="Ad, e-posta, unvan, firma…"
                className="field-input sm:w-64"
              />
              <Button type="submit" variant="outline" size="sm">
                Ara
              </Button>
            </form>
          </div>

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
              <Link href="/people" className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
                Tümünü temizle
              </Link>
            </div>
          ) : null}

          {contacts.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Bu filtreyle kişi yok" description="Bir filtreyi kaldırın veya aramayı değiştirin." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Kişi</th>
                    <th className="px-4 py-2.5 font-medium">Unvan</th>
                    <th className="px-4 py-2.5 font-medium">Firma</th>
                    <th className="px-4 py-2.5 font-medium">E-posta</th>
                    <th className="hidden px-4 py-2.5 font-medium xl:table-cell">Telefon</th>
                    <th className="hidden px-4 py-2.5 font-medium 2xl:table-cell">Eklenme</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => {
                    const name = fullName(contact.firstName, contact.lastName);
                    const cls = classifyTitle(contact.title);
                    const level = levelMeta(cls.level);
                    const dept = deptMeta(cls.dept);
                    const initials = `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase();
                    return (
                      <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {initials || "?"}
                            </span>
                            <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                              {name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="max-w-64 truncate" title={contact.title ?? undefined}>
                            {contact.title ?? "—"}
                          </p>
                          {cls.level !== "none" ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ backgroundColor: `${level.color}1a`, color: level.color }}
                              >
                                {level.label}
                              </span>
                              {cls.dept !== "other" ? (
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{ backgroundColor: `${dept.color}1a`, color: dept.color }}
                                >
                                  {dept.label}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5">
                          {contact.company ? (
                            <>
                              <Link href={`/companies/${contact.company.id}`} className="hover:underline">
                                {contact.company.name}
                              </Link>
                              {contact.company.sector ? (
                                <p className="text-xs text-muted-foreground">{contact.company.sector}</p>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                              <span className="max-w-56 truncate">{contact.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-2.5 xl:table-cell">
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                              {contact.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-2.5 text-muted-foreground 2xl:table-cell">
                          {formatDate(contact.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefFor={(next) => hrefFor({ page: String(next) })}
            />
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 lg:col-span-1">
          <h2 className="mb-1 text-sm font-medium">Aylık eklenen kişi</h2>
          <p className="mb-4 text-xs text-muted-foreground">Son 12 ay · toplu içe aktarmalar tek ayda yığılır.</p>
          <div className="flex h-32 items-end gap-1.5">
            {monthly.map((m) => (
              <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">{m.count > 0 ? num(m.count) : ""}</span>
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${Math.max(m.count > 0 ? 4 : 0, (m.count / maxMonthly) * 100)}%` }}
                />
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
          <h2 className="mb-1 text-sm font-medium">En çok kişi olan firmalar</h2>
          <p className="mb-4 text-xs text-muted-foreground">İlk 8 firma · firmaya tıklayın.</p>
          {topCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Firmaya bağlı kişi yok.</p>
          ) : (
            <div className="grid gap-2.5">
              {topCompanies.map((company) => (
                <Link key={company.id} href={`/companies/${company.id}`} className="grid gap-1 hover:opacity-80">
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{company.name}</span>
                    <span className="tabular-nums text-muted-foreground">{num(company.n)}</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(company.n / maxCompany) * 100}%` }} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-sm font-medium">Veri kalitesi</h2>
          <p className="mb-4 text-xs text-muted-foreground">Kayıtların ne kadarında bu alan dolu.</p>
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

      <p className="mt-6 text-xs text-muted-foreground">
        Unvan grubu ve bölüm, kişinin “unvan” alanındaki metinden anahtar kelimelerle otomatik çıkarılır;
        kayıtların kendisi değişmez.
      </p>
    </div>
  );
}
