"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type ImportRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  city?: string;
};

export type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

export async function importContacts(rows: ImportRow[]): Promise<ImportResult> {
  const user = await requireUser();
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();
    if (!firstName || !lastName) {
      result.skipped += 1;
      result.errors.push(`${index + 1}. satır: ad/soyad eksik`);
      continue;
    }

    const email = row.email?.trim().toLowerCase() || null;
    if (email) {
      const existing = await prisma.contact.findFirst({ where: { email } });
      if (existing) {
        result.skipped += 1;
        continue;
      }
    }

    let companyId: string | null = null;
    const companyName = row.company?.trim();
    if (companyName) {
      const existingCompany = await prisma.company.findFirst({
        where: { name: companyName },
      });
      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const created = await prisma.company.create({
          data: { name: companyName, ownerId: user.id },
        });
        companyId = created.id;
      }
    }

    await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone: row.phone?.trim() || null,
        title: row.title?.trim() || null,
        city: row.city?.trim() || null,
        companyId,
        ownerId: user.id,
      },
    });
    result.created += 1;
  }

  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/import");
  return result;
}
