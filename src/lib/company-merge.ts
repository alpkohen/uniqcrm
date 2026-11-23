import "server-only";

import type { CompanyRow } from "@/lib/company-analysis";

export type MergeMember = {
  id: string;
  name: string;
  sector: string | null;
  city: string | null;
  contacts: number;
  deals: number;
};

export type MergeGroup = {
  key: string;
  members: MergeMember[];
  suggestedId: string;
};

// Groups of companies that normalise to the same name, each with a suggested company to keep:
// the one with the most people, then the most deals, then the most complete record, then the oldest.
export function buildMergeGroups(rows: CompanyRow[]): MergeGroup[] {
  const byKey = new Map<string, CompanyRow[]>();
  for (const row of rows) {
    if (row.dupCount < 2) continue;
    const list = byKey.get(row.dupKey);
    if (list) list.push(row);
    else byKey.set(row.dupKey, [row]);
  }

  const completeness = (r: CompanyRow) => (r.sector ? 1 : 0) + (r.city ? 1 : 0) + (r.hasWebsite ? 1 : 0) + (r.hasPhone ? 1 : 0);
  const rank = (a: CompanyRow, b: CompanyRow) =>
    b.contacts - a.contacts ||
    b.openDeals + b.wonDeals + b.lostDeals - (a.openDeals + a.wonDeals + a.lostDeals) ||
    completeness(b) - completeness(a) ||
    a.createdAt.getTime() - b.createdAt.getTime();

  return [...byKey.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort(rank);
      return {
        key,
        suggestedId: sorted[0].id,
        members: sorted.map((r) => ({
          id: r.id,
          name: r.name,
          sector: r.sector,
          city: r.city,
          contacts: r.contacts,
          deals: r.openDeals + r.wonDeals + r.lostDeals,
        })),
      };
    })
    .sort((a, b) => a.members[0].name.localeCompare(b.members[0].name, "tr"));
}
