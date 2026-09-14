import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const companies = await prisma.company.findMany({
    where: q ? { name: { contains: q } } : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json(companies.map((company) => ({ id: company.id, label: company.name })));
}
