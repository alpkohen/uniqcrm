import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), "prisma", "data-dump.json");

async function main() {
  const dump = {
    users: await prisma.user.findMany(),
    companies: await prisma.company.findMany(),
    contacts: await prisma.contact.findMany(),
    tags: await prisma.tag.findMany(),
    contactTags: await prisma.contactTag.findMany(),
    customFields: await prisma.customField.findMany(),
    activities: await prisma.activity.findMany(),
    tasks: await prisma.task.findMany(),
    meetings: await prisma.meeting.findMany(),
    pipelines: await prisma.pipeline.findMany(),
    pipelineStages: await prisma.pipelineStage.findMany(),
    deals: await prisma.deal.findMany(),
    dealAttachments: await prisma.dealAttachment.findMany(),
    workflowBoards: await prisma.workflowBoard.findMany(),
    workflowColumns: await prisma.workflowColumn.findMany(),
    workflowCards: await prisma.workflowCard.findMany(),
  };

  fs.writeFileSync(OUT, JSON.stringify(dump, null, 2));
  for (const [key, value] of Object.entries(dump)) {
    console.log(`${key}: ${(value as unknown[]).length}`);
  }
  console.log(`\nYazıldı: ${OUT}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
