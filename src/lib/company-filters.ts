import type { Prisma } from "@prisma/client";

export function buildCompanyWhere(q: string): Prisma.CompanyWhereInput | undefined {
  return q
    ? {
        OR: [
          { name: { contains: q } },
          { city: { contains: q } },
          { sector: { contains: q } },
        ],
      }
    : undefined;
}
