import fs from "fs";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Kullanım: tsx prisma/import-nimble-companies.ts <csv-yolu>");
  process.exit(1);
}

function norm(name: string) {
  return name.trim().toLowerCase();
}

async function main() {
  const owner = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  if (!owner) throw new Error("Sahip olacak bir yönetici kullanıcı bulunamadı.");

  const companyCache = new Map<string, string>();
  for (const company of await prisma.company.findMany()) {
    companyCache.set(norm(company.name), company.id);
  }

  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const { data: rows } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  let created = 0;
  let skippedHasName = 0;
  let skippedExists = 0;

  for (const row of rows) {
    const hasPersonName = row["first name"]?.trim() || row["last name"]?.trim();
    const companyName = row["company"]?.trim();
    if (hasPersonName || !companyName) {
      skippedHasName += 1;
      continue;
    }

    const key = norm(companyName);
    if (companyCache.has(key)) {
      skippedExists += 1;
      continue;
    }

    const industry = row["industry"]?.trim() || null;
    const created_ = await prisma.company.create({
      data: { name: companyName, sector: industry, ownerId: owner.id },
    });
    companyCache.set(key, created_.id);
    created += 1;
  }

  console.log(`Tamamlandı. Yeni firma: ${created}, zaten kişi bağlantısı olan satır: ${skippedHasName}, zaten mevcuttu: ${skippedExists}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
