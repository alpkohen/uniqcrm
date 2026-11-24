// Copies the companies marked as RAISE targets in UNIQ into the RAISE database, each with a
// card in the "Hedef" stage of the "Hedef firmalar" pipeline. Only name, sector, city, website
// and phone go across: no training history, deals, notes or revenue.
//
//   UNIQ_DATABASE_URL=<UNIQ db> DATABASE_URL=<RAISE db> npx tsx prisma/transfer-raise-targets.ts <owner e-posta> [--with-contacts] [--dry-run]
//
// --with-contacts also copies the people at those companies (name, title, e-mail, phone, city).
// Leave it off to send the company list only (see the note on personal data in the setup guide).
// Safe to re-run: a company already in RAISE (same normalized name) is skipped.
import { PrismaClient } from "@prisma/client";
import { normalizeCompanyName } from "../src/lib/company-name";

const RAISE_PIPELINE = "Hedef firmalar";

async function main() {
  const args = process.argv.slice(2);
  const ownerEmail = args.find((a) => !a.startsWith("--"))?.toLowerCase();
  const withContacts = args.includes("--with-contacts");
  const dryRun = args.includes("--dry-run");
  if (!ownerEmail) throw new Error("Kartların sahibi olacak RAISE kullanıcısının e-postasını verin.");
  if (!process.env.UNIQ_DATABASE_URL || !process.env.DATABASE_URL) throw new Error("UNIQ_DATABASE_URL ve DATABASE_URL gerekli.");
  if (process.env.UNIQ_DATABASE_URL === process.env.DATABASE_URL) throw new Error("İki adres aynı: RAISE veritabanını gösterin.");

  const uniq = new PrismaClient({ datasources: { db: { url: process.env.UNIQ_DATABASE_URL } } });
  const raise = new PrismaClient();
  try {
    const owner = await raise.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) throw new Error(`RAISE'te ${ownerEmail} kullanıcısı yok (önce setup-raise.ts).`);
    const pipeline = await raise.pipeline.findFirst({
      where: { name: RAISE_PIPELINE },
      include: { stages: { orderBy: { sortOrder: "asc" } } },
    });
    if (!pipeline?.stages[0]) throw new Error(`RAISE'te "${RAISE_PIPELINE}" hattı yok (önce setup-raise.ts).`);

    const targets = await uniq.company.findMany({
      where: { raiseTarget: true },
      include: {
        // take: 0 fetches no people when only the company list is wanted.
        contacts: {
          select: { firstName: true, lastName: true, title: true, email: true, phone: true, city: true },
          ...(withContacts ? {} : { take: 0 }),
        },
      },
      orderBy: { name: "asc" },
    });
    const existing = new Set((await raise.company.findMany({ select: { name: true } })).map((c) => normalizeCompanyName(c.name)));

    let companies = 0;
    let contacts = 0;
    for (const t of targets) {
      if (existing.has(normalizeCompanyName(t.name))) {
        console.log(`atlandı (zaten var): ${t.name}`);
        continue;
      }
      const people = t.contacts;
      console.log(`${dryRun ? "[deneme] " : ""}${t.name}${withContacts ? ` (${people.length} kişi)` : ""}`);
      companies += 1;
      contacts += people.length;
      if (dryRun) continue;
      const company = await raise.company.create({
        data: { name: t.name, sector: t.sector, city: t.city, website: t.website, phone: t.phone, ownerId: owner.id },
      });
      for (const p of people) {
        await raise.contact.create({ data: { ...p, companyId: company.id, ownerId: owner.id } });
      }
      await raise.deal.create({
        data: {
          title: `${t.name} · RAISE`,
          pipelineId: pipeline.id,
          stageId: pipeline.stages[0].id,
          companyId: company.id,
          ownerId: owner.id,
        },
      });
      existing.add(normalizeCompanyName(t.name));
    }
    console.log(`\n${dryRun ? "Deneme: " : ""}${companies} firma${withContacts ? `, ${contacts} kişi` : ""} ${dryRun ? "aktarılacak" : "aktarıldı"} (UNIQ'te işaretli: ${targets.length}).`);
  } finally {
    await uniq.$disconnect();
    await raise.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
