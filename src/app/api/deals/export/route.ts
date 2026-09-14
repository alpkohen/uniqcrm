import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { xlsxResponse, todayStamp } from "@/lib/export";
import { dealStatusLabel, fullName } from "@/lib/format";

export async function GET() {
  await requireUser();

  const deals = await prisma.deal.findMany({
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
  }));

  return xlsxResponse(`firsatlar-${todayStamp()}.xlsx`, "Fırsatlar", rows);
}
