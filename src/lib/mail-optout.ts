import { prisma } from "@/lib/prisma";
import { foldTitle } from "@/lib/title-groups";

// "Mail almak istemiyor" is stored as a regular BOOLEAN custom field (value "Evet"),
// so it needs no schema change and shows up in the contact form like any other field.
export const MAIL_OPTOUT_KEY = "mail_almak_istemiyor";
export const MAIL_OPTOUT_LABEL = "Mail almak istemiyor";

const FOLDED_LABEL = foldTitle(MAIL_OPTOUT_LABEL);

// The field may already exist under another key (e.g. created in Ayarlar as "Mail Almak İstemiyor",
// which slugs to "mail_almak_i_stemiyor"), so find it by label or key prefix instead of assuming.
export async function findMailOptOutField() {
  const fields = await prisma.customField.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    fields.find((field) => field.key === MAIL_OPTOUT_KEY) ??
    fields.find((field) => foldTitle(field.label) === FOLDED_LABEL) ??
    fields.find((field) => field.key.startsWith("mail_almak")) ??
    null
  );
}

export async function getMailOptOutKey() {
  return (await findMailOptOutField())?.key ?? MAIL_OPTOUT_KEY;
}

// customData is stored as compact JSON (JSON.stringify), so this substring is exact.
export function mailOptOutJson(key: string) {
  return `"${key}":"Evet"`;
}

export function isMailOptOut(customData: string | null | undefined, key: string = MAIL_OPTOUT_KEY) {
  return Boolean(customData && customData.includes(mailOptOutJson(key)));
}
