import fs from "fs";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Kullanım: tsx prisma/import-nimble-deals.ts <csv-yolu>");
  process.exit(1);
}

function norm(name: string) {
  return name.trim().toLowerCase();
}

function parseAmount(value: string | undefined) {
  const num = Number((value ?? "").trim());
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function parseDate(value: string | undefined) {
  if (!value?.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

async function main() {
  const pipeline = await prisma.pipeline.findFirst({ include: { stages: true } });
  if (!pipeline) throw new Error("Pipeline bulunamadı.");

  const wonStage = pipeline.stages.find((s) => s.isWon);
  const lostStage = pipeline.stages.find((s) => s.isLost);
  const openStage =
    pipeline.stages.find((s) => s.name === "Teklif") ??
    pipeline.stages.find((s) => !s.isWon && !s.isLost);
  if (!wonStage || !lostStage || !openStage) throw new Error("Aşamalar eksik.");

  const fallbackOwner = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  if (!fallbackOwner) throw new Error("Sahip olacak bir yönetici kullanıcı bulunamadı.");

  const users = await prisma.user.findMany();
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

  const contacts = await prisma.contact.findMany({ select: { id: true, firstName: true, lastName: true } });
  const contactByName = new Map(contacts.map((c) => [norm(`${c.firstName} ${c.lastName}`), c.id]));
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const companyByName = new Map(companies.map((c) => [norm(c.name), c.id]));

  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const { data: rows } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  let created = 0;
  for (const row of rows) {
    const title = row["Deal name"]?.trim();
    if (!title) continue;

    const status = row["Deal status"]?.trim().toLowerCase();
    const stage = status === "won" ? wonStage : status === "lost" ? lostStage : openStage;
    const dbStatus = status === "won" ? "WON" : status === "lost" ? "LOST" : "OPEN";

    const ownerEmail = (row["Deal owner"] || row["Deal Creator"] || "").trim().toLowerCase();
    const ownerId = userByEmail.get(ownerEmail) ?? fallbackOwner.id;

    const related = norm(row["Related nimble contact 1"] || "");
    const contactId = related ? contactByName.get(related) ?? null : null;
    const companyId = !contactId && related ? companyByName.get(related) ?? null : null;

    const createdAt = parseDate(row["Date created"]) ?? undefined;

    await prisma.deal.create({
      data: {
        title,
        amount: parseAmount(row["Amount"]),
        pipelineId: pipeline.id,
        stageId: stage.id,
        status: dbStatus,
        contactId,
        companyId,
        ownerId,
        ...(createdAt ? { createdAt } : {}),
      },
    });
    created += 1;
  }

  console.log(`Tamamlandı. Aktarılan fırsat: ${created}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
