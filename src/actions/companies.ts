"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Firma adı gerekli.");

  const company = await prisma.company.create({
    data: {
      name,
      website: str(formData, "website"),
      phone: str(formData, "phone"),
      city: str(formData, "city"),
      sector: str(formData, "sector"),
      notes: str(formData, "notes"),
      ownerId: str(formData, "ownerId") ?? user.id,
    },
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(companyId: string, formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Firma adı gerekli.");

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      website: str(formData, "website"),
      phone: str(formData, "phone"),
      city: str(formData, "city"),
      sector: str(formData, "sector"),
      notes: str(formData, "notes"),
      ownerId: str(formData, "ownerId") ?? user.id,
    },
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompany(companyId: string) {
  await requireUser();
  await prisma.company.delete({ where: { id: companyId } });
  revalidatePath("/companies");
  redirect("/companies");
}
