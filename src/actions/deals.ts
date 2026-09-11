"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { deleteDealAttachmentFile, saveDealAttachment } from "@/lib/storage";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

export async function createDeal(formData: FormData) {
  const user = await requireUser();
  const title = str(formData, "title");
  const pipelineId = str(formData, "pipelineId");
  const stageId = str(formData, "stageId");
  if (!title || !pipelineId || !stageId) {
    throw new Error("Başlık ve aşama gerekli.");
  }

  const amount = Number(formData.get("amount") ?? 0) || 0;
  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  const status = stage?.isWon ? "WON" : stage?.isLost ? "LOST" : "OPEN";

  await prisma.deal.create({
    data: {
      title,
      amount,
      pipelineId,
      stageId,
      status,
      contactId: str(formData, "contactId"),
      companyId: str(formData, "companyId"),
      ownerId: str(formData, "ownerId") ?? user.id,
    },
  });

  revalidatePath("/deals");
  revalidatePath("/");
}

export async function moveDeal(dealId: string, stageId: string) {
  await requireUser();
  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  if (!stage) return;

  const status = stage.isWon ? "WON" : stage.isLost ? "LOST" : "OPEN";
  await prisma.deal.update({
    where: { id: dealId },
    data: { stageId, status, pipelineId: stage.pipelineId },
  });

  revalidatePath("/deals");
  revalidatePath("/");
}

export async function deleteDeal(dealId: string) {
  await requireUser();
  await prisma.deal.delete({ where: { id: dealId } });
  revalidatePath("/deals");
  revalidatePath("/");
}

export async function updateDeal(dealId: string, formData: FormData) {
  await requireUser();
  const title = str(formData, "title");
  const stageId = str(formData, "stageId");
  if (!title || !stageId) throw new Error("Başlık ve aşama gerekli.");

  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  const status = stage?.isWon ? "WON" : stage?.isLost ? "LOST" : "OPEN";
  const amount = Number(formData.get("amount") ?? 0) || 0;

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      title,
      amount,
      stageId,
      status,
      pipelineId: stage?.pipelineId,
      contactId: str(formData, "contactId"),
      companyId: str(formData, "companyId"),
      ownerId: str(formData, "ownerId") ?? undefined,
    },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  revalidatePath("/");
}

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

export async function uploadDealAttachment(dealId: string, formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Dosya seçilmedi.");
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("Sadece PDF veya Word dosyaları yüklenebilir.");
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Dosya 15 MB sınırını aşıyor.");
  }

  const storedName = await saveDealAttachment(dealId, file);
  await prisma.dealAttachment.create({
    data: {
      dealId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storedName,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function deleteDealAttachment(attachmentId: string) {
  await requireUser();
  const attachment = await prisma.dealAttachment.delete({ where: { id: attachmentId } });
  await deleteDealAttachmentFile(attachment.dealId, attachment.storedName);
  revalidatePath(`/deals/${attachment.dealId}`);
}

export async function createWorkflowCard(boardId: string, formData: FormData) {
  const user = await requireUser();
  const title = str(formData, "title");
  const columnId = str(formData, "columnId");
  if (!title || !columnId) throw new Error("Başlık ve sütun gerekli.");

  const max = await prisma.workflowCard.aggregate({
    where: { columnId },
    _max: { sortOrder: true },
  });

  await prisma.workflowCard.create({
    data: {
      boardId,
      columnId,
      title,
      notes: str(formData, "notes"),
      contactId: str(formData, "contactId"),
      companyId: str(formData, "companyId"),
      ownerId: str(formData, "ownerId") ?? user.id,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/workflows");
  revalidatePath(`/workflows/${boardId}`);
}

export async function moveWorkflowCard(cardId: string, columnId: string) {
  await requireUser();
  const card = await prisma.workflowCard.update({
    where: { id: cardId },
    data: { columnId },
  });
  revalidatePath(`/workflows/${card.boardId}`);
  revalidatePath("/workflows");
}

export async function deleteWorkflowCard(cardId: string) {
  await requireUser();
  const card = await prisma.workflowCard.delete({ where: { id: cardId } });
  revalidatePath(`/workflows/${card.boardId}`);
}
