import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildCompanyWhere } from "@/lib/company-filters";
import { xlsxResponse, todayStamp } from "@/lib/export";

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const companies = await prisma.company.findMany({
    where: buildCompanyWhere(q),
    include: {
      owner: { select: { name: true } },
      _count: { select: { contacts: true, deals: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = companies.map((company) => ({
    Firma: company.name,
    Website: company.website ?? "",
    Telefon: company.phone ?? "",
    Şehir: company.city ?? "",
    Sektör: company.sector ?? "",
    "Kişi Sayısı": company._count.contacts,
    "Fırsat Sayısı": company._count.deals,
    Sahip: company.owner.name,
    Notlar: company.notes ?? "",
  }));

  return xlsxResponse(`firmalar-${todayStamp()}.xlsx`, "Firmalar", rows);
}
