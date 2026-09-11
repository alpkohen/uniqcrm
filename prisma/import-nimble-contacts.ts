import fs from "fs";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Kullanım: tsx prisma/import-nimble-contacts.ts <csv-yolu>");
  process.exit(1);
}

const CUSTOM_FIELDS = [
  {
    key: "genel_bolum",
    label: "Genel bölüm / iş alanı",
    type: "SELECT",
    options: [
      "İnsan Kaynakları",
      "Proje / Süreç / Değişim Yönetimi",
      "Çağrı Merkezi - Operasyon",
      "Eğitim",
      "Üst Düzey Yönetim",
      "Call Center - CX",
      "Satış / İş Geliştirme",
      "CX",
      "Çağrı Merkezi - Üst Yönetim",
      "Call Center",
      "Çağrı Merkezi - IK & Eğitim",
      "Diğer",
    ],
    sortOrder: 1,
  },
  { key: "karar_verici", label: "Karar verici", type: "BOOLEAN", options: [], sortOrder: 2 },
  { key: "onceden_teklif", label: "Önceden teklif verilmiş mi?", type: "BOOLEAN", options: [], sortOrder: 3 },
  { key: "tarihce_var", label: "Tarihçesi var mı", type: "BOOLEAN", options: [], sortOrder: 4 },
  { key: "mail_izni_yok", label: "Mail almak istemiyor", type: "BOOLEAN", options: [], sortOrder: 5 },
  { key: "linkedin", label: "LinkedIn", type: "TEXT", options: [], sortOrder: 6 },
  { key: "son_iletisim", label: "Son iletişim", type: "DATE", options: [], sortOrder: 7 },
];

function norm(name: string) {
  return name.trim().toLowerCase();
}

function yesNo(value: string | undefined, yesWord: string) {
  return value?.trim() === yesWord ? "true" : "false";
}

function parseUsDate(value: string | undefined) {
  if (!value?.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function main() {
  const ownerRecord = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  if (!ownerRecord) throw new Error("Sahip olacak bir yönetici kullanıcı bulunamadı.");
  const owner = ownerRecord;

  for (const field of CUSTOM_FIELDS) {
    await prisma.customField.upsert({
      where: { key: field.key },
      update: { label: field.label, type: field.type, options: JSON.stringify(field.options), sortOrder: field.sortOrder },
      create: { key: field.key, label: field.label, type: field.type, options: JSON.stringify(field.options), sortOrder: field.sortOrder },
    });
  }
  await prisma.customField.deleteMany({ where: { key: { in: ["kaynak", "egitim_ilgisi", "dil"] } } });

  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const { data: rows } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const companyCache = new Map<string, string>();
  for (const company of await prisma.company.findMany()) {
    companyCache.set(norm(company.name), company.id);
  }
  const tagCache = new Map<string, string>();
  for (const tag of await prisma.tag.findMany()) {
    tagCache.set(tag.name, tag.id);
  }

  async function getOrCreateCompany(name: string, sector: string | null) {
    const key = norm(name);
    const cached = companyCache.get(key);
    if (cached) return cached;
    const created = await prisma.company.create({
      data: { name: name.trim(), sector: sector || null, ownerId: owner.id },
    });
    companyCache.set(key, created.id);
    return created.id;
  }

  async function getOrCreateTag(name: string) {
    const cached = tagCache.get(name);
    if (cached) return cached;
    const created = await prisma.tag.create({ data: { name } });
    tagCache.set(name, created.id);
    return created.id;
  }

  let created = 0;
  let skippedNoName = 0;

  for (const row of rows) {
    const firstName = row["first name"]?.trim() ?? "";
    const lastName = row["last name"]?.trim() ?? "";
    if (!firstName && !lastName) {
      skippedNoName += 1;
      continue;
    }

    const employer = row["contact employment 1 - company_name"]?.trim() || row["company"]?.trim();
    const industry = row["industry"]?.trim() || null;
    const companyId = employer ? await getOrCreateCompany(employer, industry) : null;

    const email =
      (row["work email 1"] || row["other email 1"] || row["other email 2"] || "").trim().toLowerCase() || null;
    const phone = (row["mobile phone"] || row["work phone 1"] || row["other phone"] || "").trim() || null;
    const title = (row["position"] || row["contact employment 1 - title"] || "").trim() || null;
    const city =
      (row["work address 1 - city"] ||
        row["other address 1 - city"] ||
        row["home address 1 - city"] ||
        row["discovered related address 1 - city"] ||
        "").trim() || null;

    const customData: Record<string, string> = {};
    if (row["genel bölüm / i̇ş alanı"]?.trim()) customData.genel_bolum = row["genel bölüm / i̇ş alanı"].trim();
    if (row["karar verici"]?.trim()) customData.karar_verici = yesNo(row["karar verici"], "Evet");
    if (row["önceden teklif verilmiş mi?"]?.trim())
      customData.onceden_teklif = yesNo(row["önceden teklif verilmiş mi?"], "Evet");
    if (row["tarihçe durumu"]?.trim()) customData.tarihce_var = yesNo(row["tarihçe durumu"], "Var");
    if (row["mail almak i̇stemiyor"]?.trim()) customData.mail_izni_yok = "true";
    if (row["linkedin 1"]?.trim()) customData.linkedin = row["linkedin 1"].trim();
    const lastContacted = parseUsDate(row["Last contacted by team"] || row["Last contacted by me"]);
    if (lastContacted) customData.son_iletisim = lastContacted;

    const tagIds: string[] = [];
    for (let i = 1; i <= 6; i += 1) {
      const value = row[`Tag ${i}`]?.trim();
      if (value) tagIds.push(await getOrCreateTag(value));
    }

    await prisma.contact.create({
      data: {
        firstName: firstName || lastName,
        lastName: lastName || firstName,
        email,
        phone,
        title,
        city,
        companyId,
        ownerId: owner.id,
        customData: JSON.stringify(customData),
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });

    created += 1;
    if (created % 1000 === 0) console.log(`${created} kişi aktarıldı...`);
  }

  console.log(`Tamamlandı. Aktarılan: ${created}, isim yok diye atlanan: ${skippedNoName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
