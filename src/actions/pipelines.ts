"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

export async function createStage(pipelineId: string, formData: FormData) {
  await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Aşama adı gerekli.");

  const max = await prisma.pipelineStage.aggregate({
    where: { pipelineId },
    _max: { sortOrder: true },
  });

  await prisma.pipelineStage.create({
    data: {
      pipelineId,
      name,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/deals");
}

export async function renameStage(stageId: string, formData: FormData) {
  await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Aşama adı gerekli.");

  await prisma.pipelineStage.update({
    where: { id: stageId },
    data: { name },
  });

  revalidatePath("/deals");
}

export async function setStageOutcome(stageId: string, formData: FormData) {
  await requireUser();
  const outcome = str(formData, "outcome");
  await prisma.pipelineStage.update({
    where: { id: stageId },
    data: { isWon: outcome === "won", isLost: outcome === "lost" },
  });

  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  if (stage) {
    const status = stage.isWon ? "WON" : stage.isLost ? "LOST" : "OPEN";
    await prisma.deal.updateMany({ where: { stageId }, data: { status } });
  }

  revalidatePath("/deals");
}

export async function moveStage(stageId: string, direction: "up" | "down") {
  await requireUser();
  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  if (!stage) return;

  const neighbor = await prisma.pipelineStage.findFirst({
    where: {
      pipelineId: stage.pipelineId,
      sortOrder: direction === "up" ? { lt: stage.sortOrder } : { gt: stage.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.pipelineStage.update({ where: { id: stage.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.pipelineStage.update({ where: { id: neighbor.id }, data: { sortOrder: stage.sortOrder } }),
  ]);

  revalidatePath("/deals");
}

export async function deleteStage(stageId: string) {
  await requireUser();
  const dealCount = await prisma.deal.count({ where: { stageId } });
  if (dealCount > 0) {
    throw new Error("Bu aşamada fırsatlar var; önce onları başka bir aşamaya taşıyın.");
  }
  await prisma.pipelineStage.delete({ where: { id: stageId } });
  revalidatePath("/deals");
}
