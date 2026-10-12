import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildContactWhere, parseMailFilter } from "@/lib/contact-filters";
import { isMailOptOut } from "@/lib/mail-optout";
import { fullName } from "@/lib/format";
import { xlsxResponse, todayStamp } from "@/lib/export";

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const tag = searchParams.get("tag") ?? "";
  const owner = searchParams.get("owner") ?? "";
  const mail = parseMailFilter(searchParams.get("mail") ?? undefined);

  const contacts = await prisma.contact.findMany({
    where: await buildContactWhere({ q, tag, owner, mail }),
    include: {
      company: { select: { name: true } },
      owner: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = contacts.map((contact) => ({
    Ad: fullName(contact.firstName, contact.lastName),
    Ünvan: contact.title ?? "",
    "E-posta": contact.email ?? "",
    Telefon: contact.phone ?? "",
    Şehir: contact.city ?? "",
    Firma: contact.company?.name ?? "",
    Etiketler: contact.tags.map(({ tag: item }) => item.name).join(", "),
    "Mail almak istemiyor": isMailOptOut(contact.customData) ? "Evet" : "",
    Sahip: contact.owner.name,
  }));

  return xlsxResponse(`kisiler-${todayStamp()}.xlsx`, "Kişiler", rows);
}
