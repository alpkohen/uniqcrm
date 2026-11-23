import "server-only";

import { prisma } from "@/lib/prisma";
import { foldTitle } from "@/lib/title-groups";
import { normalizeCompanyName } from "@/lib/company-name";

export const NO_VALUE = "__none";

export const SEGMENTS = [
  { key: "all", label: "Tümü" },
  { key: "contacts", label: "Kişisi olanlar" },
  { key: "nocontacts", label: "Kişisiz" },
  { key: "open", label: "Açık fırsatı olanlar" },
  { key: "won", label: "Müşteriler (kazanılmış)" },
  { key: "nosector", label: "Sektörü eksik" },
  { key: "dup", label: "Olası mükerrer" },
] as const;
export type SegmentKey = (typeof SEGMENTS)[number]["key"];

export const SIZES = [
  { key: "0", label: "Kişisi yok", color: "#94a3b8" },
  { key: "1", label: "1 kişi", color: "#0ea5e9" },
  { key: "2-5", label: "2–5 kişi", color: "#0d9488" },
  { key: "6-20", label: "6–20 kişi", color: "#4f46e5" },
  { key: "21+", label: "21+ kişi", color: "#ea580c" },
] as const;
type SizeKey = (typeof SIZES)[number]["key"];

export const SORTS = ["name", "sector", "city", "contacts", "open", "won", "wonAmount", "created"] as const;
export type SortKey = (typeof SORTS)[number];

export type CompanyRow = {
  id: string;
  name: string;
  sector: string | null;
  city: string | null;
  hasWebsite: boolean;
  hasPhone: boolean;
  owner: string;
  createdAt: Date;
  contacts: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  wonAmount: number;
  dupKey: string;
  dupCount: number;
};

export type CompanyFilters = {
  seg: SegmentKey;
  sector: string;
  city: string;
  size: string;
  q: string;
  sort: SortKey;
  dir: "asc" | "desc";
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseCompanyFilters(params: RawParams): CompanyFilters {
  const seg = first(params.seg) ?? "all";
  const sort = first(params.sort) ?? "contacts";
  const size = first(params.size) ?? "";
  return {
    seg: SEGMENTS.some((s) => s.key === seg) ? (seg as SegmentKey) : "all",
    sector: first(params.sector)?.trim() ?? "",
    city: first(params.city)?.trim() ?? "",
    size: SIZES.some((s) => s.key === size) ? size : "",
    q: first(params.q)?.trim() ?? "",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as SortKey) : "contacts",
    dir: first(params.dir) === "asc" ? "asc" : "desc",
  };
}

// One pass over the database gives every company with its people and deal counts; all filtering,
// facets and sorting then happen in memory (a few thousand companies at most).
export async function loadCompanyRows(): Promise<CompanyRow[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      sector: string | null;
      city: string | null;
      website: string | null;
      phone: string | null;
      owner: string;
      createdAt: Date;
      contacts: number;
      open_deals: number;
      won_deals: number;
      lost_deals: number;
      won_amount: number;
    }[]
  >`
    SELECT
      co.id, co.name,
      NULLIF(TRIM(co.sector), '') AS sector,
      NULLIF(TRIM(co.city), '') AS city,
      co.website, co.phone,
      u.name AS owner,
      co."createdAt" AS "createdAt",
      COALESCE(cc.n, 0)::int AS contacts,
      COALESCE(dd.open_deals, 0)::int AS open_deals,
      COALESCE(dd.won_deals, 0)::int AS won_deals,
      COALESCE(dd.lost_deals, 0)::int AS lost_deals,
      COALESCE(dd.won_amount, 0)::bigint::float8 AS won_amount
    FROM "Company" co
    JOIN "User" u ON u.id = co."ownerId"
    LEFT JOIN (
      SELECT "companyId", COUNT(*) AS n FROM "Contact" WHERE "companyId" IS NOT NULL GROUP BY 1
    ) cc ON cc."companyId" = co.id
    LEFT JOIN (
      SELECT "companyId",
        COUNT(*) FILTER (WHERE status = 'OPEN') AS open_deals,
        COUNT(*) FILTER (WHERE status = 'WON') AS won_deals,
        COUNT(*) FILTER (WHERE status = 'LOST') AS lost_deals,
        SUM(amount) FILTER (WHERE status = 'WON') AS won_amount
      FROM "Deal" WHERE "companyId" IS NOT NULL GROUP BY 1
    ) dd ON dd."companyId" = co.id
  `;

  const groups = new Map<string, number>();
  const keyed = rows.map((r) => {
    const dupKey = normalizeCompanyName(r.name);
    groups.set(dupKey, (groups.get(dupKey) ?? 0) + 1);
    return { r, dupKey };
  });

  return keyed.map(({ r, dupKey }) => ({
    id: r.id,
    name: r.name,
    sector: r.sector,
    city: r.city,
    hasWebsite: Boolean(r.website && r.website.trim()),
    hasPhone: Boolean(r.phone && r.phone.trim()),
    owner: r.owner,
    createdAt: r.createdAt,
    contacts: r.contacts,
    openDeals: r.open_deals,
    wonDeals: r.won_deals,
    lostDeals: r.lost_deals,
    wonAmount: Number(r.won_amount),
    dupKey,
    dupCount: groups.get(dupKey) ?? 1,
  }));
}

export function sizeOf(contacts: number): SizeKey {
  if (contacts === 0) return "0";
  if (contacts === 1) return "1";
  if (contacts <= 5) return "2-5";
  if (contacts <= 20) return "6-20";
  return "21+";
}

function segmentPasses(row: CompanyRow, seg: SegmentKey) {
  switch (seg) {
    case "contacts":
      return row.contacts > 0;
    case "nocontacts":
      return row.contacts === 0;
    case "open":
      return row.openDeals > 0;
    case "won":
      return row.wonDeals > 0;
    case "nosector":
      return !row.sector;
    case "dup":
      return row.dupCount > 1;
    default:
      return true;
  }
}

type Skip = "sector" | "city" | "size";

function matches(row: CompanyRow, f: CompanyFilters, tokens: string[], skip?: Skip) {
  if (!segmentPasses(row, f.seg)) return false;
  if (tokens.length > 0) {
    const name = foldTitle(row.name);
    if (!tokens.every((token) => name.includes(token))) return false;
  }
  if (skip !== "sector" && f.sector && (row.sector ?? NO_VALUE) !== f.sector) return false;
  if (skip !== "city" && f.city && (row.city ?? NO_VALUE) !== f.city) return false;
  if (skip !== "size" && f.size && sizeOf(row.contacts) !== f.size) return false;
  return true;
}

export const queryTokens = (q: string) => foldTitle(q).split(/\s+/).filter(Boolean);

export function filterRows(rows: CompanyRow[], f: CompanyFilters) {
  const tokens = queryTokens(f.q);
  return rows.filter((row) => matches(row, f, tokens));
}

export function sortRows(rows: CompanyRow[], f: CompanyFilters) {
  const sign = f.dir === "asc" ? 1 : -1;
  const text = (a: string | null, b: string | null) => (a ?? "￿").localeCompare(b ?? "￿", "tr");
  const value = (r: CompanyRow): number => {
    switch (f.sort) {
      case "contacts":
        return r.contacts;
      case "open":
        return r.openDeals;
      case "won":
        return r.wonDeals;
      case "wonAmount":
        return r.wonAmount;
      case "created":
        return r.createdAt.getTime();
      default:
        return 0;
    }
  };
  return [...rows].sort((a, b) => {
    let d = 0;
    if (f.sort === "name") d = text(a.name, b.name);
    else if (f.sort === "sector") d = text(a.sector, b.sector);
    else if (f.sort === "city") d = text(a.city, b.city);
    else d = value(a) - value(b);
    return d !== 0 ? sign * d : a.name.localeCompare(b.name, "tr");
  });
}

export type FacetItem = { key: string; label: string; color: string; count: number };

// Each facet is counted against every other active filter (and the segment) but not against itself.
export function computeFacets(rows: CompanyRow[], f: CompanyFilters) {
  const tokens = queryTokens(f.q);
  const sectors = new Map<string, number>();
  const cities = new Map<string, number>();
  const sizes = new Map<string, number>();

  for (const row of rows) {
    if (matches(row, f, tokens, "sector")) {
      const key = row.sector ?? NO_VALUE;
      sectors.set(key, (sectors.get(key) ?? 0) + 1);
    }
    if (matches(row, f, tokens, "city")) {
      const key = row.city ?? NO_VALUE;
      cities.set(key, (cities.get(key) ?? 0) + 1);
    }
    if (matches(row, f, tokens, "size")) {
      const key = sizeOf(row.contacts);
      sizes.set(key, (sizes.get(key) ?? 0) + 1);
    }
  }

  const byCount = (a: FacetItem, b: FacetItem) => b.count - a.count || a.label.localeCompare(b.label, "tr");
  const build = (map: Map<string, number>, color: string, empty: string, active: string): FacetItem[] => {
    const items = [...map.entries()].map(([key, count]) => ({
      key,
      label: key === NO_VALUE ? empty : key,
      color: key === NO_VALUE ? "#94a3b8" : color,
      count,
    }));
    if (active && !map.has(active)) {
      items.push({ key: active, label: active === NO_VALUE ? empty : active, color, count: 0 });
    }
    return items.sort(byCount);
  };

  return {
    sectors: build(sectors, "#0f766e", "Sektör girilmemiş", f.sector),
    cities: build(cities, "#2563eb", "Şehir girilmemiş", f.city),
    sizes: SIZES.map((s) => ({ key: s.key, label: s.label, color: s.color, count: sizes.get(s.key) ?? 0 })).filter(
      (i) => i.count > 0 || i.key === f.size,
    ),
  };
}

export function computeStats(rows: CompanyRow[]) {
  const dupGroups = new Set<string>();
  let withContacts = 0;
  let withOpen = 0;
  let customers = 0;
  let withSector = 0;
  let withCity = 0;
  let withWebsite = 0;
  let withPhone = 0;
  for (const row of rows) {
    if (row.contacts > 0) withContacts += 1;
    if (row.openDeals > 0) withOpen += 1;
    if (row.wonDeals > 0) customers += 1;
    if (row.sector) withSector += 1;
    if (row.city) withCity += 1;
    if (row.hasWebsite) withWebsite += 1;
    if (row.hasPhone) withPhone += 1;
    if (row.dupCount > 1) dupGroups.add(row.dupKey);
  }
  const segmentCounts: Record<SegmentKey, number> = {
    all: rows.length,
    contacts: withContacts,
    nocontacts: rows.length - withContacts,
    open: withOpen,
    won: customers,
    nosector: rows.length - withSector,
    dup: rows.filter((r) => r.dupCount > 1).length,
  };
  return {
    stats: {
      total: rows.length,
      withContacts,
      withOpen,
      customers,
      withSector,
      withCity,
      withWebsite,
      withPhone,
      dupGroups: dupGroups.size,
    },
    segmentCounts,
  };
}

export function monthlyAdds(rows: CompanyRow[], months = 12) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.createdAt < from) continue;
    const key = `${row.createdAt.getUTCFullYear()}-${row.createdAt.getUTCMonth()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    return { key, month: d.getUTCMonth(), count: counts.get(key) ?? 0 };
  });
}

// Companies that look like the same firm written differently ("Akbank", "AKBANK T.A.Ş.").
export function duplicateGroups(rows: CompanyRow[], limit = 6) {
  const groups = new Map<string, CompanyRow[]>();
  for (const row of rows) {
    if (row.dupCount < 2) continue;
    const list = groups.get(row.dupKey);
    if (list) list.push(row);
    else groups.set(row.dupKey, [row]);
  }
  return [...groups.values()]
    .sort((a, b) => b.length - a.length || a[0].name.localeCompare(b[0].name, "tr"))
    .slice(0, limit);
}
