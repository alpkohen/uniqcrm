import type { Prisma } from "@prisma/client";
import { searchCompanyIds } from "@/lib/search";

export async function buildCompanyWhere(q: string): Promise<Prisma.CompanyWhereInput | undefined> {
  const ids = q ? await searchCompanyIds(q, true) : null;
  return ids ? { id: { in: ids } } : undefined;
}
