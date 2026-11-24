import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fullName } from "@/lib/format";
import { xlsxResponse, todayStamp } from "@/lib/export";

// People at the companies marked as RAISE targets, one row per person (companies without
// people still get one row so none drops off the list).
export async function GET() {
  await requireUser();

  const companies = await prisma.company.findMany({
    where: { raiseTarget: true },
    include: {
      contacts: {
        select: { firstName: true, lastName: true, title: true, email: true, phone: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = companies.flatMap((company) => {
    const base = { Firma: company.name, Sektör: company.sector ?? "", Şehir: company.city ?? "" };
    if (company.contacts.length === 0) return [{ ...base, Kişi: "", Ünvan: "", "E-posta": "", Telefon: "" }];
    return company.contacts.map((c) => ({
      ...base,
      Kişi: fullName(c.firstName, c.lastName),
      Ünvan: c.title ?? "",
      "E-posta": c.email ?? "",
      Telefon: c.phone ?? "",
    }));
  });

  return xlsxResponse(`raise-hedefleri-${todayStamp()}.xlsx`, "RAISE hedefleri", rows);
}
