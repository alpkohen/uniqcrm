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

export type CompanyImportRow = {
  name?: string;
  website?: string;
  phone?: string;
  city?: string;
  sector?: string;
  notes?: string;
};

export async function importCompanies(rows: CompanyImportRow[]): Promise<ImportResult> {
  const user = await requireUser();
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const name = row.name?.trim();
    if (!name) {
      result.skipped += 1;
      result.errors.push(`${index + 1}. satır: firma adı eksik`);
      continue;
    }

    const existing = await prisma.company.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      result.skipped += 1;
      continue;
    }

    await prisma.company.create({
      data: {
        name,
        website: row.website?.trim() || null,
        phone: row.phone?.trim() || null,
        city: row.city?.trim() || null,
        sector: row.sector?.trim() || null,
        notes: row.notes?.trim() || null,
        ownerId: user.id,
      },
    });
    result.created += 1;
  }

  revalidatePath("/companies");
  revalidatePath("/import");
  return result;
}

export type DealImportRow = {
  title?: string;
  amount?: string;
  company?: string;
  contact?: string;
  stage?: string;
};

export async function importDeals(rows: DealImportRow[]): Promise<ImportResult> {
  const user = await requireUser();
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  const pipeline = await prisma.pipeline.findFirst({
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!pipeline || pipeline.stages.length === 0) {
    result.errors.push("Pipeline veya aşama bulunamadı.");
    return result;
  }

  for (const [index, row] of rows.entries()) {
    const title = row.title?.trim();
    if (!title) {
      result.skipped += 1;
      result.errors.push(`${index + 1}. satır: başlık eksik`);
      continue;
    }

    const amount = Number(row.amount?.replace(/[^\d.-]/g, "") || 0) || 0;

    let companyId: string | null = null;
    const companyName = row.company?.trim();
    if (companyName) {
      const company = await prisma.company.findFirst({
        where: { name: { equals: companyName, mode: "insensitive" } },
      });
      companyId = company?.id ?? null;
    }

    let contactId: string | null = null;
    const contactName = row.contact?.trim();
    if (contactName) {
      const [firstPart, ...rest] = contactName.split(/\s+/);
      const lastPart = rest.join(" ");
      const contact = await prisma.contact.findFirst({
        where: {
          firstName: { equals: firstPart, mode: "insensitive" },
          lastName: { equals: lastPart, mode: "insensitive" },
        },
      });
      contactId = contact?.id ?? null;
    }

    const stageName = row.stage?.trim().toLowerCase();
    const stage = stageName
      ? pipeline.stages.find((item) => item.name.toLowerCase() === stageName)
      : undefined;
    const resolvedStage = stage ?? pipeline.stages[0];
    const status = resolvedStage.isWon ? "WON" : resolvedStage.isLost ? "LOST" : "OPEN";

    await prisma.deal.create({
      data: {
        title,
        amount,
        pipelineId: pipeline.id,
        stageId: resolvedStage.id,
        status,
        companyId,
        contactId,
        ownerId: user.id,
      },
    });
    result.created += 1;
  }

  revalidatePath("/deals");
  revalidatePath("/import");
  return result;
}
