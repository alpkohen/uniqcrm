import { prisma } from "@/lib/prisma";

export async function listDistinctSectors(): Promise<string[]> {
  const rows = await prisma.company.findMany({
    where: { sector: { not: null } },
    select: { sector: true },
    distinct: ["sector"],
    orderBy: { sector: "asc" },
  });
  return rows.map((row) => row.sector!).filter(Boolean);
}

// Sectors can only be picked from the ones already in use; `current` lets a company keep its own legacy value.
export async function isKnownSector(sector: string, current?: string | null) {
  if (current && sector === current) return true;
  return (await listDistinctSectors()).includes(sector);
}
