"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { readEmails } from "@/lib/email-list";
import { fullName } from "@/lib/format";

export type DeleteByEmailPreview = {
  error?: string;
  totalEmails: number;
  matched: number;
  unmatched: number;
  unmatchedSample: string[];
  sample: { name: string; email: string; company: string }[];
  // Records that mention these contacts: notes/activities are deleted with them,
  // tasks, meetings, deals and workflow cards stay but lose the link to the person.
  impact: { activities: number; tasks: number; meetings: number; deals: number; cards: number };
};

export type DeleteByEmailDone = { error?: string; deleted: number };

type Target = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  city: string | null;
  customData: string;
  createdAt: Date;
  company: { name: string } | null;
  owner: { name: string };
  tags: { tag: { name: string } }[];
};

async function findTargets(formData: FormData): Promise<{ error?: string; emails: string[]; targets: Target[] }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Dosya seçilmedi.", emails: [], targets: [] };

  let emails: string[];
  try {
    emails = await readEmails(file);
  } catch {
    return { error: "Dosya okunamadı. .xlsx veya .csv olmalı.", emails: [], targets: [] };
  }
  if (emails.length === 0) return { error: "Dosyada e-posta sütunu / adresi bulunamadı.", emails: [], targets: [] };

  const wanted = new Set(emails);
  const contacts = await prisma.contact.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      title: true,
      city: true,
      customData: true,
      createdAt: true,
      company: { select: { name: true } },
      owner: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  // Exact address match only, so a typo in the list can never remove an unrelated person.
  const targets = contacts.filter((contact) => wanted.has(contact.email!.trim().toLowerCase()));
  return { emails, targets };
}

export async function previewDeleteByEmail(formData: FormData): Promise<DeleteByEmailPreview> {
  await requireAdmin();
  const empty: DeleteByEmailPreview = {
    totalEmails: 0,
    matched: 0,
    unmatched: 0,
    unmatchedSample: [],
    sample: [],
    impact: { activities: 0, tasks: 0, meetings: 0, deals: 0, cards: 0 },
  };

  const { error, emails, targets } = await findTargets(formData);
  if (error) return { ...empty, error };

  const ids = targets.map((t) => t.id);
  const [activities, tasks, meetings, deals, cards] = await Promise.all([
    prisma.activity.count({ where: { contactId: { in: ids } } }),
    prisma.task.count({ where: { contactId: { in: ids } } }),
    prisma.meeting.count({ where: { contactId: { in: ids } } }),
    prisma.deal.count({ where: { contactId: { in: ids } } }),
    prisma.workflowCard.count({ where: { contactId: { in: ids } } }),
  ]);

  const found = new Set(targets.map((t) => t.email!.trim().toLowerCase()));
  const missing = emails.filter((email) => !found.has(email));

  return {
    totalEmails: emails.length,
    matched: targets.length,
    unmatched: missing.length,
    unmatchedSample: missing.slice(0, 10),
    sample: targets.slice(0, 12).map((t) => ({
      name: fullName(t.firstName, t.lastName),
      email: t.email ?? "",
      company: t.company?.name ?? "",
    })),
    impact: { activities, tasks, meetings, deals, cards },
  };
}

// An Excel copy of exactly the records that would be deleted, so the removal can be undone by re-importing.
export async function backupDeleteByEmail(formData: FormData): Promise<{ error?: string; filename: string; base64: string }> {
  await requireAdmin();
  const { error, targets } = await findTargets(formData);
  if (error) return { error, filename: "", base64: "" };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Silinecek kişiler");
  sheet.columns = [
    "Ad", "Soyad", "Ünvan", "E-posta", "Telefon", "Şehir", "Firma", "Etiketler", "Sahip", "Eklenme", "Özel alanlar",
  ].map((header) => ({ header, key: header, width: 22 }));
  for (const t of targets) {
    sheet.addRow({
      Ad: t.firstName,
      Soyad: t.lastName,
      Ünvan: t.title ?? "",
      "E-posta": t.email ?? "",
      Telefon: t.phone ?? "",
      Şehir: t.city ?? "",
      Firma: t.company?.name ?? "",
      Etiketler: t.tags.map((x) => x.tag.name).join(", "),
      Sahip: t.owner.name,
      Eklenme: t.createdAt.toISOString().slice(0, 10),
      "Özel alanlar": t.customData,
    });
  }
  sheet.getRow(1).font = { bold: true };

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = new Date().toISOString().slice(0, 10);
  return { filename: `silinen-kisiler-yedek-${stamp}.xlsx`, base64: buffer.toString("base64") };
}

export async function deleteContactsByEmail(formData: FormData): Promise<DeleteByEmailDone> {
  await requireAdmin();

  const confirm = String(formData.get("confirm") ?? "").trim().toLocaleLowerCase("tr");
  const expected = Number(formData.get("expected"));
  if (confirm !== "sil") return { error: "Onay için SİL yazmalısınız.", deleted: 0 };
  if (formData.get("backup") !== "1") return { error: "Önce yedeği indirin.", deleted: 0 };

  const { error, targets } = await findTargets(formData);
  if (error) return { error, deleted: 0 };
  // The data may have changed since the preview; never delete a different number than the one approved.
  if (!Number.isInteger(expected) || targets.length !== expected) {
    return { error: `Önizlemedeki sayı (${expected}) ile şimdiki sayı (${targets.length}) farklı. Dosyayı yeniden yükleyin.`, deleted: 0 };
  }

  const ids = targets.map((t) => t.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const result = await prisma.contact.deleteMany({ where: { id: { in: ids.slice(i, i + 500) } } });
    deleted += result.count;
  }

  revalidatePath("/contacts");
  revalidatePath("/people");
  revalidatePath("/companies");
  revalidatePath("/");
  return { deleted };
}
