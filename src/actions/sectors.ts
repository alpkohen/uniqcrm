"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import type { FormResult } from "@/lib/form-result";

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/companies");
  revalidatePath("/company-analysis");
}

// Renames a sector on every company that has it. Using the name of an existing sector merges the two.
export async function renameSector(oldName: string, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const to = String(formData.get("to") ?? "").trim();
  if (!to) return { error: "Yeni sektör adı gerekli." };
  if (to === oldName) return { error: "Yeni ad eskisiyle aynı." };

  await prisma.company.updateMany({ where: { sector: oldName }, data: { sector: to } });
  refresh();
  return { ok: true };
}

// Empties the sector of every company that has it (they then show up under "Sektörü eksik").
export async function clearSector(oldName: string): Promise<FormResult> {
  await requireAdmin();
  await prisma.company.updateMany({ where: { sector: oldName }, data: { sector: null } });
  refresh();
  return { ok: true };
}
