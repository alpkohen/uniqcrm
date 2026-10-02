import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildContactWhere } from "@/lib/contact-filters";
import {
  DECISION_LEVELS,
  DEPTS,
  LEVELS,
  classifyTitle,
  isDeptKey,
  isLevelKey,
  type DeptKey,
  type LevelKey,
} from "@/lib/title-groups";

export const SEGMENTS = [
  { key: "all", label: "Tümü" },
  { key: "decision", label: "Karar vericiler" },
  { key: "email", label: "E-postası olanlar" },
  { key: "phone", label: "Telefonu olanlar" },
  { key: "nocompany", label: "Firması olmayanlar" },
  { key: "notitle", label: "Unvanı eksik" },
] as const;

export type SegmentKey = (typeof SEGMENTS)[number]["key"];

export const NO_SECTOR = "__none";

export type PeopleFilters = {
  level: LevelKey | "";
  dept: DeptKey | "";
  sector: string;
  seg: SegmentKey;
  q: string;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePeopleFilters(params: RawParams): PeopleFilters {
  const level = first(params.level) ?? "";
  const dept = first(params.dept) ?? "";
  const seg = first(params.seg) ?? "all";
  return {
    level: isLevelKey(level) ? level : "",
    dept: isDeptKey(dept) ? dept : "",
    sector: first(params.sector)?.trim() ?? "",
    seg: SEGMENTS.some((s) => s.key === seg) ? (seg as SegmentKey) : "all",
    q: first(params.q)?.trim() ?? "",
  };
}

export function needsTitleFilter(f: PeopleFilters) {
  return Boolean(f.level || f.dept || f.seg === "decision" || f.seg === "notitle");
}

// One row per distinct (title, sector, flags) combination, with how many contacts
// share it. Seniority/department/sector facets are all computed from this in memory,
// so the whole page needs a single lightweight SQL pass instead of one query per facet.
export type SnapshotRow = {
  title: string | null;
  sector: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  hasCompany: boolean;
  n: number;
};

export async function loadSnapshot(): Promise<SnapshotRow[]> {
  const rows = await prisma.$queryRaw<
    {
      title: string | null;
      sector: string | null;
      has_email: boolean;
      has_phone: boolean;
      has_company: boolean;
      n: number;
    }[]
  >`
    SELECT
      c.title AS title,
      NULLIF(co.sector, '') AS sector,
      (c.email IS NOT NULL AND c.email <> '') AS has_email,
      (c.phone IS NOT NULL AND c.phone <> '') AS has_phone,
      (c."companyId" IS NOT NULL) AS has_company,
      COUNT(*)::int AS n
    FROM "Contact" c
    LEFT JOIN "Company" co ON co.id = c."companyId"
    GROUP BY 1, 2, 3, 4, 5
  `;
  return rows.map((r) => ({
    title: r.title,
    sector: r.sector,
    hasEmail: r.has_email,
    hasPhone: r.has_phone,
    hasCompany: r.has_company,
    n: r.n,
  }));
}

function titlePasses(title: string | null, f: PeopleFilters) {
  const cls = classifyTitle(title);
  if (f.seg === "decision" && !DECISION_LEVELS.has(cls.level)) return false;
  if (f.seg === "notitle" && cls.level !== "none") return false;
  if (f.level && cls.level !== f.level) return false;
  if (f.dept && cls.dept !== f.dept) return false;
  return true;
}

type Skip = "level" | "dept" | "sector";

function rowMatches(row: SnapshotRow, f: PeopleFilters, skip?: Skip) {
  const cls = classifyTitle(row.title);
  if (f.seg === "decision" && !DECISION_LEVELS.has(cls.level)) return false;
  if (f.seg === "email" && !row.hasEmail) return false;
  if (f.seg === "phone" && !row.hasPhone) return false;
  if (f.seg === "nocompany" && row.hasCompany) return false;
  if (f.seg === "notitle" && cls.level !== "none") return false;
  if (skip !== "level" && f.level && cls.level !== f.level) return false;
  if (skip !== "dept" && f.dept && cls.dept !== f.dept) return false;
  if (skip !== "sector" && f.sector && (row.sector ?? NO_SECTOR) !== f.sector) return false;
  return true;
}

export type FacetItem = { key: string; label: string; color: string; count: number };

export type PeopleStats = {
  total: number;
  decision: number;
  withEmail: number;
  withPhone: number;
  withCompany: number;
  withTitle: number;
};

export function computePeopleStats(snapshot: SnapshotRow[]) {
  const stats: PeopleStats = { total: 0, decision: 0, withEmail: 0, withPhone: 0, withCompany: 0, withTitle: 0 };
  const segmentCounts: Record<SegmentKey, number> = {
    all: 0,
    decision: 0,
    email: 0,
    phone: 0,
    nocompany: 0,
    notitle: 0,
  };
  for (const row of snapshot) {
    const cls = classifyTitle(row.title);
    stats.total += row.n;
    if (DECISION_LEVELS.has(cls.level)) stats.decision += row.n;
    if (row.hasEmail) stats.withEmail += row.n;
    if (row.hasPhone) stats.withPhone += row.n;
    if (row.hasCompany) stats.withCompany += row.n;
    if (cls.level !== "none") stats.withTitle += row.n;
  }
  segmentCounts.all = stats.total;
  segmentCounts.decision = stats.decision;
  segmentCounts.email = stats.withEmail;
  segmentCounts.phone = stats.withPhone;
  segmentCounts.nocompany = stats.total - stats.withCompany;
  segmentCounts.notitle = stats.total - stats.withTitle;
  return { stats, segmentCounts };
}

// Each facet is counted against every active filter except its own, so picking a
// seniority group still shows how many people per department/sector are inside it.
export function computeFacets(snapshot: SnapshotRow[], f: PeopleFilters) {
  const levelCounts = new Map<string, number>();
  const deptCounts = new Map<string, number>();
  const sectorCounts = new Map<string, number>();
  let matching = 0;

  for (const row of snapshot) {
    const cls = classifyTitle(row.title);
    if (rowMatches(row, f, "level")) levelCounts.set(cls.level, (levelCounts.get(cls.level) ?? 0) + row.n);
    if (rowMatches(row, f, "dept")) deptCounts.set(cls.dept, (deptCounts.get(cls.dept) ?? 0) + row.n);
    if (rowMatches(row, f, "sector")) {
      const key = row.sector ?? NO_SECTOR;
      sectorCounts.set(key, (sectorCounts.get(key) ?? 0) + row.n);
    }
    if (rowMatches(row, f)) matching += row.n;
  }

  const byCount = (a: FacetItem, b: FacetItem) => b.count - a.count || a.label.localeCompare(b.label, "tr");

  const levels: FacetItem[] = LEVELS.map((l) => ({
    key: l.key,
    label: l.label,
    color: l.color,
    count: levelCounts.get(l.key) ?? 0,
  }))
    .filter((i) => i.count > 0 || i.key === f.level)
    .sort(byCount);

  const depts: FacetItem[] = DEPTS.map((d) => ({
    key: d.key,
    label: d.label,
    color: d.color,
    count: deptCounts.get(d.key) ?? 0,
  }))
    .filter((i) => i.count > 0 || i.key === f.dept)
    .sort(byCount);

  const sectors: FacetItem[] = [...sectorCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: key === NO_SECTOR ? "Sektör girilmemiş" : key,
      color: key === NO_SECTOR ? "#94a3b8" : "#0f766e",
      count,
    }))
    .sort(byCount);
  if (f.sector && !sectors.some((s) => s.key === f.sector)) {
    sectors.push({ key: f.sector, label: f.sector === NO_SECTOR ? "Sektör girilmemiş" : f.sector, color: "#0f766e", count: 0 });
  }

  return { levels, depts, sectors, matching };
}

export function buildPeopleWhere(f: PeopleFilters, snapshot: SnapshotRow[] | null): Prisma.ContactWhereInput {
  const and: Prisma.ContactWhereInput[] = [];

  if (f.q) and.push(buildContactWhere({ q: f.q, tag: "", owner: "" }));
  if (f.seg === "email") and.push({ AND: [{ email: { not: null } }, { email: { not: "" } }] });
  if (f.seg === "phone") and.push({ AND: [{ phone: { not: null } }, { phone: { not: "" } }] });
  if (f.seg === "nocompany") and.push({ companyId: null });

  if (f.sector) {
    and.push(
      f.sector === NO_SECTOR
        ? { OR: [{ companyId: null }, { company: { is: { sector: null } } }, { company: { is: { sector: "" } } }] }
        : { company: { is: { sector: f.sector } } }
    );
  }

  if (needsTitleFilter(f) && snapshot) {
    const titles = new Set<string>();
    for (const row of snapshot) {
      if (row.title !== null && titlePasses(row.title, f)) titles.add(row.title);
    }
    const ors: Prisma.ContactWhereInput[] = [{ title: { in: [...titles] } }];
    if (titlePasses(null, f)) ors.push({ title: null });
    and.push({ OR: ors });
  }

  return { AND: and };
}

export type MonthlyAdd = { key: string; year: number; month: number; count: number };

export async function loadMonthlyAdds(months = 12): Promise<MonthlyAdd[]> {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const rows = await prisma.$queryRaw<{ m: Date; n: number }[]>`
    SELECT date_trunc('month', "createdAt") AS m, COUNT(*)::int AS n
    FROM "Contact"
    WHERE "createdAt" >= ${from}
    GROUP BY 1
    ORDER BY 1
  `;
  const byKey = new Map(rows.map((r) => [`${r.m.getUTCFullYear()}-${r.m.getUTCMonth()}`, r.n]));
  const out: MonthlyAdd[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    out.push({ key, year: d.getUTCFullYear(), month: d.getUTCMonth(), count: byKey.get(key) ?? 0 });
  }
  return out;
}

export type TopCompany = { id: string; name: string; n: number };

export async function loadTopCompanies(limit = 8): Promise<TopCompany[]> {
  return prisma.$queryRaw<TopCompany[]>`
    SELECT co.id AS id, co.name AS name, COUNT(*)::int AS n
    FROM "Contact" c
    JOIN "Company" co ON co.id = c."companyId"
    GROUP BY co.id, co.name
    ORDER BY n DESC, co.name ASC
    LIMIT ${limit}
  `;
}
