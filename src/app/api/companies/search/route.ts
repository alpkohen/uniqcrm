import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { searchCompanies } from "@/lib/search";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const companies = q
    ? await searchCompanies(q, 20)
    : await prisma.company.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 20,
      });

  return NextResponse.json(companies.map((company) => ({ id: company.id, label: company.name })));
}
