import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const IN = path.join(process.cwd(), "prisma", "data-dump.json");
const CHUNK = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadMany(label: string, rows: unknown[], createMany: (data: unknown[]) => Promise<{ count: number }>) {
  let total = 0;
  for (const part of chunk(rows, CHUNK)) {
    if (part.length === 0) continue;
    const result = await createMany(part);
    total += result.count;
  }
  console.log(`${label}: ${total}`);
}

async function main() {
  const dump = JSON.parse(fs.readFileSync(IN, "utf-8"));

  await loadMany("users", dump.users, (data) => prisma.user.createMany({ data: data as any }));
  await loadMany("companies", dump.companies, (data) => prisma.company.createMany({ data: data as any }));
  await loadMany("tags", dump.tags, (data) => prisma.tag.createMany({ data: data as any }));
  await loadMany("customFields", dump.customFields, (data) => prisma.customField.createMany({ data: data as any }));
  await loadMany("contacts", dump.contacts, (data) => prisma.contact.createMany({ data: data as any }));
  await loadMany("contactTags", dump.contactTags, (data) => prisma.contactTag.createMany({ data: data as any }));
  await loadMany("pipelines", dump.pipelines, (data) => prisma.pipeline.createMany({ data: data as any }));
  await loadMany("pipelineStages", dump.pipelineStages, (data) => prisma.pipelineStage.createMany({ data: data as any }));
  await loadMany("deals", dump.deals, (data) => prisma.deal.createMany({ data: data as any }));
  await loadMany("dealAttachments", dump.dealAttachments, (data) => prisma.dealAttachment.createMany({ data: data as any }));
  await loadMany("activities", dump.activities, (data) => prisma.activity.createMany({ data: data as any }));
  await loadMany("tasks", dump.tasks, (data) => prisma.task.createMany({ data: data as any }));
  await loadMany("meetings", dump.meetings, (data) => prisma.meeting.createMany({ data: data as any }));
  await loadMany("workflowBoards", dump.workflowBoards, (data) => prisma.workflowBoard.createMany({ data: data as any }));
  await loadMany("workflowColumns", dump.workflowColumns, (data) => prisma.workflowColumn.createMany({ data: data as any }));
  await loadMany("workflowCards", dump.workflowCards, (data) => prisma.workflowCard.createMany({ data: data as any }));

  console.log("\nTamamlandı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
