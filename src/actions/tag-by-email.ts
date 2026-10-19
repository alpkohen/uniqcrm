"use server";

import ExcelJS from "exceljs";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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

const EMAIL_HEADERS = ["email", "e-mail", "e-posta", "eposta", "mail", "work email"];

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result != null) return String(value.result);
    return "";
  }
  return String(value);
}

async function readEmails(file: File): Promise<string[]> {
  const rows: string[][] = [];
  const buffer = await file.arrayBuffer();

  if (/\.csv$/i.test(file.name)) {
    const parsed = Papa.parse<string[]>(new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, ""), {
      skipEmptyLines: true,
    });
    for (const row of parsed.data) rows.push(row.map((cell) => String(cell ?? "")));
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      for (let col = 1; col <= sheet.columnCount; col += 1) cells.push(cellText(row.getCell(col).value));
      rows.push(cells);
    });
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  let column = header.findIndex((cell) => EMAIL_HEADERS.includes(cell));
  let start = 1;
  if (column === -1) {
    // No recognisable header: use the first column that looks like an address.
    column = rows[0].findIndex((cell) => cell.includes("@"));
    if (column === -1) return [];
    start = 0;
  }

  const emails = new Set<string>();
  for (const row of rows.slice(start)) {
    const email = (row[column] ?? "").trim().toLowerCase();
    if (email.includes("@")) emails.add(email);
  }
  return [...emails];
}

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
