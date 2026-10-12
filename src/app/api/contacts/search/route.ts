import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fullName } from "@/lib/format";
import { searchContacts } from "@/lib/search";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const contacts = q
    ? await searchContacts(q, 20)
    : await prisma.contact.findMany({
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 20,
      });

  return NextResponse.json(
    contacts.map((contact) => ({ id: contact.id, label: fullName(contact.firstName, contact.lastName) })),
  );
}
