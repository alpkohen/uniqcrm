"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { foldTitle } from "@/lib/title-groups";
import { findMailOptOutField, MAIL_OPTOUT_KEY, MAIL_OPTOUT_LABEL } from "@/lib/mail-optout";

export type MailOptOutRow = {
  firstName: string;
  lastName: string;
  emails: string[];
};

export type MailOptOutResult = {
  applied: boolean;
  total: number;
  matchedByEmail: number;
  matchedByName: number;
  alreadyMarked: number;
  willMark: number;
  ambiguous: string[];
  unmatched: string[];
  fieldWillBeCreated: boolean;
  fieldKey: string;
  marked: number;
};

function parseCustom(raw: string | null) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {} as Record<string, string>;
  }
}

export async function markMailOptOut(rows: MailOptOutRow[], options: { apply: boolean }): Promise<MailOptOutResult> {
  await requireUser();

  const existingField = await findMailOptOutField();
  const fieldKey = existingField?.key ?? MAIL_OPTOUT_KEY;

  const result: MailOptOutResult = {
    applied: options.apply,
    total: rows.length,
    matchedByEmail: 0,
    matchedByName: 0,
    alreadyMarked: 0,
    willMark: 0,
    ambiguous: [],
    unmatched: [],
    fieldWillBeCreated: !existingField,
    fieldKey,
    marked: 0,
  };

  const contacts = await prisma.contact.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, customData: true },
  });

  const byEmail = new Map<string, (typeof contacts)[number]>();
  const byName = new Map<string, (typeof contacts)[number][]>();
  for (const contact of contacts) {
    if (contact.email) byEmail.set(contact.email.trim().toLowerCase(), contact);
    const key = foldTitle(`${contact.firstName} ${contact.lastName}`);
    const list = byName.get(key);
    if (list) list.push(contact);
    else byName.set(key, [contact]);
  }

  const toMark = new Map<string, Record<string, string>>();

  for (const row of rows) {
    const label = `${row.firstName} ${row.lastName}`.trim() || row.emails[0] || "(isimsiz)";
    let target: (typeof contacts)[number] | undefined;

    for (const email of row.emails) {
      const hit = byEmail.get(email.trim().toLowerCase());
      if (hit) {
        target = hit;
        result.matchedByEmail += 1;
        break;
      }
    }

    if (!target) {
      const candidates = byName.get(foldTitle(`${row.firstName} ${row.lastName}`)) ?? [];
      if (candidates.length === 1) {
        target = candidates[0];
        result.matchedByName += 1;
      } else if (candidates.length > 1) {
        result.ambiguous.push(label);
        continue;
      } else {
        result.unmatched.push(label);
        continue;
      }
    }

    const data = parseCustom(target.customData);
    if (data[fieldKey] === "Evet") {
      result.alreadyMarked += 1;
      continue;
    }
    data[fieldKey] = "Evet";
    toMark.set(target.id, data);
  }

  result.willMark = toMark.size;
  if (!options.apply) return result;

  if (!existingField) {
    const max = await prisma.customField.aggregate({ _max: { sortOrder: true } });
    await prisma.customField.create({
      data: {
        key: MAIL_OPTOUT_KEY,
        label: MAIL_OPTOUT_LABEL,
        type: "BOOLEAN",
        options: "[]",
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
  }

  await prisma.$transaction(
    [...toMark.entries()].map(([id, data]) =>
      prisma.contact.update({ where: { id }, data: { customData: JSON.stringify(data) } }),
    ),
  );
  result.marked = toMark.size;

  revalidatePath("/contacts");
  revalidatePath("/settings");
  revalidatePath("/import");
  return result;
}
