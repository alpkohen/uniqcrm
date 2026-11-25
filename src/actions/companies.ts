"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { FormResult } from "@/lib/form-result";
import { isKnownSector } from "@/lib/sectors";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Firma adı gerekli.");
  const sector = str(formData, "sector");
  if (!sector) throw new Error("Sektör gerekli.");
  if (!(await isKnownSector(sector))) throw new Error("Sektör listeden seçilmeli.");

  const existing = await prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Bu isimde bir firma zaten var: ${existing.name}`);
  }

  const company = await prisma.company.create({
    data: {
      name,
      website: str(formData, "website"),
      phone: str(formData, "phone"),
      city: str(formData, "city"),
      sector,
      notes: str(formData, "notes"),
      ownerId: str(formData, "ownerId") ?? user.id,
    },
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(companyId: string, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) return { error: "Firma adı gerekli." };
  const sector = str(formData, "sector");
  if (!sector) return { error: "Sektör gerekli." };
  const currentSector = (await prisma.company.findUnique({ where: { id: companyId }, select: { sector: true } }))?.sector;
  if (!(await isKnownSector(sector, currentSector))) return { error: "Sektör listeden seçilmeli." };

  const existing = await prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: { not: companyId } },
  });
  if (existing) {
    return { error: `Bu isimde bir firma zaten var: ${existing.name}` };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      website: str(formData, "website"),
      phone: str(formData, "phone"),
      city: str(formData, "city"),
      sector,
      notes: str(formData, "notes"),
      ownerId: str(formData, "ownerId") ?? user.id,
    },
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}

export async function deleteCompany(companyId: string) {
  await requireUser();
  await prisma.company.delete({ where: { id: companyId } });
  revalidatePath("/companies");
  redirect("/companies");
}

// Changes a company's owner straight from the Firmalar list.
export async function setCompanyOwner(companyId: string, ownerId: string) {
  await requireUser();
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) throw new Error("Kullanıcı bulunamadı.");
  await prisma.company.update({ where: { id: companyId }, data: { ownerId } });
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}
