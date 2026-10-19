"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { readEmails } from "@/lib/email-list";

export type TagByEmailResult = {
  error?: string;
  applied: boolean;
  tagName: string;
  tagExists: boolean;
  totalEmails: number;
  matchedContacts: number;
  alreadyTagged: number;
  willTag: number;
  tagged: number;
  unmatched: number;
  unmatchedSample: string[];
};

export async function tagContactsByEmail(formData: FormData): Promise<TagByEmailResult> {
  await requireUser();

  const tagName = String(formData.get("tag") ?? "").trim();
  const apply = formData.get("apply") === "1";
  const file = formData.get("file");

  const empty: TagByEmailResult = {
    applied: apply,
    tagName,
    tagExists: false,
    totalEmails: 0,
    matchedContacts: 0,
    alreadyTagged: 0,
    willTag: 0,
    tagged: 0,
    unmatched: 0,
    unmatchedSample: [],
  };

  if (!tagName) return { ...empty, error: "Etiket adı gerekli." };
  if (!(file instanceof File) || file.size === 0) return { ...empty, error: "Dosya seçilmedi." };

  let emails: string[];
  try {
    emails = await readEmails(file);
  } catch {
    return { ...empty, error: "Dosya okunamadı. .xlsx veya .csv olmalı." };
  }
  if (emails.length === 0) return { ...empty, error: "Dosyada e-posta sütunu / adresi bulunamadı." };

  const existingTag = await prisma.tag.findFirst({ where: { name: { equals: tagName, mode: "insensitive" } } });

  const contacts = await prisma.contact.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });
  const byEmail = new Map<string, string[]>();
  for (const contact of contacts) {
    const key = contact.email!.trim().toLowerCase();
    const list = byEmail.get(key);
    if (list) list.push(contact.id);
    else byEmail.set(key, [contact.id]);
  }

  const matchedIds = new Set<string>();
  const unmatched: string[] = [];
  for (const email of emails) {
    const ids = byEmail.get(email);
    if (ids) ids.forEach((id) => matchedIds.add(id));
    else unmatched.push(email);
  }

  const tagged = existingTag
    ? new Set(
        (
          await prisma.contactTag.findMany({
            where: { tagId: existingTag.id, contactId: { in: [...matchedIds] } },
            select: { contactId: true },
          })
        ).map((row) => row.contactId),
      )
    : new Set<string>();
  const toTag = [...matchedIds].filter((id) => !tagged.has(id));

  const result: TagByEmailResult = {
    applied: apply,
    tagName: existingTag?.name ?? tagName,
    tagExists: Boolean(existingTag),
    totalEmails: emails.length,
    matchedContacts: matchedIds.size,
    alreadyTagged: tagged.size,
    willTag: toTag.length,
    tagged: 0,
    unmatched: unmatched.length,
    unmatchedSample: unmatched.slice(0, 15),
  };
  if (!apply) return result;

  const tag = existingTag ?? (await prisma.tag.create({ data: { name: tagName, color: "#b91c1c" } }));
  const chunk = 1000;
  for (let i = 0; i < toTag.length; i += chunk) {
    await prisma.contactTag.createMany({
      data: toTag.slice(i, i + chunk).map((contactId) => ({ contactId, tagId: tag.id })),
      skipDuplicates: true,
    });
  }
  result.tagged = toTag.length;

  revalidatePath("/contacts");
  revalidatePath("/settings");
  revalidatePath("/people");
  return result;
}
