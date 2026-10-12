import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { fullName } from "@/lib/format";
import { searchCompanies, searchContacts, searchDeals } from "@/lib/search";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ contacts: [], companies: [], deals: [] });
  }

  const [contacts, companies, deals] = await Promise.all([
    searchContacts(q, 6),
    searchCompanies(q, 5),
    searchDeals(q, 5),
  ]);

  return NextResponse.json({
    contacts: contacts.map((c) => ({ id: c.id, label: fullName(c.firstName, c.lastName), sub: c.email ?? "" })),
    companies: companies.map((c) => ({ id: c.id, label: c.name })),
    deals: deals.map((d) => ({ id: d.id, label: d.title })),
  });
}
