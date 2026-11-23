import { requireUser } from "@/lib/session";
import { xlsxResponse, todayStamp } from "@/lib/export";
import { filterRows, loadCompanyRows, parseCompanyFilters, sortRows } from "@/lib/company-analysis";

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const filters = parseCompanyFilters(Object.fromEntries(searchParams));
  const rows = sortRows(filterRows(await loadCompanyRows(), filters), filters).map((row) => ({
    Firma: row.name,
    Sektör: row.sector ?? "",
    Şehir: row.city ?? "",
    "Kişi sayısı": row.contacts,
    "Açık fırsat": row.openDeals,
    "Kazanılan fırsat": row.wonDeals,
    "Kazanılan tutar (TL)": row.wonAmount,
    "Kaybedilen fırsat": row.lostDeals,
    "Web sitesi": row.hasWebsite ? "Var" : "",
    Telefon: row.hasPhone ? "Var" : "",
    "Olası mükerrer": row.dupCount > 1 ? "Evet" : "",
    Sahip: row.owner,
    Eklenme: row.createdAt.toISOString().slice(0, 10),
  }));

  return xlsxResponse(`firma-analizi-${todayStamp()}.xlsx`, "Firma Analizi", rows);
}
