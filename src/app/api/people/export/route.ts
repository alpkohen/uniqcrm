import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fullName } from "@/lib/format";
import { xlsxResponse, todayStamp } from "@/lib/export";
import { buildPeopleWhere, loadSnapshot, needsTitleFilter, parsePeopleFilters } from "@/lib/people";
import { classifyTitle, deptMeta, levelMeta } from "@/lib/title-groups";

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const filters = parsePeopleFilters(Object.fromEntries(searchParams));

  const snapshot = needsTitleFilter(filters) ? await loadSnapshot() : null;
  const contacts = await prisma.contact.findMany({
    where: buildPeopleWhere(filters, snapshot),
    include: { company: { select: { name: true, sector: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = contacts.map((contact) => {
    const cls = classifyTitle(contact.title);
    return {
      Ad: fullName(contact.firstName, contact.lastName),
      Ünvan: contact.title ?? "",
      "Unvan grubu": levelMeta(cls.level).label,
      Bölüm: deptMeta(cls.dept).label,
      "E-posta": contact.email ?? "",
      Telefon: contact.phone ?? "",
      Firma: contact.company?.name ?? "",
      Sektör: contact.company?.sector ?? "",
      Şehir: contact.city ?? "",
    };
  });

  return xlsxResponse(`kisi-analizi-${todayStamp()}.xlsx`, "Kişi Analizi", rows);
}
