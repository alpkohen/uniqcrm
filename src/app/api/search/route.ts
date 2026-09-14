import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fullName } from "@/lib/format";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ contacts: [], companies: [], deals: [] });
  }

  const [contacts, companies, deals] = await Promise.all([
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 5,
    }),
    prisma.company.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.deal.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    contacts: contacts.map((c) => ({ id: c.id, label: fullName(c.firstName, c.lastName), sub: c.email ?? "" })),
    companies: companies.map((c) => ({ id: c.id, label: c.name })),
    deals: deals.map((d) => ({ id: d.id, label: d.title })),
  });
}
