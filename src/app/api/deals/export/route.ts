import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { xlsxResponse, todayStamp } from "@/lib/export";
import { dealStatusLabel, fullName } from "@/lib/format";
import { parseDealRange } from "@/lib/deal-range";

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const range = parseDealRange({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    by: searchParams.get("by") ?? undefined,
  });

  const deals = await prisma.deal.findMany({
    where: range.where,
    include: {
      stage: { select: { name: true } },
      company: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
      owner: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = deals.map((deal) => ({
    Başlık: deal.title,
    Tutar: deal.amount,
    "Para Birimi": deal.currency,
    Durum: dealStatusLabel(deal.status),
    Aşama: deal.stage.name,
    Firma: deal.company?.name ?? "",
    Kişi: deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : "",
    Sahip: deal.owner.name,
    Oluşturulma: deal.createdAt.toISOString().slice(0, 10),
    "Son güncelleme": deal.updatedAt.toISOString().slice(0, 10),
  }));

  return xlsxResponse(`firsatlar-${todayStamp()}.xlsx`, "Fırsatlar", rows);
}
