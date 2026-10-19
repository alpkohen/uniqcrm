"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { listDistinctSectors } from "@/lib/sectors";
import { normalizeCompanyName } from "@/lib/company-name";

export type QuickCompanyInput = {
  name: string;
  sector: string;
  city?: string;
  website?: string;
  phone?: string;
};

export type QuickCompanyResult =
  | { ok: true; company: { id: string; name: string } }
  | { ok?: false; error: string; existing?: { id: string; name: string } };

export async function listSectorOptions(): Promise<string[]> {
  await requireUser();
  return listDistinctSectors();
}

// Creates a company from inside the contact form. Refuses names that already exist in another spelling
// (case, accents, "A.Ş."/"Ltd." endings) and hands back the existing company so the caller can use it instead.
export async function quickCreateCompany(input: QuickCompanyInput): Promise<QuickCompanyResult> {
  const user = await requireUser();
  const name = input.name.trim();
  const sector = input.sector.trim();
  const clean = (value?: string) => (value && value.trim() ? value.trim() : null);

  if (name.length < 2) return { error: "Firma adı gerekli." };
  if (!sector) return { error: "Sektör gerekli." };

  const key = normalizeCompanyName(name);
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const existing = companies.find((company) => normalizeCompanyName(company.name) === key);
  if (existing) {
    return { error: `Bu firma zaten kayıtlı: ${existing.name}`, existing };
  }

  const company = await prisma.company.create({
    data: {
      name,
      sector,
      city: clean(input.city),
      website: clean(input.website),
      phone: clean(input.phone),
      ownerId: user.id,
    },
    select: { id: true, name: true },
  });

  revalidatePath("/companies");
  return { ok: true, company };
}
