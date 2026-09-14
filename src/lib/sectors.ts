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
