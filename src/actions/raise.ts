"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Marks or unmarks a company as a RAISE target (the list to share with the partner firm).
export async function setRaiseTarget(companyId: string, value: boolean) {
  await requireUser();
  await prisma.company.update({ where: { id: companyId }, data: { raiseTarget: value } });
  revalidatePath("/company-analysis");
}
